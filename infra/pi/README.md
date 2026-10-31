# Raspberry-Pi-Testserver

Einrichtung des Messaufbaus für die Messungen der Arbeit (DECISIONS.md 5.14).

## Aufbau

| Rolle | Gerät | Dienste |
|---|---|---|
| SUT-Seite (Testserver) | Raspberry Pi | Redis, Front-Nginx, die Container der jeweils gemessenen Zellen, `resource-sampler` |
| Lastgenerator | zweiter Rechner (Linux empfohlen) | Orchestrator (`tools/orchestrate`), k6, Ereignisquellen (`event-simulator`, `event-simulator-bullmq`, `laravel-producer`), `resource-sampler` für die eigene Auslastung |

Beide Geräte sind per Kabel im selben, nach Möglichkeit isolierten Netz verbunden.

**Begründung der Trennung.** Der Pi hat vier Kerne, das Budget einer Zelle beträgt zwei. Liefen k6 (bei 500 und mehr Clients selbst rechenintensiv), Ereignisquellen und Orchestrator auf demselben Gerät, könnte das Lastwerkzeug zum Engpass werden. Gemessen würde dann dessen Grenze statt der des Systems. Die Auslastung des Lastgenerators wird in jedem Lauf gemessen. Liegt sie im Mittel über 80 %, ist der Lauf ungültig.

Eine Uhrensynchronisation zwischen den Geräten ist nicht erforderlich. Der Sendezeitstempel (Ereignisquelle) und der Empfangszeitpunkt (k6) stammen beide vom Lastgenerator. Die Netzwerkstrecke ist in jeder gemessenen Latenz enthalten, für alle Zellen gleich und verzerrt den Vergleich daher nicht.

Die Uhr des Pi selbst geht nach einer Trennung vom Strom falsch. Der Pi hat keine Batterie für die Uhr und im Messnetz kein Internet, über das er sie stellen könnte. Die Messwerte betrifft das nicht, wohl aber die Zeitangaben im Systemprotokoll und bei den Containern des Pi. Nach jeder Trennung vom Strom wird die Uhr deshalb vom Lastgenerator aus gestellt. Der Pi fragt dabei nach dem Passwort von `pi`:

```bash
ssh -t pi@192.168.50.10 "sudo date -u -s @$(date +%s)"
```

## Hardware

- **Testserver.** Raspberry Pi 5, eingesetzt mit 4 GB RAM (zwei Zellen à 1,5 GiB Budget gleichzeitig plus Redis, Nginx und Betriebssystem). Das reicht für alle Zellen bei 500 Clients, weil sich die Clients verteilt verbinden (DECISIONS.md 5.10), aktiver Kühler (offizieller Active Cooler oder Lüftergehäuse), offizielles 27-W-Netzteil, SSD statt SD-Karte (z. B. M.2 HAT+ mit NVMe-SSD oder USB-3-SSD). SD-Karten verschleißen bei wochenlangem Schreiben.
- **Lastgenerator.** Linux-Rechner mit mindestens vier Kernen und 8 GB RAM, z. B. ein Mini-PC. Ein zweiter Pi 5 kann bei 1 000 Clients selbst zum Engpass werden. Ein Windows-Rechner mit Docker Desktop ist möglich, bringt durch die zusätzliche Virtualisierungsschicht aber mehr Schwankung.
- **Netz.** Gigabit-Switch oder direkte Verbindung, Cat-6-Kabel, kein WLAN für den Messverkehr. Für die Messung hängen nur Pi und Lastgenerator am Switch, beide mit fester Adresse. Der Lastgenerator darf für Benachrichtigungen zusätzlich im WLAN sein.
- **Optional.** Eine kleine USV. Ein Stromausfall kostet sonst bis zu eine Laststufe.

## Einrichtung des Pi

1. **Betriebssystem.** Raspberry Pi OS Lite (64 Bit) mit dem Raspberry Pi Imager auf SSD oder USB-Festplatte schreiben (Hostname `eda-pi`, Benutzer `pi`, ssh aktiviert, kein WLAN). Ohne SD-Karte startet der Pi 5 vom USB-Datenträger. Das setzt das offizielle 5-A-Netzteil voraus. Die tatsächlich eingesetzten Geräte nennt DECISIONS.md 5.14.

2. **Docker** nach der offiziellen Anleitung für Debian installieren (docs.docker.com, „Install Docker Engine on Debian"), einschließlich Compose-Plugin.

3. **Repository** klonen und auf denselben Commit wie auf dem Lastgenerator auschecken. Der Orchestrator bricht ab, wenn die Stände abweichen.

4. **Schlüsseldatei** `prototypes/php-laravel/.env` vom Entwicklungsrechner kopieren (z. B. per `scp`). Die Datei enthält Schlüssel und ist nicht im Repository.

5. **Einrichtungsskript** im Repository ausführen:

   ```bash
   sudo bash infra/pi/setup.sh
   ```

   Das Skript führt die unten beschriebenen Einzelschritte aus, überspringt bereits erledigte und sichert geänderte Systemdateien (`<datei>.bak-<zeitstempel>`). Am Ende steht eine Zusammenfassung mit den Kategorien „ok", „geändert" und „offen". Exit-Code 2 bedeutet, dass ein Neustart nötig ist (memory-cgroup oder Kernel mit 4-KB-Seiten). In diesem Fall `sudo reboot` und das Skript erneut ausführen, bis es mit Exit-Code 0 endet. Nach der Aufnahme in die Gruppe `docker` ist eine erneute Anmeldung nötig.

6. **Limits** `SUT_CPU_LIMIT=2` und `SUT_MEM_LIMIT=1536m` in `.env` prüfen (Endwerte für 4 GB, DECISIONS.md 5.10). `setup-slices.sh` bricht ab, wenn zwei Zellen plus Reserve nicht in den Arbeitsspeicher passen. Nach jeder Änderung `sudo bash infra/pi/setup-slices.sh` ausführen, damit die cgroup-Töpfe dieselben Werte erhalten.

7. **Images bauen:**

   ```bash
   docker compose --profile node-minimal --profile node-express --profile node-express-queue --profile php-minimal --profile php-laravel --profile php-laravel-queue --profile tools build
   ```

8. **Kontrolle:**

   ```bash
   docker compose --profile tools up -d resource-sampler
   docker compose --profile tools exec resource-sampler node sampler.js info
   ```

   Erwartet werden `"memory_controller":true`, `"cpu_governor":"performance"`, `"swap_total_bytes":0` und das Modell des Pi. `docker_disk_free_bytes` zeigt den freien Platz des Datenträgers, auf dem Docker liegt. Auf dem Pi 5 steht `"throttled":null`, weil die Firmware den Drosselstatus dort nicht in sysfs bereitstellt. Der Orchestrator liest ihn in diesem Fall per ssh mit `vcgencmd` auf dem Pi. Die Kontrolle dafür ist `vcgencmd get_throttled` mit der Ausgabe `throttled=0x0`.

9. **Belastungstest (24 h)** vor dem Pilot. Er zeigt, dass Kühlung und Netzteil Dauerlast ohne Drosselung tragen.

   ```bash
   sudo apt install stress-ng
   bash infra/pi/burn-in.sh 24
   ```

   Das Skript protokolliert jede Minute Temperatur, Takt und Drosselstatus nach `results/<zeitstempel>_burn-in.csv` und meldet am Ende Höchsttemperatur und ob eine Drosselung aufgetreten ist. Tritt eine Drosselung auf, ist die Kühlung zu verbessern, bevor gemessen wird. Damit der Test eine getrennte ssh-Verbindung übersteht, läuft er in `tmux` (`sudo apt install tmux`, dann `tmux new -s burnin 'bash infra/pi/burn-in.sh 24; bash'`). Während des Tests laufen auf dem Pi keine Messcontainer.

10. **Test unter Schreiblast,** nötig bei einem Datenträger, der seinen Strom über USB vom Pi bezieht. 30 Minuten volle CPU-Last mit gleichzeitigem Schreiben auf den Datenträger, danach Drosselstatus und Kernel-Meldungen zu Unterspannung und USB:

    ```bash
    mkdir -p ~/io-test && cd ~/io-test && stress-ng --cpu 4 --hdd 2 --timeout 30m --metrics-brief; vcgencmd get_throttled; journalctl -k --no-pager | grep -i -E "under-voltage|undervoltage|i/o error|usb.*disconnect|reset high-speed" | tail -10; cd ~ && rm -rf ~/io-test
    ```

    Erwartet werden `failed: 0`, `throttled=0x0` und keine Zeile aus dem Kernel-Protokoll (Ergebnis vom 2026-10-29 in DECISIONS.md 5.14).

11. **Feste Adresse im Messnetz,** erst wenn alle Images gebaut sind, weil der Pi im Messnetz kein Internet hat. Ausgeführt vom Lastgenerator, solange beide noch am Router hängen. Das Profil wird drei Sekunden verzögert eingeschaltet, damit die ssh-Verbindung vorher sauber endet. Danach ist der Pi nur noch unter 192.168.50.10 erreichbar, auch nach einem Neustart:

    ```bash
    ssh -t pi@<bisherige-adresse> 'sudo nmcli con add type ethernet ifname eth0 con-name messnetz ipv4.method manual ipv4.addresses 192.168.50.10/24 ipv4.never-default yes ipv6.method disabled connection.autoconnect yes connection.autoconnect-priority 10 && sudo systemd-run --on-active=3 nmcli con up messnetz'
    ```

    Danach das Kabel vom Router an den Lastgenerator umstecken und einmal `ssh pi@192.168.50.10` aufrufen, um den Schlüssel des Pi zu bestätigen. Der Orchestrator kann diese Rückfrage später nicht beantworten.

### Was setup.sh einrichtet

| Schritt | Zweck | Manuelle Entsprechung |
|---|---|---|
| Architektur prüfen | 64-Bit-System erforderlich | `uname -m` liefert `aarch64` |
| automatische Updates abschalten | Docker und Kernel dürfen sich in der Messphase nicht ändern | `systemctl disable --now unattended-upgrades apt-daily.timer apt-daily-upgrade.timer` |
| Swap abschalten | ausgelagerter Speicher verzerrt Latenz- und Speichermessung | `dphys-swapfile` bzw. `zramswap` abschalten, systemd-Swap-Units (z. B. zram) maskieren, `swapoff -a`. `swapon --show` liefert danach keine Ausgabe |
| CPU-Governor `performance` | feste Taktfrequenz statt lastabhängiger Anpassung | `cpu-performance.service` nach `/etc/systemd/system/` kopieren und aktivieren |
| memory-cgroup aktivieren | ohne den memory-Controller ignoriert Docker alle Speicherlimits | `cgroup_enable=memory cgroup_memory=1` an die bestehende Zeile in `/boot/firmware/cmdline.txt` anhängen, Neustart |
| Docker prüfen | Docker und Compose-Plugin vorhanden, Benutzer in der Gruppe `docker` (Orchestrator ohne `sudo`) | `usermod -aG docker <benutzer>` |
| `.env` anlegen | `COMPOSE_FILE=docker-compose.yml:docker-compose.pi.yml` lädt die Pi-Ergänzung bei jedem `docker compose`-Aufruf | `.env.example` kopieren, Zeile einkommentieren |
| Schlüsseldatei prüfen | `APP_KEY` und `REVERB_APP_KEY` gesetzt. Werte werden nicht ausgegeben | — |
| cgroup-Töpfe anlegen | gemeinsames Budget je Zelle (DECISIONS.md 5.6.2) | `sudo bash infra/pi/setup-slices.sh` |
| Systemprotokoll dauerhaft speichern | Raspberry Pi OS hält es sonst nur im Arbeitsspeicher, nach einem Absturz wäre die Ursache verloren | Datei `/etc/systemd/journald.conf.d/50-persistent.conf` mit `[Journal]` und `Storage=persistent`, dann `systemctl restart systemd-journald` |
| Kernel mit 4-KB-Seiten | übliche Seitengröße von Servern statt der 16-KB-Seiten des Pi 5 (DECISIONS.md 5.10, 5.20) | `kernel=kernel8.img` im Abschnitt `[all]` von `/boot/firmware/config.txt`, Neustart. `getconf PAGESIZE` liefert danach 4096 |
| stress-ng prüfen | Voraussetzung des Belastungstests | `sudo apt install stress-ng` |

Docker installiert das Skript bewusst nicht selbst, damit die Installation der offiziellen Anleitung folgt und deren Version nachvollziehbar bleibt.

## Einrichtung des Lastgenerators

1. Docker und Node.js (Version 22 oder neuer, Tests und Kampagnenplanung mit 22 und 24 geprüft) installieren, Repository auf denselben Commit auschecken. Node.js läuft nur auf dem Lastgenerator für den Orchestrator. Die Prototypen haben ihre eigene Version im Container. Für Debian Testing bietet Docker keine eigene Paketquelle an, dort wird die Quelle für Debian 13 (`trixie`) eingetragen. Der eigene Benutzer kommt in die Gruppe `docker`, damit der Orchestrator ohne `sudo` läuft.
2. Schlüsselbasierten ssh-Zugang zum Pi einrichten (`ssh-copy-id pi@<adresse>`). Der Orchestrator verwendet `BatchMode`, eine Passwortabfrage ist nicht möglich.
3. `prototypes/php-laravel/.env` ebenfalls bereitstellen. Sie wird für den Reverb-App-Key (k6) und für die Laravel-Ereignisquelle (`laravel-producer`) gebraucht und muss mit der Datei auf dem Pi übereinstimmen.
4. Images für k6, die Ereignisquellen und den Sampler bauen (`laravel-producer` nutzt das Laravel-Image):

   ```bash
   docker compose --profile load --profile tools --profile php-laravel build k6 event-simulator resource-sampler php-laravel-fpm
   ```

5. Automatische Updates wie auf dem Pi abschalten und die Docker-Pakete festhalten, damit sich ihre Version in der Messphase nicht ändert:

   ```bash
   sudo systemctl disable --now apt-daily.timer apt-daily-upgrade.timer
   sudo apt-mark hold docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
   ```

6. Bei einem Laptop den Ruhezustand abschalten, auch bei zugeklapptem Deckel. Dazu `sleep.target`, `suspend.target`, `hibernate.target` und `hybrid-sleep.target` maskieren (`systemctl mask`) und in einer Datei unter `/etc/systemd/logind.conf.d/` im Abschnitt `[Login]` die Einstellungen `HandleLidSwitch`, `HandleLidSwitchExternalPower` und `HandleLidSwitchDocked` auf `ignore` setzen.

7. Feste Adresse im Messnetz am LAN-Anschluss. Das Profil setzt keine Standardroute, das Internet für die Benachrichtigungen bleibt so beim WLAN:

   ```bash
   sudo nmcli con add type ethernet ifname <anschluss> con-name messnetz ipv4.method manual ipv4.addresses 192.168.50.20/24 ipv4.never-default yes ipv6.method disabled connection.autoconnect-priority 10
   ```

8. `sudo loginctl enable-linger <benutzer>`, damit ein systemd-User-Dienst für den Zeitplan auch nach dem Abmelden weiterläuft. `tmux` und `cron` installieren, falls sie fehlen.

## Kampagnen starten

Den Block `sut` in eine eigene Datei schreiben, z. B. `sut.pi.json`:

```json
{
  "ssh": "pi@192.168.50.10",
  "repoDir": "/home/pi/eda-notification-thesis",
  "pi": true,
  "targetBaseUrl": "http://192.168.50.10:8080",
  "redisHost": "192.168.50.10"
}
```

| Feld | Bedeutung |
|---|---|
| `ssh` | ssh-Ziel des Pi |
| `repoDir` | Pfad des Repositorys auf dem Pi |
| `pi` | `true` schaltet die strengen Prüfungen ein (siehe unten) |
| `targetBaseUrl` | Front-Nginx des Pi aus Sicht von k6 |
| `redisHost` | Redis des Pi aus Sicht der Ereignisquellen |

**Probelauf** vor dem Pilot, mit eigenem Namensraum, damit die echten Kampagnen später nicht als erledigt gelten (tools/orchestrate/README.md, Abschnitt zu Probeläufen):

```bash
node tools/orchestrate/plan-campaigns.js main --block 1 --runs baseline=3,medium=3,stress=3 --hold 10 --warmup 1 --comparisons 1,4,10 --prefix smoke- --sut sut.pi.json --out campaigns/smoke
node tools/orchestrate/schedule.js campaigns/smoke/schedule.json
node tools/orchestrate/status.js --schedule campaigns/smoke/schedule.json --sut sut.pi.json --hours 2
```

Vergleich 10 enthält die beiden Laravel-SSE-Zellen mit dem höchsten Speicherbedarf. Ihre Spitze in der Stress-Stufe muss deutlich unter dem Limit bleiben. Mit verteiltem Verbindungsaufbau lag sie im vollständigen Probelauf vom 2026-10-29 bei 1 066 und 1 097 MiB (DECISIONS.md 5.14). Die exakte Spitze laut Kernel steht in jedem Lauf-Protokoll unter `measures.mem_peak_kernel_bytes`. Der Wert des Topfes unter `/sys/fs/cgroup` gilt dagegen seit dessen Entstehung und umfasst frühere Läufe. Danach die erste Lauf-Datei prüfen. `resources.containers.*.cgroup` enthält den Slice-Namen, `context.sut_host.model` nennt das Pi-Modell, `loadgen.host.cpu` enthält Werte des Lastgenerators.

**Grundlast von Redis** vor Block 1, während keine Kampagne läuft (DECISIONS.md 5.18). Das Skript misst die CPU-Zeit des Redis-Containers und trennt sie in den Prozess `redis-server` und die übrigen Prozesse im Container, etwa den Healthcheck. Das Ergebnis steht danach in `results/<zeitstempel>_redis-idle.json`:

```bash
ssh pi@192.168.50.10 'cd eda-notification-thesis && bash infra/pi/redis-idle.sh 60'
```

Dann die Kampagnen einer Phase erzeugen und den Zeitplan starten (Reihenfolge der Phasen in DECISIONS.md 5.9):

```bash
node tools/orchestrate/plan-campaigns.js pilot --runs baseline=100,medium=60,stress=40 --comparisons 1,4,7,10 --sut sut.pi.json --out campaigns/pilot
node tools/orchestrate/plan-campaigns.js main --block 1 --runs baseline=90,medium=90,stress=90 --sut sut.pi.json --out campaigns/block1
node tools/orchestrate/schedule.js campaigns/block1/schedule.json
```

Alle Phasen verteilen den Verbindungsaufbau standardmäßig über 5 s (`--connect-spread`), und jede Kampagne beginnt mit einem Vorlauf mit 550 Clients (DECISIONS.md 5.9). Der Ansturm startet die Zelle dagegen vor jedem Lauf neu und verbindet dann alle Clients gleichzeitig. Er läuft unter Aufsicht und nicht im unbeaufsichtigten Zeitplan, weil ein Speicherengpass den Pi kurzzeitig blockieren kann. Am 2026-10-29 ist er mit dem Präfix `restart-` gemessen (DECISIONS.md 5.14). Eine Wiederholung braucht ein neues Präfix, sonst gelten die Kampagnen als erledigt:

```bash
node tools/orchestrate/plan-campaigns.js storm --clients 500 --runs 3 --hold 20 --sut sut.pi.json --prefix <praefix>- --out campaigns/<praefix>-storm
node tools/orchestrate/schedule.js campaigns/<praefix>-storm/schedule.json
```

Für den mehrwöchigen Betrieb empfiehlt sich `tmux` oder ein systemd-User-Dienst auf dem Lastgenerator (README.md im Wurzelverzeichnis, Abschnitt zu langen Messkampagnen). Ein erneuter Start des Zeitplans setzt an der nächsten unvollständigen Kampagne fort.

## Überwachung im Dauerbetrieb

`tools/orchestrate/status.js` fasst den Zustand zusammen, also Fortschritt des Zeitplans, laufende Kampagne, ungültige Läufe und ihre Gründe, Höchsttemperatur, Auslastung des Lastgenerators, Verlauf der Kontrollmessung und freien Speicherplatz auf beiden Geräten. Mit `--sut` fragt es den Pi zusätzlich direkt ab (Temperatur, Drosselstatus, Governor, Docker-Datenträger).

```bash
node tools/orchestrate/status.js --schedule campaigns/block1/schedule.json --sut sut.pi.json
```

Für unbeaufsichtigte Phasen empfiehlt sich die Benachrichtigung über `NOTIFY_URL` (z. B. ein ntfy-Thema mit schwer zu erratendem Namen). `schedule.js` meldet abgebrochene Kampagnen und das Ende des Zeitplans, ein stündlicher cron-Job mit `status.js --notify` meldet Warnungen wie fehlende Aktivität, Drosselung, hohe Temperatur oder knappen Speicherplatz. Einrichtung und Schwellenwerte beschreibt tools/orchestrate/README.md im Abschnitt zu Überwachung und Benachrichtigung.

## Automatische Prüfungen

Mit `"pi": true` bricht der Orchestrator vor Beginn ab, wenn eine der folgenden Bedingungen nicht erfüllt ist:

- memory-cgroup-Controller vorhanden
- CPU-Governor `performance`
- kein Swap
- Drosselstatus lesbar und keine aktuelle Drosselung (`vcgencmd get_throttled`)
- Code-Stand auf beiden Geräten identisch
- Container jeder Zelle liegen im zugehörigen Slice `eda_<zelle>.slice`
- alle Zellen im Produktionsbetrieb (Pilot, Hauptmessung, Kontrollmessung)

Pro Lauf werden Temperatur (Beginn, Ende, Maximum), Drosselstatus und die Auslastung des Lastgenerators protokolliert. Ein Lauf, in dem die Firmware Unterspannung, Taktbegrenzung oder thermische Drosselung meldet, gilt als ungültig (`host_throttled`), ebenso ein Lauf ohne lesbaren Drosselstatus (`host_throttle_unknown`) und ein Lauf mit einer mittleren Auslastung des Lastgenerators über 80 % (`loadgen_saturated`). Den Drosselstatus liest der Orchestrator auf dem Pi 5 per ssh mit `vcgencmd get_throttled` direkt vor und nach der Messung, weil der Sampler im Container ihn dort nicht sieht (DECISIONS.md 5.14).

## Stand

Am 2026-10-22 auf dem eingesetzten Pi 5 erprobt (DECISIONS.md 5.14). `setup.sh` lief nach einem Neustart mit Exit-Code 0, alle Images ließen sich bauen, und `sampler.js info` lieferte die erwarteten Werte. Dabei zeigte sich, dass der Pi 5 den Drosselstatus nicht in sysfs bereitstellt. Er wird seitdem per `vcgencmd` auf dem Pi gelesen. Der Belastungstest über 24 Stunden ist bestanden, ohne Drosselung und mit höchstens 67,2 °C (DECISIONS.md 5.14). Am 2026-10-27 lief der Zwei-Rechner-Aufbau im Probelauf. ssh-Steuerung, veröffentlichte Ports, cgroup-Töpfe, Drosselprüfung, Auslastung des Lastgenerators und die Abfrage des Pi durch `status.js` funktionieren. Mit gleichzeitigem Verbindungsaufbau scheiterte Laravel/SSE bei 500 Clients am Speicherbudget von 1,5 GiB. Mit verteiltem Aufbau liefen beide Laravel-Zellen fehlerfrei, und der Pi hatte immer mindestens 1,4 GB frei (DECISIONS.md 5.10). Am 2026-10-29 folgten der vollständige Probelauf ohne ungültigen Messlauf, der Test der Festplatte unter Last und der Ansturm. Der Pilot lief vom 2026-10-29 bis zum 2026-10-31. Am 2026-10-31 wurden die Images von node-express und php-laravel ohne Internet auf dem Pi neu gebaut (alle aufwendigen Schritte kamen aus dem Cache), die Grundlast von Redis mit `redis-idle.sh` gemessen und Vergleich 11 mit dem Präfix `check-` geprüft (DECISIONS.md 5.14).
