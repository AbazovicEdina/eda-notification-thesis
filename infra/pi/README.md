# Raspberry-Pi-Testserver

Einrichtung des Messaufbaus für die Messungen der Arbeit (DECISIONS.md 5.14).

## Aufbau

| Rolle | Gerät | Dienste |
|---|---|---|
| SUT-Seite (Testserver) | Raspberry Pi | Redis, Front-Nginx, die Container der jeweils gemessenen Zellen, `resource-sampler` |
| Lastgenerator | zweiter Rechner (Linux empfohlen) | Orchestrator (`tools/orchestrate`), k6, Ereignisquellen (`event-simulator`, `event-simulator-bullmq`, `laravel-producer`), `resource-sampler` für die eigene Auslastung |

Beide Geräte sind per Kabel im selben, nach Möglichkeit isolierten Netz verbunden.

Begründung der Trennung: Der Pi hat vier Kerne, das Budget einer Zelle beträgt zwei. Liefen k6 (bei 500 und mehr Clients selbst rechenintensiv), Ereignisquellen und Orchestrator auf demselben Gerät, könnte das Lastwerkzeug zum Engpass werden; gemessen würde dann dessen Grenze statt der des Systems. Die Auslastung des Lastgenerators wird in jedem Lauf gemessen; liegt sie im Mittel über 80 %, ist der Lauf ungültig.

Eine Uhrensynchronisation zwischen den Geräten ist nicht erforderlich: Der Sendezeitstempel (Ereignisquelle) und der Empfangszeitpunkt (k6) stammen beide vom Lastgenerator. Die Netzwerkstrecke ist in jeder gemessenen Latenz enthalten, für alle Zellen gleich und verzerrt den Vergleich daher nicht.

## Hardware

- **Testserver:** Raspberry Pi 5 mit 8 GB RAM (zwei Zellen à 2 GB Budget gleichzeitig plus Redis, Nginx und Betriebssystem), aktiver Kühler (offizieller Active Cooler oder Lüftergehäuse), offizielles 27-W-Netzteil, SSD statt SD-Karte (z. B. M.2 HAT+ mit NVMe-SSD oder USB-3-SSD). SD-Karten verschleißen bei wochenlangem Schreiben.
- **Lastgenerator:** Linux-Rechner mit mindestens vier Kernen und 8 GB RAM, z. B. ein Mini-PC. Ein zweiter Pi 5 kann bei 1 000 Clients selbst zum Engpass werden. Ein Windows-Rechner mit Docker Desktop ist möglich, bringt durch die zusätzliche Virtualisierungsschicht aber mehr Schwankung.
- **Netz:** Gigabit-Switch oder direkte Verbindung, Cat-6-Kabel, kein WLAN.
- **Optional:** kleine USV; ein Stromausfall kostet sonst bis zu eine Laststufe.

## Einrichtung des Pi

1. **Betriebssystem:** Raspberry Pi OS Lite (64 Bit) auf der SSD. Prüfen mit `uname -m`, erwartet wird `aarch64`.

2. **Automatische Updates abschalten**, damit sich Docker oder der Kernel nicht mitten in der Messphase ändern:

   ```bash
   sudo systemctl disable --now unattended-upgrades apt-daily.timer apt-daily-upgrade.timer
   ```

   Nicht vorhandene Units meldet `systemctl` als Fehler; das ist unkritisch.

3. **Speicher-cgroup aktivieren.** Ohne den memory-Controller ignoriert Docker alle Speicherlimits stillschweigend:

   ```bash
   cat /sys/fs/cgroup/cgroup.controllers
   ```

   Fehlt `memory` in der Ausgabe, wird `cgroup_enable=memory cgroup_memory=1` an die bestehende Zeile in `/boot/firmware/cmdline.txt` angehängt (keine neue Zeile) und neu gestartet.

4. **Swap abschalten.** Ausgelagerter Speicher verzerrt Latenz- und Speichermessung:

   ```bash
   swapon --show
   sudo dphys-swapfile swapoff && sudo systemctl disable dphys-swapfile
   ```

   Je nach OS-Version ist statt `dphys-swapfile` ein anderer Swap-Dienst aktiv (z. B. zram). Entscheidend ist, dass `swapon --show` danach keine Ausgabe mehr liefert.

5. **CPU-Governor fest auf „performance":**

   ```bash
   sudo cp infra/pi/cpu-performance.service /etc/systemd/system/
   sudo systemctl enable --now cpu-performance.service
   cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor   # performance
   ```

6. **Docker** nach der offiziellen Anleitung für Debian installieren (docs.docker.com, „Install Docker Engine on Debian"). Den Benutzer der Gruppe `docker` hinzufügen, damit der Orchestrator ohne `sudo` arbeiten kann.

7. **Repository** auf denselben Commit wie auf dem Lastgenerator auschecken. Der Orchestrator bricht ab, wenn die Stände abweichen.

8. **Konfiguration:**
   - `.env` aus `.env.example` anlegen und die Zeile `COMPOSE_FILE=docker-compose.yml:docker-compose.pi.yml` einkommentieren. Damit wird `docker-compose.pi.yml` bei jedem `docker compose`-Aufruf mitgeladen.
   - `SUT_CPU_LIMIT` und `SUT_MEM_LIMIT` auf die endgültigen Werte setzen.
   - `prototypes/php-laravel/.env` vom Entwicklungsrechner kopieren (z. B. per `scp`). Die Datei enthält Schlüssel und ist nicht im Repository.

9. **cgroup-Töpfe der Zellen anlegen** (nach jeder Änderung der Limits erneut ausführen):

   ```bash
   sudo bash infra/pi/setup-slices.sh
   ```

10. **Images bauen:**

    ```bash
    docker compose --profile node-minimal --profile node-express --profile node-express-queue --profile php-minimal --profile php-laravel --profile php-laravel-queue --profile tools build
    ```

11. **Kontrolle:**

    ```bash
    docker compose --profile tools up -d resource-sampler
    docker compose --profile tools exec resource-sampler node sampler.js info
    ```

    Erwartet werden `"memory_controller":true`, `"cpu_governor":"performance"`, `"swap_total_bytes":0` und `"throttled":"0x0"`.

12. **Belastungstest (24 h)** vor dem Pilot: zeigt, dass Kühlung und Netzteil Dauerlast ohne Drosselung tragen.

    ```bash
    sudo apt install stress-ng
    bash infra/pi/burn-in.sh 24
    ```

    Das Skript protokolliert jede Minute Temperatur, Takt und Drosselstatus nach `results/<zeitstempel>_burn-in.csv` und meldet am Ende Höchsttemperatur und ob eine Drosselung aufgetreten ist. Tritt eine Drosselung auf, ist die Kühlung zu verbessern, bevor gemessen wird.

## Einrichtung des Lastgenerators

1. Docker und Node.js (Version 22) installieren, Repository auf denselben Commit auschecken.
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

Dann die Kampagnen einer Phase erzeugen und den Zeitplan starten (Reihenfolge der Phasen: DECISIONS.md 5.9):

```bash
node tools/orchestrate/plan-campaigns.js main --block 1 --runs baseline=80,medium=60,stress=40 --sut sut.pi.json --out campaigns/block1
node tools/orchestrate/schedule.js campaigns/block1/schedule.json
```

Für den mehrwöchigen Betrieb empfiehlt sich `tmux` oder ein systemd-User-Dienst auf dem Lastgenerator (README.md im Wurzelverzeichnis, Abschnitt zu langen Messkampagnen). Ein erneuter Start des Zeitplans setzt an der nächsten unvollständigen Kampagne fort.

## Automatische Prüfungen

Mit `"pi": true` bricht der Orchestrator vor Beginn ab, wenn eine der folgenden Bedingungen nicht erfüllt ist:

- memory-cgroup-Controller vorhanden
- CPU-Governor `performance`
- kein Swap
- keine aktuelle Drosselung (`get_throttled`)
- Code-Stand auf beiden Geräten identisch
- Container jeder Zelle liegen im zugehörigen Slice `eda_<zelle>.slice`
- alle Zellen im Produktionsbetrieb (Pilot, Hauptmessung, Kontrollmessung)

Pro Lauf werden Temperatur (Beginn, Ende, Maximum), Drosselstatus und die Auslastung des Lastgenerators protokolliert. Ein Lauf, in dem die Firmware Unterspannung, Taktbegrenzung oder thermische Drosselung meldet, gilt als ungültig (`host_throttled`), ebenso ein Lauf mit einer mittleren Auslastung des Lastgenerators über 80 % (`loadgen_saturated`).

## Stand

Der Zwei-Rechner-Aufbau (ssh-Steuerung, veröffentlichte Ports, cgroup-Slices, Drosselprüfung, Auslastung des Lastgenerators) ist implementiert, aber noch nicht auf realer Pi-Hardware erprobt. Vor dem Pilot wird eine kurze Probekampagne empfohlen (wenige Läufe, kurze Haltezeit), mit Kontrolle der ersten Lauf-Dateien: `resources.containers.*.cgroup` muss den Slice-Namen enthalten, `context.sut_host.model` das Pi-Modell nennen, `loadgen.host.cpu` Werte des Lastgenerators enthalten.
