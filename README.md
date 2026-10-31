# EDA Notification Thesis

Prototypen und Messumgebung zur Bachelorarbeit **„Event-driven Notification Systems: PHP vs. Node.js mit Server-Sent Events und WebSockets"** (Arbeitstitel, Titelvorschläge in DECISIONS.md 5.23). Ausgangspunkt ist das Semesterprojekt Lokato (RFID-Scan → MQTT → Backend → Push an Clients).

Verglichen werden zehn Zellen. Acht davon bilden die Kombinationen aus zwei Sprachen, zwei Transportarten und zwei Varianten. Die Framework-Variante ist der Hauptvergleich PHP gegenüber Node.js, die Minimalvariante dient als Baseline ohne Framework. Zwei weitere Zellen messen den Weg über eine Queue. Verglichen wird entlang von vier Achsen, nämlich Sprache, Framework, Transport und Queue (DECISIONS.md 5.15).

| | SSE | WebSockets | SSE mit Queue |
| --- | --- | --- | --- |
| **PHP, Framework** (`php-laravel`) | Laravel, PHP-FPM | Laravel Reverb | Laravel Queue → Laravel, PHP-FPM |
| **PHP, minimal** (`php-minimal`) | PHP-FPM | Ratchet (ReactPHP) | — |
| **Node.js, Framework** (`node-express`) | Express | Express + `ws` | BullMQ → Express |
| **Node.js, minimal** (`node-minimal`) | `http`-Modul | `ws` | — |

Alle Zellen beziehen die Events aus Redis Pub/Sub und laufen hinter demselben Nginx, im Produktionsbetrieb nach offizieller Dokumentation. Gemessen werden Latenz, Verbindungsaufbau, Zustellung und Durchsatz, Skalierung über 10 bis 1 000 gleichzeitige Clients sowie CPU- und Speicherverbrauch. Lasttest-Werkzeug ist k6.

## Dokumentation

| Dokument | Inhalt |
| --- | --- |
| [DECISIONS.md](DECISIONS.md) | Architektur- und Methodikentscheidungen mit Begründung, Hypothesen, offene Punkte, Änderungsverlauf |
| [LITERATUR.md](LITERATUR.md) | verwandte Arbeiten und Quellen zu den Entscheidungen, mit BibTeX |
| [infra/pi/README.md](infra/pi/README.md) | Einrichtung des Raspberry-Pi-Testservers und des Lastgenerators |
| [tools/orchestrate/README.md](tools/orchestrate/README.md) | Messkampagnen, Zeitplan und Auswertung |
| [docs/KI-NUTZUNG.md](docs/KI-NUTZUNG.md) | Nutzung von KI im praktischen Teil, Arbeitsteilung, Prüfung der Ergebnisse, Verlauf |
| [docs/archive/](docs/archive/) | frühere Prüfberichte (historisch, überholt durch DECISIONS.md) |

## Repository-Struktur

```
.
├── DECISIONS.md               # Entscheidungsprotokoll
├── LITERATUR.md               # Literatur mit BibTeX
├── docs/KI-NUTZUNG.md         # Nutzung von KI im praktischen Teil
├── docs/archive/              # frühere Prüfberichte (historisch)
├── docker-compose.yml         # portable Basis
├── docker-compose.pi.yml      # Ergänzung für den Raspberry-Pi-Testserver
├── docker-compose.override.example.yml  # Vorlage für lokale Abweichungen
├── .env.example               # Vorlage für die Umgebungskonfiguration
├── prototypes/                # Vergleichscode, minimal und lesbar
│   ├── php-minimal/           #   PHP-FPM (SSE), Ratchet (WS), kein Framework
│   ├── php-laravel/           #   Laravel: SSE über PHP-FPM, WS über Reverb, Queue
│   ├── node-minimal/          #   http-Modul (SSE), ws (WS), kein Framework
│   └── node-express/          #   Express: SSE, WS, BullMQ
├── k6/                        # Lasttests
│   ├── Dockerfile             #   k6 mit xk6-sse, Build im Container
│   ├── lib/                   #   Konfiguration, Messfenster, Zustellungs-Buchführung
│   └── scripts/               #   sse-feasibility.js (SSE), ws-skeleton.js (WS), ws-reverb.js (Reverb)
├── infra/
│   ├── nginx/                 #   Front-Nginx: templates/http (Proxy), templates/fastcgi (PHP-FPM)
│   └── pi/                    #   Einrichtungsskript des Pi, cgroup-Slices, CPU-Governor, Belastungstest
├── tools/                     # Werkzeuge, nicht Teil der Prototypen
│   ├── orchestrate/           #   Kampagnen, Zeitplan, Statusbericht, Statistik, Gesamtauswertung
│   ├── code-metrics/          #   Code- und Betriebskennzahlen je Zelle (Komplexität, Wartbarkeit)
│   ├── figures/               #   Abbildungen der Ergebniskapitel als Vektor-PDF (Python, eigener Container)
│   ├── resource-sampler/      #   CPU und Speicher pro Lauf aus cgroup v2, Auslastung des Lastgenerators
│   ├── event-simulator/       #   Lokato-Scan-Events mit fester Rate (Pub/Sub oder BullMQ)
│   └── sse-feasibility/       #   SSE-Server der Machbarkeitsprüfung (DECISIONS.md, Abschnitt 3)
└── results/                   # Messergebnisse und Auswertungen
```

Der Code unter `prototypes/` dient in der Arbeit als Anschauungsbeispiel und ist deshalb so knapp und lesbar wie möglich gehalten. Alles, was nur dem Betrieb oder der Messung dient, liegt in `tools/` und `infra/`.

## Voraussetzungen

- **Docker mit Compose v2** für alle Prototypen und Messungen. PHP, Node.js und Go müssen dafür nicht lokal installiert sein (DECISIONS.md, Abschnitt 2).
- **Node.js 22 oder neuer** (geprüft mit 22 und 24) für `tools/orchestrate` und `tools/code-metrics`. Der Orchestrator ruft selbst `docker compose` auf und läuft daher direkt auf dem steuernden Rechner.
- **PHP und Composer** nur für die einmalige Einrichtung von `prototypes/php-laravel` (Schlüssel erzeugen, siehe unten). Alternativ läuft diese Einrichtung in einem temporären Container mit dem Image `eda-thesis-php-laravel`.

## Lokale Einrichtung

```bash
cp .env.example .env
cp docker-compose.override.example.yml docker-compose.override.yml
cp prototypes/php-laravel/.env.example prototypes/php-laravel/.env
```

In `prototypes/php-laravel/` anschließend `php artisan key:generate` und `php artisan reverb:install` ausführen. Das erzeugt `APP_KEY` und die `REVERB_APP_*`-Werte. Die Datei wird per `env_file` in die `php-laravel-*`-Container eingespeist, nie in ein Image übernommen und nie versioniert. Den Betriebsmodus (Produktion) setzt `docker-compose.yml`, nicht diese Datei.

Images bauen:

```bash
docker compose --profile node-minimal --profile node-express --profile php-minimal --profile php-laravel --profile tools --profile load build
```

Einzelne Zellen manuell starten, z. B. die Node-Minimalvariante:

```bash
docker compose --profile node-minimal up -d
```

**Profile.** `node-minimal`, `node-express`, `node-express-queue`, `php-minimal`, `php-laravel`, `php-laravel-queue`, dazu `tools` (Ereignisquellen, Sampler) und `load` (k6). Für Messungen startet und stoppt der Orchestrator die benötigten Container selbst. Für die Fehlersuche lässt sich der Produktionsbetrieb lokal per `.env` abschalten (`LARAVEL_APP_ENV=local`, `LARAVEL_APP_DEBUG=true`, `SUT_NODE_ENV=development`). Pilot- und Hauptkampagnen brechen dann ab.

## Messungen

Gemessen wird in Phasen (DECISIONS.md 5.9), nämlich Belastungstest, Pilot, Hauptmessung (Block 1), Replikation (Block 2), Skalierungsreihe, Sättigungstest und Ansturm, dazu eine tägliche Kontrollmessung. Die Clients verbinden sich verteilt über die ersten 5 s der Einschwingzeit, nur der Ansturm verbindet alle gleichzeitig, jeweils direkt nach einem Neustart der Zelle (DECISIONS.md 5.10). Jede andere Kampagne beginnt mit einem nicht gewerteten Vorlauf mit 550 Clients, damit der Speicher der statischen FPM-Pools nicht von Lauf zu Lauf wächst (DECISIONS.md 5.9). Die Kampagnen einer Phase erzeugt `plan-campaigns.js` aus dem Auswerteplan, `schedule.js` arbeitet sie unbeaufsichtigt ab:

```bash
node tools/orchestrate/pilot.js results/<pilotkampagnen> ... --runs baseline=90,medium=90,stress=90
node tools/orchestrate/plan-campaigns.js main --block 1 --runs baseline=90,medium=90,stress=90 --out campaigns/block1
node tools/orchestrate/schedule.js campaigns/block1/schedule.json
node tools/orchestrate/status.js --schedule campaigns/block1/schedule.json
node tools/orchestrate/evaluate.js results/<kampagne-1> results/<kampagne-2> ...
node tools/orchestrate/series.js results/<skalierungs-und-saettigungskampagnen> ...
node tools/code-metrics/metrics.js
docker compose --profile tools run --rm figures --evaluation results/<auswertung> --series results/<reihen>
```

Format der Kampagnen, Phasen, Ergebnisdateien und Auswertung beschreibt [tools/orchestrate/README.md](tools/orchestrate/README.md). Die Messungen der Arbeit laufen auf dem Raspberry Pi mit separatem Lastgenerator ([infra/pi/README.md](infra/pi/README.md)).

Ein einzelner manueller k6-Lauf gegen den Front-Nginx:

```bash
docker compose --profile tools up -d event-simulator
docker compose --profile load run --rm -e K6_TARGET_BASE_URL=http://nginx -e K6_VUS=10 -e K6_HOLD_SECONDS=20 -e K6_SETTLE_SECONDS=5 k6 run scripts/sse-feasibility.js
```

Die gemessene Zelle wählen `SUT_MODE`, `SUT_HOST` und `SUT_PORT` in der `.env`. Gültige Werte listet `.env.example`.

## Hinweise zu den Prototypen

- **Reverb verwendet das Pusher-Channels-Protokoll**, nicht rohes JSON wie die übrigen WebSocket-Zellen. Clients durchlaufen vor der ersten Nachricht einen Verbindungs-Handshake und abonnieren einen Kanal. Das ist ein Unterschied der Bibliothekswahl und bei der Interpretation der WebSocket-Latenzen zu berücksichtigen (`prototypes/php-laravel/README.md`).
- **Der Reverb-Kanal `scans` ist öffentlich** und hat keine Authentifizierung. So bleibt die Zelle strukturell mit den übrigen WebSocket-Zellen vergleichbar, ohne zusätzlichen Auth-Roundtrip, der nur Laravel beträfe.
- **php-laravel nutzt `SESSION_DRIVER=cookie` und `CACHE_STORE=file`** statt des Laravel-Standards `database`. Das vermeidet SQLite-Zugriffe im SSE-Pfad, die die FPM-Messung verzerren würden. Der übrige `web`-Middleware-Stack (Session, CSRF) bleibt aktiv, um Laravel im Auslieferungszustand abzubilden.
- **php-laravel/WS besteht aus zwei Prozessen.** Der Listener abonniert Redis und sendet jedes Event an Reverb, Reverb verteilt es an die Clients. Beide Container zählen zum Ressourcenbudget der Zelle (DECISIONS.md 5.6.2).
- **Alle SSE-Endpunkte senden beim Verbindungsaufbau einen SSE-Kommentar** (`: connected`). So ist der Zeitpunkt messbar, zu dem der Server die Verbindung angenommen hat. Clients ignorieren Kommentarzeilen.
- **Die Queue-Zellen** verwenden denselben SSE-Code wie die Zellen ohne Queue, abonnieren aber den Kanal `notifications`, auf dem der jeweilige Worker veröffentlicht (DECISIONS.md 5.19). Der Laravel-Worker wartet mit `block_for` blockierend auf Jobs.

## Versionen

Keine Komponente läuft auf `latest` (Stand 2026-10-27). Gemessen wird jeweils die neueste Version, die am Stichtag mindestens zwei Wochen alt war (DECISIONS.md 5.26).

| Komponente | Version | Pinning |
| ---------- | ------- | ------- |
| PHP | 8.5.11-fpm-alpine | `prototypes/{php-minimal,php-laravel}/Dockerfile` |
| Node.js | 26.11.1-alpine | alle `Dockerfile` unter `prototypes/` und `tools/` |
| Laravel | 13.36.0 | `composer.json` (exakt) + `composer.lock` |
| Reverb | 1.12.0 | `composer.lock` |
| Ratchet / clue/redis-react | 0.4.4 / 2.8.0 | `composer.json` (exakt) + `composer.lock` |
| Express | 5.3.0 | `package.json` (exakt) + `package-lock.json` |
| BullMQ / ioredis | 6.3.14 / 6.0.0 | `package.json` (exakt) + `package-lock.json` |
| `ws`, `redis` (npm) | 8.22.0 / 6.3.0 | `package.json` (exakt) + `package-lock.json` |
| Redis | 8.10.2-alpine | `docker-compose.yml` |
| Nginx | 1.30.5-alpine | `docker-compose.yml` |
| k6 / xk6-sse | 1.2.1 / 0.1.12 | `k6/Dockerfile` (Begründung in DECISIONS.md, Abschnitt 3) |
| xk6-Builder / k6-Laufzeit | 1.4.7 / Alpine 3.20 | `k6/Dockerfile` |
| Composer (nur Build) | 2.10.3 | `prototypes/{php-minimal,php-laravel}/Dockerfile` |

Node-Pakete sind exakt gepinnt und per `package-lock.json` reproduzierbar, PHP-Pakete per `composer.lock`. Die Basis-Images sind zusätzlich zum Tag auf den Digest ihres Multi-Arch-Index gepinnt (`image:tag@sha256:…` in den Dockerfiles und in `docker-compose.yml`, festgelegt am 2026-10-27). Derselbe Digest gilt für amd64 und arm64. Lastgenerator und Pi bauen damit aus identischen Basis-Images. Die tatsächlich verwendeten Image-IDs protokolliert jeder Lauf.

## PHP-FPM-Dimensionierung

Beide PHP-Prototypen verwenden `pm = static` mit `pm.max_children = 550` (`prototypes/*/fpm-pool.conf`). Pro SSE-Verbindung belegt PHP-FPM einen Worker (DECISIONS.md 5.5). Liegt `pm.max_children` unter der Zielzahl von 500 Clients, misst der Vergleich eine Konfigurationsgrenze statt eines Architekturunterschieds. Jenseits von 550 Clients zeigt die Skalierungsreihe genau diese Grenze (Anteil bedienter Clients).

Speicherbedarf bei 500 gleichzeitigen SSE-Clients im Produktionsbetrieb (lokal, 2026-10-16, noch mit PHP 8.4 und Laravel 12, Spitze des Working Sets der Zelle, `results/2026-10-16_verification-2/`):

| Zelle | Working-Set-Spitze |
| --- | --- |
| php-minimal/SSE | ca. 375 MiB |
| php-laravel/SSE | ca. 1 390 MiB |

Das Speicherbudget pro Zelle beträgt 1,5 GiB, passend zum Raspberry Pi 5 mit 4 GB (DECISIONS.md 5.10). Verbinden sich alle 500 Clients gleichzeitig, bricht php-laravel/SSE damit wegen Speichermangels ab. Mit dem verteilten Verbindungsaufbau, der für alle Messphasen gilt, lag die echte Spitze auf dem Pi bei rund 1 060 bis 1 100 MiB. Ein Worker belegt eigenen Speicher erst, wenn er zum ersten Mal eine Anfrage bearbeitet hat. Damit der Speicher nicht von Lauf zu Lauf wächst, beginnt jede Kampagne mit einem Vorlauf, nach dem alle 550 Worker einmal gearbeitet haben (DECISIONS.md 5.9). Die lokalen Prüfläufe liefen mit 2 GiB. Mit dem früheren Wert von 512 MiB wäre php-laravel/SSE unter Volllast per OOM beendet worden. Die geforkten FPM-Worker teilen Speicherseiten per Copy-on-Write mit dem Master-Prozess, deshalb liegt der Bedarf unter dem Vielfachen eines einzelnen Prozesses. Beim gleichzeitigen Verbindungsaufbau aller Clients liegt der Bedarf auf dem Pi kurzzeitig über 1,5 GiB, das misst die Phase Ansturm. Speicherwachstum über sehr lange Verbindungen (Stunden) ist nicht erfasst.

## Dateideskriptor-Limits

Jede offene SSE- oder WebSocket-Verbindung belegt mehrere Dateideskriptoren (Client- und Upstream-Socket). Übliche Linux-Standardwerte (1024) reichen für 500 und mehr Verbindungen nicht. Gesetzt sind:

- **Front-Nginx (`infra/nginx/nginx.conf`).** `worker_rlimit_nofile 8192`, `worker_connections 4096`.
- **Alle Prototyp-Container.** `ulimits.nofile` 8192 in `docker-compose.yml`.
- **Host.** Docker benötigt in der Regel keine Anpassung. Bei sehr vielen Verbindungen über mehrere Container ist `sysctl fs.file-max` zu prüfen. Der Wert sollte deutlich über der Summe der Container-Limits liegen.

## Lange Messkampagnen

Ein Zeitplan läuft über Tage bis Wochen. `schedule.js` setzt nach einem Abbruch an der nächsten unvollständigen Kampagne fort. Eine unterbrochene ssh-Sitzung darf den Zeitplan trotzdem nicht beenden. Möglichkeiten auf dem Lastgenerator:

**tmux:**

```bash
tmux new -s eda-campaign
node tools/orchestrate/schedule.js campaigns/block1/schedule.json
# Strg-B, D: Sitzung trennen; tmux attach -t eda-campaign: wieder verbinden
```

**systemd-User-Dienst** (startet nach einem Neustart erneut und setzt dabei fort):

```ini
# ~/.config/systemd/user/eda-campaign.service
[Unit]
Description=EDA Notification Thesis — Messkampagne

[Service]
Type=simple
WorkingDirectory=%h/eda-notification-thesis
ExecStart=/usr/bin/node tools/orchestrate/schedule.js campaigns/block1/schedule.json
Restart=no

[Install]
WantedBy=default.target
```

```bash
systemctl --user daemon-reload
systemctl --user start eda-campaign
journalctl --user -u eda-campaign -f
loginctl enable-linger $USER   # sonst endet der Dienst beim Abmelden
```

Strg-C beendet eine Kampagne nach dem laufenden Lauf geordnet. Bereits gemessene Läufe bleiben erhalten, die Kampagne wird beim nächsten Start des Zeitplans wiederholt.

**Überwachung.** `node tools/orchestrate/status.js --schedule <schedule.json> --sut sut.pi.json` zeigt Fortschritt, ungültige Läufe, Temperatur, Drift der Kontrollmessung und Speicherplatz. Als stündlicher cron-Job mit `--notify` meldet es Auffälligkeiten aufs Handy, `schedule.js` meldet abgebrochene Kampagnen und das Ende des Zeitplans (beides über `NOTIFY_URL` in der `.env`, siehe [tools/orchestrate/README.md](tools/orchestrate/README.md)).

## Ergebnisse

`results/` enthält pro Kampagne ein Verzeichnis mit Kampagnendefinition, Ereignisprotokoll, einem JSON-Protokoll pro Lauf und der Kampagnenauswertung (Aufbau in DECISIONS.md 5.16). Die Ergebnisse werden versioniert. `results/2026-10-16_verification/` und `results/2026-10-16_verification-2/` enthalten die lokalen Funktionsprüfungen des Messaufbaus, `results/xk6-sse-feasibility-*.txt` die Machbarkeitsprüfung von xk6-sse.
