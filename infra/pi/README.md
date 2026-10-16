# Raspberry-Pi-Testserver

Einrichtung des Messaufbaus für die Hauptmessungen (DECISIONS.md 5.14).

## Aufbau

| Rolle | Gerät | Dienste |
|---|---|---|
| SUT-Seite (Testserver) | Raspberry Pi | Redis, Front-Nginx, die Container der jeweils gemessenen Zellen, `resource-sampler` |
| Lastgenerator | zweiter Rechner (Linux empfohlen) | Orchestrator (`tools/orchestrate`), k6, Event-Simulator |

Beide Geräte sind per Kabel im selben, nach Möglichkeit isolierten Netz verbunden.

Begründung der Trennung: Der Pi hat vier Kerne, das Budget einer Zelle beträgt zwei. Liefen k6 (bei 500 Clients selbst rechenintensiv), Event-Simulator und Orchestrator auf demselben Gerät, könnte das Lastwerkzeug zum Engpass werden; gemessen würde dann dessen Grenze statt der des Systems.

Eine Uhrensynchronisation zwischen den Geräten ist nicht erforderlich: Der Sendezeitstempel (Event-Simulator) und der Empfangszeitpunkt (k6) stammen beide vom Lastgenerator. Die Netzwerkstrecke ist in jeder gemessenen Latenz enthalten, für alle Zellen gleich und verzerrt den Vergleich daher nicht.

## Hardware

- **Testserver:** Raspberry Pi 5 mit 8 GB RAM (zwei Zellen à 2 GB Budget gleichzeitig plus Redis, Nginx und Betriebssystem), aktive Kühlung (Active Cooler oder Lüftergehäuse), Netzteil mit voller Leistung (27 W beim Pi 5). Eine SSD statt SD-Karte erhöht die Zuverlässigkeit bei langen Kampagnen.
- **Lastgenerator:** Linux-Rechner mit mindestens vier Kernen. Ein Windows-Rechner mit Docker Desktop ist möglich, bringt durch die zusätzliche Virtualisierungsschicht aber mehr Schwankung.

## Einrichtung des Pi

1. **Betriebssystem:** Raspberry Pi OS Lite (64 Bit). Prüfen mit `uname -m`, erwartet wird `aarch64`.

2. **Speicher-cgroup aktivieren.** Ohne den memory-Controller ignoriert Docker alle Speicherlimits stillschweigend:

   ```bash
   cat /sys/fs/cgroup/cgroup.controllers
   ```

   Fehlt `memory` in der Ausgabe, wird `cgroup_enable=memory cgroup_memory=1` an die bestehende Zeile in `/boot/firmware/cmdline.txt` angehängt (keine neue Zeile) und neu gestartet.

3. **Swap abschalten.** Ausgelagerter Speicher verzerrt Latenz- und Speichermessung:

   ```bash
   swapon --show
   sudo dphys-swapfile swapoff && sudo systemctl disable dphys-swapfile
   ```

   Je nach OS-Version ist statt `dphys-swapfile` ein anderer Swap-Dienst aktiv (z. B. zram). Entscheidend ist, dass `swapon --show` danach keine Ausgabe mehr liefert.

4. **CPU-Governor fest auf „performance":**

   ```bash
   sudo cp infra/pi/cpu-performance.service /etc/systemd/system/
   sudo systemctl enable --now cpu-performance.service
   cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor   # performance
   ```

5. **Docker** nach der offiziellen Anleitung für Debian installieren (docs.docker.com, „Install Docker Engine on Debian"). Den Benutzer der Gruppe `docker` hinzufügen, damit der Orchestrator ohne `sudo` arbeiten kann.

6. **Repository** auf denselben Commit wie auf dem Lastgenerator auschecken. Der Orchestrator bricht ab, wenn die Stände abweichen.

7. **Konfiguration:**
   - `.env` aus `.env.example` anlegen und die Zeile `COMPOSE_FILE=docker-compose.yml:docker-compose.pi.yml` einkommentieren. Damit wird `docker-compose.pi.yml` bei jedem `docker compose`-Aufruf mitgeladen.
   - `SUT_CPU_LIMIT` und `SUT_MEM_LIMIT` auf die endgültigen Werte setzen.
   - `prototypes/php-laravel/.env` vom Entwicklungsrechner kopieren (z. B. per `scp`). Die Datei enthält Schlüssel und ist nicht im Repository.

8. **cgroup-Töpfe der Zellen anlegen** (nach jeder Änderung der Limits erneut ausführen):

   ```bash
   sudo bash infra/pi/setup-slices.sh
   ```

9. **Images bauen:**

   ```bash
   docker compose --profile node-minimal --profile node-express --profile php-minimal --profile php-laravel --profile tools build
   ```

10. **Kontrolle:**

    ```bash
    docker compose --profile tools up -d resource-sampler
    docker compose --profile tools exec resource-sampler node sampler.js info
    ```

    Erwartet werden `"memory_controller":true`, `"cpu_governor":"performance"`, `"swap_total_bytes":0` und `"throttled":"0x0"`.

## Einrichtung des Lastgenerators

1. Docker und Node.js (Version 22) installieren, Repository auf denselben Commit auschecken.
2. Schlüsselbasierten ssh-Zugang zum Pi einrichten (`ssh-copy-id pi@<adresse>`). Der Orchestrator verwendet `BatchMode`, eine Passwortabfrage ist nicht möglich.
3. `prototypes/php-laravel/.env` ebenfalls bereitstellen oder `K6_REVERB_APP_KEY` als Umgebungsvariable setzen. Der Reverb-App-Key muss mit dem auf dem Pi übereinstimmen.
4. Images für k6 und den Event-Simulator bauen:

   ```bash
   docker compose --profile load --profile tools build k6 event-simulator
   ```

## Kampagne starten

Vorlage: `tools/orchestrate/campaign.pi.example.json`. Der Block `sut` legt fest, dass die SUT-Seite per ssh gesteuert wird:

| Feld | Bedeutung |
|---|---|
| `ssh` | ssh-Ziel des Pi, z. B. `pi@192.168.0.50` |
| `repoDir` | Pfad des Repositorys auf dem Pi |
| `pi` | `true` schaltet die strengen Prüfungen ein (siehe unten) |
| `targetBaseUrl` | Front-Nginx des Pi aus Sicht von k6, z. B. `http://192.168.0.50:8080` |
| `redisHost` | Redis des Pi aus Sicht des Event-Simulators |

```bash
node tools/orchestrate/run.js <kampagne>.json
```

Für lange Kampagnen empfiehlt sich `tmux` oder ein systemd-User-Dienst auf dem Lastgenerator (README.md im Wurzelverzeichnis, Abschnitt zu langen Testläufen).

## Automatische Prüfungen

Mit `"pi": true` bricht der Orchestrator vor Beginn ab, wenn eine der folgenden Bedingungen nicht erfüllt ist:

- memory-cgroup-Controller vorhanden
- CPU-Governor `performance`
- kein Swap
- keine aktuelle Drosselung (`get_throttled`)
- Code-Stand auf beiden Geräten identisch
- Container jeder Zelle liegen im zugehörigen Slice `eda_<zelle>.slice`

Pro Lauf werden Temperatur (Beginn, Ende, Maximum) und Drosselstatus protokolliert. Ein Lauf, in dem die Firmware Unterspannung, Taktbegrenzung oder thermische Drosselung meldet, gilt als ungültig (`host_throttled`).

## Stand

Der Zwei-Rechner-Aufbau (ssh-Steuerung, veröffentlichte Ports, cgroup-Slices, Drosselprüfung) ist implementiert, aber noch nicht auf realer Pi-Hardware erprobt. Vor dem Pilot wird eine kurze Probekampagne empfohlen (wenige Läufe, kurze Haltezeit), mit Kontrolle der ersten Lauf-Dateien: `resources.containers.*.cgroup` muss den Slice-Namen enthalten, `context.sut_host.model` das Pi-Modell nennen.
