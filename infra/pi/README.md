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

## Hardware

- **Testserver.** Raspberry Pi 5, eingesetzt mit 4 GB RAM (zwei Zellen à 1,5 GiB Budget gleichzeitig plus Redis, Nginx und Betriebssystem, mit 8 GB wären 2 GiB je Zelle möglich), aktiver Kühler (offizieller Active Cooler oder Lüftergehäuse), offizielles 27-W-Netzteil, SSD statt SD-Karte (z. B. M.2 HAT+ mit NVMe-SSD oder USB-3-SSD). SD-Karten verschleißen bei wochenlangem Schreiben.
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

   Das Skript führt die unten beschriebenen Einzelschritte aus, überspringt bereits erledigte und sichert geänderte Systemdateien (`<datei>.bak-<zeitstempel>`). Am Ende steht eine Zusammenfassung mit den Kategorien „ok", „geändert" und „offen". Exit-Code 2 bedeutet, dass ein Neustart nötig ist (memory-cgroup). In diesem Fall `sudo reboot` und das Skript erneut ausführen, bis es mit Exit-Code 0 endet. Nach der Aufnahme in die Gruppe `docker` ist eine erneute Anmeldung nötig.

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
| stress-ng prüfen | Voraussetzung des Belastungstests | `sudo apt install stress-ng` |

Docker installiert das Skript bewusst nicht selbst, damit die Installation der offiziellen Anleitung folgt und deren Version nachvollziehbar bleibt.

## Einrichtung des Lastgenerators

1. Docker und Node.js (Version 22 oder neuer, Tests und Kampagnenplanung mit 22 und 24 geprüft) installieren, Repository auf denselben Commit auschecken. Node.js läuft nur auf dem Lastgenerator für den Orchestrator. Die Prototypen haben ihre eigene Version im Container.
2. Schlüsselbasierten ssh-Zugang zum Pi einrichten (`ssh-copy-id pi@<adresse>`). Der Orchestrator verwendet `BatchMode`, eine Passwortabfrage ist nicht möglich.
3. `prototypes/php-laravel/.env` ebenfalls bereitstellen. Sie wird für den Reverb-App-Key (k6) und für die Laravel-Ereignisquelle (`laravel-producer`) gebraucht und muss mit der Datei auf dem Pi übereinstimmen.
4. Images für k6, die Ereignisquellen und den Sampler bauen (`laravel-producer` nutzt das Laravel-Image):

   ```bash
   docker compose --profile load --profile tools --profile php-laravel build k6 event-simulator resource-sampler php-laravel-fpm
   ```

5. Automatische Updates wie auf dem Pi abschalten.

## Kampagnen starten

Den Block `sut` in eine eigene Datei schreiben, z. B. `sut.pi.json`:

```json
{
  "ssh": "pi@192.168.0.50",
  "repoDir": "/home/pi/eda-notification-thesis",
  "pi": true,
  "targetBaseUrl": "http://192.168.0.50:8080",
  "redisHost": "192.168.0.50"
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

Vergleich 10 enthält die beiden Laravel-SSE-Zellen mit dem höchsten Speicherbedarf. Ihre Spitze in der Stress-Stufe muss deutlich unter dem Limit von 1,5 GiB bleiben (DECISIONS.md 5.10). Danach die erste Lauf-Datei prüfen. `resources.containers.*.cgroup` enthält den Slice-Namen, `context.sut_host.model` nennt das Pi-Modell, `loadgen.host.cpu` enthält Werte des Lastgenerators.

Dann die Kampagnen einer Phase erzeugen und den Zeitplan starten (Reihenfolge der Phasen in DECISIONS.md 5.9):

```bash
node tools/orchestrate/plan-campaigns.js pilot --runs baseline=100,medium=60,stress=40 --comparisons 1,4,7,10 --sut sut.pi.json --out campaigns/pilot
node tools/orchestrate/plan-campaigns.js main --block 1 --runs baseline=80,medium=60,stress=40 --sut sut.pi.json --out campaigns/block1
node tools/orchestrate/schedule.js campaigns/block1/schedule.json
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

Am 2026-10-22 auf dem eingesetzten Pi 5 erprobt (DECISIONS.md 5.14). `setup.sh` lief nach einem Neustart mit Exit-Code 0, alle Images ließen sich bauen, und `sampler.js info` lieferte die erwarteten Werte. Dabei zeigte sich, dass der Pi 5 den Drosselstatus nicht in sysfs bereitstellt. Er wird seitdem per `vcgencmd` auf dem Pi gelesen. Der Belastungstest über 24 Stunden ist bestanden, ohne Drosselung und mit höchstens 67,2 °C (DECISIONS.md 5.14). Noch nicht erprobt sind der Zwei-Rechner-Aufbau (ssh-Steuerung, veröffentlichte Ports, cgroup-Slices im Lauf, Auslastung des Lastgenerators) und die direkte Abfrage des Pi durch `status.js`. Der Probelauf (Abschnitt „Kampagnen starten") ist daher vor dem Pilot verbindlich.
