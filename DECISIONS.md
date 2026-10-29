# Entscheidungsprotokoll

Dieses Dokument hält die Architektur- und Methodikentscheidungen des Messaufbaus mit ihrer Begründung fest und dient als Grundlage für das Methodik-Kapitel der Arbeit. Weichen Implementierung und Dokument voneinander ab, ist das Dokument maßgeblich. Die Implementierung wird angepasst.

Status der Abschnitte:

- **ENTSCHIEDEN.** Festgelegt und umgesetzt bzw. verbindlich für die Umsetzung.
- **OFFEN.** Noch zu klären. Der Arbeitsstand ist angegeben.
- **ENTFÄLLT.** Verworfene Option, zur Nachvollziehbarkeit dokumentiert.

Abstimmungen mit dem Betreuer (Mag. Volker Christian) sind mit Datum vermerkt. Den Verlauf der Änderungen enthält Abschnitt 8, die offenen Punkte Abschnitt 6.

---

## 1. Repository-Struktur, Monorepo — ENTSCHIEDEN

Ein Repository enthält alle Prototypen, k6-Skripte, Infrastruktur, Werkzeuge und Ergebnisse (Struktur in README.md).

Begründung:

- Die Prototypen teilen Docker-Compose-Aufbau, k6-Skripte, `.env`-Konventionen und Auswertung. Getrennte Repositories würden diese gemeinsamen Teile duplizieren und auseinanderlaufen lassen.
- Nebeneinanderliegende Prototypen (`prototypes/php-*`, `prototypes/node-*`) machen Unterschiede direkt sichtbar.
- Eine gemeinsame Commit-Historie dokumentiert den Arbeitsfortschritt.

**Trennungsprinzip.** `prototypes/` enthält ausschließlich minimalen, lesbaren Vergleichscode ohne Komfortfunktionen. Hilfsserver sowie Mess- und Auswertungswerkzeuge liegen in `tools/`, Infrastruktur-Konfiguration in `infra/`.

## 2. Laufzeitumgebung, Docker Compose — ENTSCHIEDEN

PHP, Node.js, Redis, Nginx und k6 laufen ausschließlich als Container. Ausgenommen ist das Steuerwerkzeug `tools/orchestrate`. Es ruft selbst Docker auf und läuft deshalb direkt mit Node.js auf dem steuernden Rechner.

Begründung:

- Identisches Verhalten unter Windows, macOS und Linux ohne manuelle Anpassung. Native Installationen driften (Versionen, Pfade).
- k6 benötigt für SSE einen eigenen Build mit der Erweiterung xk6-sse (Abschnitt 3). Der Go-Build läuft im Container (Multi-Stage, `k6/Dockerfile`), eine lokale Go-Installation entfällt.
- Der Wechsel auf die Zielumgebung (5.14) erfordert nur Docker und Compose v2.

Lokale Messwerte dienen ausschließlich der Funktions- und Plausibilitätsprüfung. Die Ergebnisse der Arbeit entstehen auf dem Raspberry-Pi-Testserver (5.14).

Mechanik:

- **`docker-compose.yml`.** Portable Basis ohne umgebungsspezifische Einstellungen, mit Log-Rotation für alle Dienste.
- **`docker-compose.override.yml`.** Lokale Abweichungen (z. B. Host-Ports für manuelle Tests), nicht versioniert. Vorlage `docker-compose.override.example.yml`.
- **`docker-compose.pi.yml`.** Ergänzung für den Pi (im Netz veröffentlichte Ports, cgroup-Slice pro Zelle), aktiviert über `COMPOSE_FILE` in der `.env`.
- Parameter ausschließlich über `.env` (Vorlage `.env.example`), nicht versioniert.
- k6 erreicht die Ziele lokal über Service-Namen im Compose-Netzwerk, im Zwei-Rechner-Aufbau über die Adresse des Pi.

## 3. Machbarkeit von xk6-sse — ENTSCHIEDEN (geprüft am 2026-07-26)

k6 unterstützt WebSockets nativ (`k6/ws`), SSE nur über die Community-Erweiterung [xk6-sse](https://github.com/phymbert/xk6-sse) (`k6/x/sse`). Diese blockiert die jeweilige VU (virtueller Benutzer in k6), solange die Verbindung offen ist. Geprüft wurde, ob die Latenzmessung damit bei nennenswerter Nebenläufigkeit stabil bleibt.

Prüfaufbau:

- **`tools/sse-feasibility/`.** Minimaler SSE-Server ohne Abhängigkeiten, sendet pro Verbindung alle `EVENT_INTERVAL_MS` ein Event `{"seq":n,"ts":<ms-epoch>}`.
- **`k6/scripts/sse-feasibility.js` (damalige Fassung).** N VUs halten je eine Verbindung über `K6_HOLD_SECONDS` und messen pro Event Empfangszeit minus `ts`.

Ergebnis (lokal, Docker unter Windows 11/WSL2):

| Lauf | VUs | Dauer | Events erwartet | Events empfangen | Latenz avg | p95 | max | Fehler |
| ---- | --- | ----- | --------------- | ---------------- | ---------- | --- | --- | ------ |
| 1 | 50 | 60 s | 3 000 | 3 000 (100 %) | 0,10 ms | 1 ms | 2 ms | 0 |
| 2 | 200 | 60 s | 12 000 | 12 000 (100 %) | 0,07 ms | 1 ms | 1 ms | 0 |

**Rohausgaben.** `results/xk6-sse-feasibility-50vu.txt`, `results/xk6-sse-feasibility-200vu.txt`.

**Bewertung.** xk6-sse ist tragfähig. Es gingen keine Events verloren, alle Verbindungen blieben über die volle Haltedauer stabil, und die Latenzverteilung war auch bei 200 Verbindungen eng. xk6-sse blockiert nur die jeweilige VU (eine Goroutine pro Verbindung), nicht den Prozess. Da das Testdesign pro Verbindung eine VU vorsieht (`holdScenario()` in `k6/lib/config.js`), ist das Blockieren unkritisch. SSE-Tests laufen daher über xk6-sse, WebSocket-Tests über `k6/ws`.

Abgebrochene Zwischenschritte während der Prüfung (ohne Einfluss auf die Ergebnisse):

1. Ein manueller curl-Aufruf des SSE-Endpunkts endete mit Exit-Code 28. Das ist erwartet. curl war mit `-m 4` auf vier Sekunden begrenzt, und ein SSE-Stream endet nicht von selbst.
2. Der erste 50-VU-Lauf brach mit Exit-Code 107 ab, weil das k6-Binary die Erweiterung nicht aktiv hatte (Einschränkung 1). Der Abbruch erfolgte vor Teststart beim Auflösen des Imports. Es entstanden keine Messdaten.
3. Docker Desktop lief zu Beginn noch nicht. Dieser Schritt hat keinen Bezug zu den Messschritten.

Beide Ergebnisläufe stammen vom korrigierten Binary, dessen aktive Erweiterung vorher per `k6 version` geprüft wurde („github.com/phymbert/xk6-sse v0.1.12, k6/x/sse [js]"). Die Zustellraten von 100 % sind damit uneingeschränkt gültig.

Einschränkungen:

1. **Versionen sind gepinnt.** `xk6 build` ohne Versionsangabe baut k6 v2 (Modulpfad `go.k6.io/k6/v2`). xk6-sse v0.1.12 hängt am v1-Modulpfad und wird dann zwar kompiliert, ist zur Laufzeit aber nicht aktiv. `k6/Dockerfile` pinnt daher k6 v1.2.1, xk6-sse v0.1.12 und den Builder `grafana/xk6:1.4.7`. Der Orchestrator prüft vor jedem Lauf, ob die Erweiterung aktiv ist, und protokolliert die Versionsausgabe.
2. Die Machbarkeit wurde mit 1 Event/s pro Verbindung geprüft. Höhere Raten deckt der Sättigungstest ab (5.17).
3. Die Zeitauflösung beträgt 1 ms (`Date.now()`). Die Konsequenz für die Auswertung beschreibt 5.8.
4. Absolute lokale Latenzwerte sind nicht belastbar. Geprüft wurden Stabilität und Plausibilität.

## 4. Portabilität — ENTSCHIEDEN

Jede Zielumgebung benötigt nur Docker und Compose v2. Repository klonen, `.env` anlegen, Images bauen. Die Einrichtung des Raspberry-Pi-Testservers und des Lastgenerators beschreibt `infra/pi/README.md`. Alle Images basieren auf offiziellen Multi-Architektur-Images, die auch für ARM64 verfügbar sind (geprüft am 2026-10-16, einschließlich `grafana/xk6:1.4.7`).

## 5. Methodische Entscheidungen

### 5.1 Webserver, Nginx für alle Zellen — ENTSCHIEDEN (abgestimmt am 2026-10-16)

**Vorgabe.** Alle Vergleiche laufen mit demselben Webserver. Welcher Webserver (Nginx oder Apache) schneller wäre, wird in der Arbeit literaturgestützt diskutiert, nicht gemessen.

Gewählt ist Nginx. Begründung:

- Nginx ist vor allen Zellen gebaut und geprüft (`infra/nginx/`). Ein Wechsel auf Apache erforderte `mod_proxy_fcgi` für PHP-FPM und `mod_proxy_wstunnel` für WebSockets, ohne Erkenntnisgewinn gegenüber der Literaturdiskussion.
- Nginx arbeitet wie Node.js ereignisbasiert mit einer asynchronen Verarbeitungsschleife, Apache je nach MPM mit einem Prozess oder Thread pro Verbindung. Dieser Unterschied fügt sich in die Diskussion von PHP-FPM (Worker pro Verbindung) gegenüber Node.js (Event Loop) ein.

Den Aufbau des Front-Nginx (HTTP-Proxy bzw. FastCGI) beschreibt 5.6.1. Ein Apache-Messaufbau ist nicht vorgesehen (5.11).

### 5.2 HTTP-Version, HTTP/1.1 — ENTSCHIEDEN (abgestimmt am 2026-10-16)

Alle Messungen laufen über HTTP/1.1. SSE funktioniert über HTTP/1.1 uneingeschränkt (Abschnitt 3). Ein HTTP/2-Messlauf ist nicht vorgesehen. Die Arbeit erläutert den Unterschied zwischen HTTP/1.1 und HTTP/2 für SSE. Der mögliche Vorteil von HTTP/2 betrifft SSE. Multiplexing über eine Verbindung umgeht das Limit von sechs gleichzeitigen Verbindungen pro Origin, das Browser unter HTTP/1.1 einhalten. Dieser Effekt betrifft Browser-Clients und wird von k6 nicht abgebildet. Bei WebSockets ist nach dem Upgrade das WebSocket-Protokoll maßgeblich, die HTTP-Version spielt danach kaum eine Rolle.

### 5.3 Debugging- und Monitoring-Vergleich, Kriterien — ENTSCHIEDEN, durchgeführt (5.13)

Die Entwicklungswerkzeuge beider Stacks werden anhand von drei Kriterien verglichen:

1. Verfügbares Tooling (Debugger, Profiler, Log-Integration).
2. Nachvollziehbarkeit eines Events über Queue-Grenzen hinweg per Correlation-ID.
3. Sichtbarkeit von Fehlern in Queue-Workern.

Die Betreuerantwort zu Frage 8 des Abstimmungstermins betrifft das Messprotokoll. Die Testläufe schreiben ihre Messwerte (Dauer, Bytes, Bytes pro Sekunde u. a.) als JSON-Dateien, und aus diesen Dateien werden die Technologien verglichen (5.16). Sie ersetzt den Werkzeugvergleich nicht. Der Werkzeugvergleich bleibt als qualitativer Teil der Wartbarkeit (RQ3, 5.22) in der Arbeit (Auslegung vom 2026-10-18).

### 5.4 Event-Backbone, Redis Pub/Sub — ENTSCHIEDEN (abgestimmt am 2026-10-16)

Alle Prototypen beziehen die Events aus Redis Pub/Sub. Den MQTT-Eingang des Ausgangsprojekts Lokato ersetzen Ereignisquellen (`tools/event-simulator`, für die Laravel-Queue `scan:produce`), die direkt nach Redis publizieren bzw. in die Queue einreihen. Gemessen wird die Strecke Redis → Backend → Client, nicht der MQTT-Eingang.

Auch die Minimalvariante nutzt Redis Pub/Sub. Sie verzichtet nur auf Framework und Queue-Worker. Eine Variante ganz ohne Broker würde nur die Verbindungskosten pro Client messen, nicht den Zustellweg eines Events, und ist für die Fragestellung nicht ergiebig. Damit ist eine missverständliche Formulierung („Minimalvariante ohne Broker") in den Unterlagen zum Abstimmungstermin aufgelöst.

**Bezug zu Lokato.** Lokato verteilt Scan-Ereignisse ohne Broker (Durchsicht des Lokato-Codes am 2026-10-18). Der MQTT-Subscriber verarbeitet einen Scan, speichert ihn in der relationalen Datenbank und aktualisiert ein Änderungssignal im Cache. Jede SSE-Verbindung prüft dieses Signal alle 500 ms und liest bei einer Änderung die betroffenen Daten aus der Datenbank. Redis und Laravel Broadcasting werden nicht verwendet. MQTT übernimmt in Lokato nur den Eingang, also den Weg von den ESP32-Geräten zum Backend. Die Verteilung an die Client-Verbindungen erfolgt durch Abfragen in festem Takt (Polling).

Gründe für einen Broker in den Prototypen:

- **Prozessgrenze.** Unter PHP-FPM belegt jede SSE-Verbindung einen eigenen Worker-Prozess, und der Empfänger der Ereignisse ist ein weiterer Prozess. Prozesse teilen keinen Speicher, ein Ereignis braucht deshalb einen Weg zwischen ihnen (Datenbank, Cache oder Broker). Ein Node.js-Prozess könnte die Ereignisse dagegen im eigenen Speicher verteilen.
- **Gleicher Weg für alle Zellen.** Unterschiedliche Verteilungswege je Stack, etwa Polling bei PHP und Speicher bei Node.js, würden den Verteilungsweg messen statt Sprache und Laufzeitmodell. Ein gemeinsamer Broker gibt allen Zellen denselben Weg. Das Exposé sieht Redis aus diesem Grund vor („to keep infrastructure variables constant").
- **Push statt Polling.** Polling verzögert jedes Ereignis um bis zu ein Abfrageintervall, bei Lokato bis zu 500 ms, und erzeugt Abfragen pro Verbindung auch ohne neue Ereignisse. Ein Broker stellt sofort zu und entspricht dem ereignisgesteuerten Ansatz, den die Arbeit untersucht (Fowler 2017, Hohpe & Woolf 2003). Für Lokato wäre Push über einen Broker damit die ereignisgesteuerte Weiterentwicklung. Der Ansatz von Lokato wird nicht gemessen, sondern in der Arbeit als Ausgangspunkt beschrieben. Bei wenigen Anzeigen wie im Einsatz von Lokato ist Polling im 500-ms-Takt praktisch ausreichend. Der Unterschied wird bei vielen Clients und bei Anforderungen an sofortige Zustellung relevant.

**Redis statt MQTT als Broker.** Technisch könnte auch der MQTT-Broker die Verteilung übernehmen. Jede Backend-Instanz bzw. jeder PHP-FPM-Worker würde dann das Scan-Topic abonnieren und bei Eingang sofort zustellen. Das wäre ebenso Push und ebenso ereignisgesteuert. MQTT bietet mit den Dienstgüten QoS 1 und 2 zusätzlich Zustellgarantien, die Redis Pub/Sub nicht hat (OASIS MQTT 5.0, 5.17). Redis ist aus zwei Gründen gewählt:

- Die Queue-Zellen benötigen Redis ohnehin (BullMQ setzt Redis voraus, Laravel Queue nutzt es als Treiber). Ein Dienst deckt so Pub/Sub und Queue ab. MQTT kennt keine Job-Semantik wie Wiederholung oder ein Protokoll fehlgeschlagener Jobs.
- Das Exposé legt Redis als Broker fest.

Die Wahl des Brokers ist nicht Gegenstand des Vergleichs, er ist für alle Zellen gleich. MQTT als Verteilweg nennt die Arbeit in der Diskussion als gleichwertige Alternative, etwa für Systeme, die MQTT für den Geräteeingang bereits betreiben und keine Queue brauchen.

Festlegungen:

- Die Ereignisquelle setzt den Zeitstempel `ts` beim Senden. Die gemessene Latenz ist damit Ende-zu-Ende einschließlich der Verarbeitung im Backend. Ein Backend kann zusätzlich `sut_ts` (eigene Sendezeit) setzen. Ausgewertet wird `ts`.
- **Event-Format.** Ein Scan-Event im Originalformat von Lokato (`event`, `device`, `uid`, `timestamp`), ergänzt um die Messfelder `seq` (laufende Nummer, Verlustzählung, 5.17) und `ts`. Größe ca. 140 Byte (5.21).
- Jedes Backend hält **eine** Redis-Subscription pro Prozess und verteilt die Events prozessintern an alle Clients. Eine Subscription pro Verbindung würde Redis zum Engpass machen und die Stacks unterschiedlich stark verzerren. Ausnahme ist PHP-FPM/SSE. Dort ist jeder Worker ein eigener Prozess mit eigener Verbindung. Die Verteilung an alle Clients übernimmt Redis (5.6.2, H8).

### 5.5 PHP-Laufzeitmodell und Betriebsmodus — ENTSCHIEDEN (abgestimmt am 2026-10-16)

SSE läuft über PHP-FPM, WebSockets über einen separaten, langlaufenden Prozess. Durchgehend asynchrones PHP (Octane/Swoole) ist nicht vorgesehen. Gründe, warum PHP-FPM den höheren Vergleichswert hat:

1. **Konstruktvalidität.** PHP-FPM mit einem Worker pro Verbindung ist die Standard-Betriebsart von PHP hinter einem Webserver. Das PHP-Handbuch beschreibt FPM als FastCGI-Implementierung für den Betrieb hinter Webservern, und die Nginx-Beispielkonfiguration der Laravel-Deployment-Dokumentation leitet Anfragen an PHP-FPM weiter (LITERATUR.md). Eine Erhebung zur Verbreitung in der Praxis liegt nicht vor. Die Arbeit formuliert deshalb „Standard-Betriebsart laut Dokumentation", nicht „dominante Betriebsart". Ein Ergebnis mit Octane/Swoole wäre eine Aussage über asynchrones PHP, nicht über PHP in üblicher Betriebsweise.
2. **Sichtbarer Architekturunterschied.** Worker pro Verbindung (PHP-FPM) gegenüber Event Loop (Node.js) ist der Kern des Vergleichs. Beide Seiten asynchron zu bauen, würde genau diesen Unterschied einebnen.
3. **Nähe zum Ausgangsprojekt.** Lokato läuft unter klassischem PHP-FPM.

Umsetzung:

- **PHP/SSE.** PHP-FPM mit `pm = static` und `pm.max_children = 550` (über der Zielzahl von 500 Clients), für `php-minimal` und `php-laravel`.
- **PHP/WS.** Laravel Reverb (`php-laravel`) bzw. Ratchet auf ReactPHP mit asynchronem Redis-Client (`php-minimal`, `ws.php`).
- **Speicher pro Verbindung ist eine Messgröße**, kein Störfaktor. Bei einer lokalen Messung mit 500 SSE-Clients im Produktionsbetrieb (2026-10-16) erreichte das Working Set bei php-laravel/SSE eine Spitze von ca. 1 390 MiB, bei php-minimal/SSE von ca. 375 MiB (Konsequenz für die Limits in 5.10). Nach dem Upgrade auf Laravel 13 (5.23) lag die Spitze in einem kürzeren Prüflauf (10 s Haltezeit) bei ca. 1 010 MiB. Der maßgebliche Wert wird auf dem Pi erhoben.

**Betriebsmodus, Produktion nach offizieller Dokumentation, ohne darüber hinausgehendes Tuning** (beschlossen am 2026-10-16). Die Begründung „PHP in üblicher Betriebsweise" trägt nur, wenn die Stacks auch so konfiguriert sind, wie sie produktiv betrieben werden:

| Stack | Einstellung | Quelle |
|---|---|---|
| PHP allgemein | `php.ini-production` | Dokumentation des offiziellen PHP-Images |
| Laravel | `APP_ENV=production`, `APP_DEBUG=false`, `LOG_LEVEL=warning`. Konfiguration, Routen und Events beim Start gecacht (`docker/start.sh`, kein View-Cache, da keine Views) | Laravel-Deployment-Dokumentation |
| Node.js / Express | `NODE_ENV=production` | Express-Dokumentation (Produktionsbetrieb) |

Für die Fehlersuche ist lokal per `.env` auf Entwicklung umschaltbar. Der Orchestrator protokolliert den Modus jedes Containers in jedem Lauf und bricht Pilot-, Haupt- und Kontrollkampagnen ab, wenn eine Zelle nicht im Produktionsbetrieb läuft. Der Werkzeugvergleich (5.13) wurde dagegen bewusst im Entwicklungsbetrieb durchgeführt, weil Debugging in der Entwicklung stattfindet.

### 5.6 Fairness-Regeln — ENTSCHIEDEN (abgestimmt am 2026-10-16, Auslegung in 5.6.2 geklärt am 2026-10-17)

**Node.js läuft als einzelner Prozess** ohne `cluster`-Modul. Wie PHP-FPM ist das der ökosystemtypische Standardbetrieb ohne gezielte Zusatzoptimierung. Eine Konsequenz ist in der Arbeit zu berichten. Ein Node-Prozess führt JavaScript auf einem Kern aus und kann ein Budget von zwei Kernen strukturell nicht ausschöpfen, PHP-FPM mit mehreren Worker-Prozessen dagegen schon. Gleiches Budget bedeutet gleiche Zuteilung, nicht gleiche Ausschöpfbarkeit. Die tatsächlich genutzte CPU-Zeit wird pro Lauf gemessen (5.16) und macht den Effekt sichtbar.

#### 5.6.1 Einheitliche Topologie, genau ein Nginx pro Zelle

Alle Zellen laufen hinter demselben Front-Nginx (`infra/nginx/`). Er arbeitet je nach Zelle in einem von zwei Modi, sodass jede Zelle genau einen Nginx durchläuft, wie im realen Betrieb:

| Modus | Zellen | Weg |
|---|---|---|
| `http` (`templates/http/`) | Node.js (SSE, WS), php-minimal/WS (Ratchet), php-laravel/WS (Reverb) | Client → Nginx (HTTP-Proxy) → Server |
| `fastcgi` (`templates/fastcgi/`) | PHP-FPM/SSE (php-minimal, php-laravel, php-laravel mit Queue) | Client → Nginx (FastCGI) → PHP-FPM |

Ein früherer Aufbau leitete PHP-FPM über eine zweite Nginx-„Brücke" hinter dem Front-Nginx. Das gab PHP einen Nginx mehr als Node.js und als im realen Betrieb. Die Brücke wurde am 2026-10-16 entfernt.

**Pflicht-Direktiven in beiden Modi.** Keine Pufferung (`proxy_buffering off` bzw. `fastcgi_buffering off`), kein gzip, gleicher Lese-Timeout weit über dem Event-Intervall. Im HTTP-Modus Upgrade-Header für WebSockets (Pfade `/ws` und `/app/` für Reverb). `worker_connections` und Dateideskriptor-Limits mindestens doppelt so hoch wie die Zielzahl der Clients. Die Erreichbarkeit prüft der Orchestrator vor jedem Lauf über `/healthz` (bei PHP-FPM der eingebaute `ping.path` des Pools).

Der Weg eines Events nach Redis unterscheidet sich je Zelle durch die Architektur der Stacks:

| Zelle | Weg nach Redis |
|---|---|
| Node.js, SSE und WS | Redis → Node-Prozess → Nginx → Client |
| php-minimal/WS | Redis → Ratchet-Prozess → Nginx → Client |
| php-laravel/WS | Redis → Listener → HTTP-Aufruf → Reverb → Nginx → Client (Standardweg von Laravel-Broadcasting) |
| PHP-FPM/SSE | Redis (Verteilung an N Abonnenten) → FPM-Worker → Nginx (FastCGI) → Client |
| mit Queue (5.19) | Ereignisquelle → Queue → Worker → Redis Pub/Sub → … wie oben |

#### 5.6.2 Gleiches Ressourcenbudget pro Zelle

Jede Zelle erhält dasselbe CPU- und Speicherbudget (Werte in 5.10). Vergleichseinheit ist die **Zelle**, nicht der Container. Zellen bestehen teils aus mehreren Containern, die jedes Event durchläuft (Reverb und Listener, FPM-Pool und Queue-Worker). Ein Limit pro Container würde diesen Zellen insgesamt mehr Ressourcen zugestehen. Eine lokale Messung am 2026-10-16 zeigt, wie groß dieser Anteil sein kann. Bei php-laravel/WS entfiel in einem Lauf mit 50 Clients der größere Teil der CPU-Zeit auf den Listener (0,064 s gegenüber 0,020 s für Reverb). Ohne gemeinsames Budget liefe dieser Teil unbegrenzt.

Umsetzung:

- Auf dem Pi liegen alle Container einer Zelle in einer gemeinsamen systemd-Slice (`eda_<zelle>.slice`) mit `CPUQuota` und `MemoryMax` (`docker-compose.pi.yml`, `infra/pi/setup-slices.sh`).
- Zusätzlich gilt pro gemessenem Container dasselbe Limit (`x-sut-resources` in `docker-compose.yml`). Lokal ist das die einzige Begrenzung. Lokale Werte dienen nur der Funktionsprüfung.
- SUT-Container nutzen keinen Swap (`memswap_limit` gleich `mem_limit`, auf dem Pi zusätzlich `MemorySwapMax=0`).

**Redis außerhalb des Budgets.** Redis ist gemeinsame Infrastruktur und gehört zu keiner Zelle. Bei PHP-FPM/SSE übernimmt Redis aber die Verteilung an alle Clients (eine Subscription pro Worker), bei allen anderen Zellen der Zellprozess selbst. Damit diese Verlagerung den Vergleich nicht verzerrt, wird Redis in jedem Lauf mitgemessen, und die Ressourcen-Familien der Statistik verwenden den Gesamtverbrauch „Zelle + Redis" (5.8, 5.16). Zelle und Redis werden zusätzlich einzeln berichtet.

**Auslegung der Betreuervorgabe (geklärt am 2026-10-17).** Notiert war „gleiches Budget pro Container", weil die Frage beim Abstimmungstermin von Containern sprach. Gemeint war ein möglichst fairer Vergleich. Da einige Zellen aus mehreren Containern bestehen, ist das Budget pro Zelle die faire Umsetzung.

#### 5.6.3 Nur die Zellen der laufenden Kampagne sind gestartet

Während einer Kampagne laufen ausschließlich die Container der gemessenen Zellen sowie Redis, Front-Nginx, `resource-sampler` und die benötigten Ereignisquellen. Nicht gemessene Zellen sind nicht untätig. Sie halten Redis-Subscriptions, verarbeiten jedes Event mit und belegen Speicher (statische FPM-Pools). Der Orchestrator stoppt deshalb vor Kampagnenbeginn alle übrigen Dienste und startet die benötigten.

Das alternierende Design (5.9) benötigt beide Zellen eines Vergleichs gleichzeitig. Gemessen wird daher **paarweise**, mit einer Kampagne pro geplantem Vergleich und Laststufe (5.15). Die gegenseitige Störung innerhalb eines Paares ist symmetrisch. Da jede Zelle in mehreren Vergleichen vorkommt, wird sie in mehreren Kampagnen gemessen.

### 5.7 Messumfang, Minimal- und Framework-Variante — ENTSCHIEDEN

Gemessen werden beide Varianten pro Sprache:

- **Framework-Variante** (`php-laravel`, `node-express`). Hauptvergleich PHP gegenüber Node.js, nahe am realistischen Einsatz in Lokato.
- **Minimalvariante** (`php-minimal`, `node-minimal`). Baseline ohne Framework. Sie zeigt, ob ein Unterschied von Sprache und Laufzeit kommt oder vom Framework.

Daraus ergeben sich acht Zellen (2 Sprachen × 2 Transportarten × 2 Varianten). In diesen acht Zellen liegt keine Queue im Weg. Der Vergleich Minimal- gegenüber Framework-Variante zeigt damit Framework-Overhead, nicht zusätzlich Queue-Overhead. Die Queue ist eine eigene, dritte Achse mit zwei zusätzlichen Zellen (5.19).

### 5.8 Statistische Auswertung — ENTSCHIEDEN (vor der Datenerhebung festgelegt)

Alle Festlegungen dieses Abschnitts sind vor der Hauptmessung getroffen und in `tools/orchestrate/plan.json` maschinenlesbar fixiert. Testverfahren, Schwellenwerte, Testfamilien und Hypothesen (5.18) werden nicht nachträglich an Ergebnisse angepasst. Die Quellen stehen in LITERATUR.md.

**Analyseeinheit, der k6-Lauf.** Events innerhalb eines Laufs teilen Prozesszustand und Host-Auslastung und sind nicht unabhängig. Sie als Stichprobe zu behandeln, wäre Pseudoreplikation (Hurlbert 1984). Jeder Lauf liefert pro Messgröße einen Wert, verglichen werden diese Werte über die Läufe hinweg.

**Messfenster.** Gewertet werden nur Events nach einer Einschwingzeit von 10 s ab dem Start des Laufs, in der sich die Clients verteilt über die ersten 5 s verbinden, über eine Haltezeit von 60 s (5.9). Der Verbindungsaufbau wird getrennt gemessen.

**Kennzahl pro Lauf, Mittelwert der Latenz.** Die Zeitstempel haben eine Auflösung von 1 ms (Abschnitt 3). Jede einzelne Latenz ist daher ganzzahlig, und auch der Median eines Laufs ist fast immer eine ganze Zahl. Bei niedriger Last liegen beide Zellen eines Vergleichs oft auf demselben Median. Solche Paare haben die Differenz 0 und fallen aus dem Wilcoxon-Test heraus. Im ersten lokalen Probelauf betraf das alle Paare. Der Rundungsfehler pro Event ist dagegen gleichverteilt und im Mittel null, weil Senden und Empfangen nicht im Millisekundentakt erfolgen. Über viele Events mittelt er sich heraus, sodass der Mittelwert pro Lauf fein aufgelöst und unverzerrt ist (Quantisierungsrauschen, Widrow & Kollár 2008). Der Mittelwert reagiert stärker auf Ausreißer als der Median. Das ist vertretbar, weil Ausreißer reale Nutzererfahrung abbilden und die Robustheit des Vergleichs aus dem nichtparametrischen Test über die Läufe hinweg kommt. Median, p95, p99 und Maximum werden zusätzlich beschreibend berichtet, da Tail-Latenzen für Nutzer oft wichtiger sind als der Durchschnitt (Dean & Barroso 2013).

**Deskriptive Kennzahlen** (Vorgabe vom 2026-10-16). Für jede Messgröße und Zelle werden über die Läufe Mittelwert, Minimum, Maximum, Median, p95, p99, Standardabweichung und Varianz ausgegeben.

**Signifikanztest, Wilcoxon-Vorzeichen-Rang-Test** (gepaart, zweiseitig, α = 0,05, Wilcoxon 1945).

- Ein Paar besteht aus den beiden Läufen derselben Laufnummer, die im alternierenden Design (5.9) direkt nacheinander stattfanden. Es zählt nur, wenn beide Läufe gültig sind. Die Paare werden über die Laufnummer gebildet, nicht über die Position in einer Liste. Ein ausgefallener Lauf verschiebt daher keine nachfolgenden Paare.
- Differenzen von exakt 0 werden verworfen (Verfahren nach Wilcoxon).
- Bis 50 Paare ohne Bindungen gilt der exakte p-Wert aus der Nullverteilung, darüber die Normalapproximation mit Stetigkeits- und Bindungskorrektur der Varianz.
- Bleiben weniger als **20** verwertbare Paare, wird der Vergleich als nicht aussagekräftig markiert.
- Ein nichtparametrischer Test ist gewählt, weil Latenzverteilungen rechtsschief und Performance-Messdaten typischerweise nicht normalverteilt sind (Georges et al. 2007, Kalibera & Jones 2013). Eine auf der Normalverteilung beruhende Signifikanzprüfung (Vorschlag vom 2026-10-16) wird deshalb bewusst nicht verwendet. Die Arbeit begründet diese Abweichung. Gegenüber dem ungepaarten Mann-Whitney-U-Test nutzt der gepaarte Test die Paarstruktur des Designs und ist dadurch trennschärfer. Die Tests bleiben zweiseitig, auch wo eine Hypothese eine Richtung erwartet (5.18).

**Effektstärke.** Signifikanz allein sagt nichts über die praktische Größe eines Unterschieds. Bei vielen Wiederholungen wird nahezu jeder Unterschied signifikant (Arcuri & Briand 2014).

- **Cliff's Delta** (Cliff 1993) ist das eingeordnete Effektmaß und das einzige Effektmaß im Text der Arbeit. Die rangbiseriale Korrelation steht nur in den Anhangstabellen und in einem definierenden Satz der Methodik (5.24). Die Schwellen nach Romano et al. (2006) sind vorab festgelegt:

  | \|δ\| | Einordnung |
  | --- | --- |
  | < 0,147 | vernachlässigbar |
  | 0,147 – < 0,33 | klein |
  | 0,33 – < 0,474 | mittel |
  | ≥ 0,474 | groß |

- Zusätzlich wird die **rangbiseriale Korrelation für gepaarte Daten** ausgegeben. r = (W⁺ − W⁻) / (W⁺ + W⁻) (Kerby 2014). Sie ist das zum Wilcoxon-Test passende Effektmaß, da Cliff's Delta die Paarung nicht berücksichtigt.

**Konfidenzintervall.** Das 95-%-Intervall für den Median der gepaarten Differenzen wird per nichtparametrischem Bootstrap bestimmt (Perzentil-Methode, 10 000 Resamples, Efron & Tibshirani 1993). Der Zufallsgenerator startet mit einem festen, im Ergebnis protokollierten Startwert. Jede Neuauswertung liefert dasselbe Intervall.

**Mehrfachtests, Holm-Korrektur je Testfamilie** (Holm 1979). Bei vielen Tests steigt die Wahrscheinlichkeit, dass mindestens einer zufällig signifikant wird (familienweise Fehlerrate). Die Holm-Korrektur kontrolliert diese Rate bei beliebiger Abhängigkeit zwischen den Tests und ist trennschärfer als die Bonferroni-Korrektur. Die Familien sind vorab festgelegt (`plan.json`) und gelten für Block 1 der Hauptmessung (konfirmatorisch, 5.9):

| Familie | Rolle | Tests |
|---|---|---|
| Latenz (Mittelwert pro Lauf) | primär | 13 Vergleiche × 3 Laststufen = 39 |
| CPU-Zeit von Zelle und Redis pro Lauf | sekundär | 39 |
| Spitze des Speicher-Working-Sets von Zelle und Redis pro Lauf | sekundär | 39 |
| Mittlere Dauer des Verbindungsaufbaus pro Lauf (ergänzt am 2026-10-17, vor der Datenerhebung) | sekundär | 39 |

Getrennte Familien für Haupt- und Nebenmessgrößen sind üblich, sofern sie vorab festgelegt sind. Die Korrektur erfolgt über alle Kampagnen hinweg in `tools/orchestrate/evaluate.js`. Geplante, aber nicht gemessene Tests gehen mit p = 1 ein, damit Weglassen die Korrektur nicht abschwächt. Block 2 (Replikation) wird beschreibend gegen Block 1 abgeglichen. Ein Ergebnis gilt als repliziert, wenn die Median-Differenz dieselbe Richtung hat und sich die 95-%-Konfidenzintervalle beider Blöcke überlappen. Die Effektklasse wird zusätzlich berichtet, ist aber keine Bedingung, weil ihre Grenzen grob sind. Der Verbindungsaufbau ist eine eigene Familie, weil H5 sich auf ihn stützt und er den Unterschied zwischen Prozess pro Verbindung und Event Loop beim Verbindungsansturm am direktesten zeigt. Messzeit kostet die Familie nicht, da die Messgröße in jedem Lauf ohnehin erhoben wird. Skalierungsreihe, Sättigungstest und Kontrollmessungen werden nur beschreibend ausgewertet.

**Implementierung.** `tools/orchestrate/stats.js` und `pairing.js`. Die Tests in `tools/orchestrate/test/stats.test.js` prüfen sie gegen von Hand gerechnete Werte, u. a. die exakte Nullverteilung für n = 5 und n = 6, die Bindungskorrektur und die Holm-Schwellen.

**Validitätsrahmen der Gesamtmethodik.** Wohlin et al. (2024).

### 5.9 Versuchsablauf, Phasen und Stichprobengröße — ENTSCHIEDEN (Wiederholungszahlen nach dem Pilot)

**Ablauf eines Laufs** (`tools/orchestrate/run.js`):

- Die Clients verbinden sich gleichmäßig verteilt über die ersten **5 s** der Einschwingzeit. Client n startet nach (n − 1) / Clients · 5 s (`connectSpreadSeconds`, festgelegt am 2026-10-27, Begründung in 5.10). Die ersten **10 s (Einschwingzeit)** werden nicht gewertet, weil die Messung die Zustellung im Normalbetrieb erfassen soll. Danach wird über die **Haltezeit von 60 s** gemessen. Den gleichzeitigen Verbindungsaufbau aller Clients untersucht eine eigene, beschreibende Phase (Ansturm, unten).
- Der **Verbindungsaufbau** wird getrennt erfasst. Dauer bis zum Empfang der Antwort-Header (SSE) bzw. bis zum abgeschlossenen Handshake (WebSocket). Damit der Zeitpunkt bei SSE messbar ist, senden alle SSE-Endpunkte beim Verbindungsaufbau sofort einen SSE-Kommentar (`: connected`). Clients ignorieren Kommentarzeilen. Durch den verteilten Aufbau misst die Größe die Dauer einer einzelnen Verbindung, während laufend weitere Clients hinzukommen, nicht die Wartezeit in einem gleichzeitigen Ansturm.
- In Pilot-, Haupt- und Kontrollkampagnen ist ein Lauf ungültig, wenn sich bis zum Ende der Einschwingzeit nicht alle Clients verbunden haben.
- **Weitere Gründe für ungültige Läufe.** k6-Fehler, keine Events empfangen, Container abgestürzt oder per OOM beendet, fehlgeschlagene Ressourcenmessung, Drosselung des Pi, im Zwei-Rechner-Aufbau eine mittlere Auslastung des Lastgenerators über 80 %.

**Ablauf einer Kampagne:**

- Alternierendes Design A, B, A, B statt Blöcken. Es schützt vor Zeit-Drift (z. B. steigende Temperatur oder Hintergrundlast), die sonst nur eine Konfiguration träfe.
- **Warm-up.** Die ersten 5 Läufe pro Konfiguration gehen nicht in die Auswertung ein (Aufwärmen von JIT und OPcache, Verbindungsaufbau, Dateisystem-Cache, Georges et al. 2007).
- Zufällige Pause von 100–500 ms zwischen den Läufen.
- **Laststufen.** Baseline (10 Clients), Medium (50) und Stress (500), je 1 Event/s.
- **Eine Kampagne pro Vergleich und Laststufe.** Bricht der Dauerbetrieb ab, geht höchstens eine Laststufe verloren.
- Skript, Messgröße und zusätzliche Umgebungsvariablen sind pro Zelle festgelegt (`tools/orchestrate/cells.json`) und pro Kampagne überschreibbar. Damit kann eine Kampagne Zellen mit unterschiedlichen k6-Skripten vergleichen (z. B. `ws-skeleton.js` gegen `ws-reverb.js` in Vergleich 4).
- Übersteigt der Anteil ungültiger Läufe 5 % der gemessenen Läufe einer Konfiguration, bricht die Kampagne ab, da die Ergebnisse dann nicht belastbar sind. In Skalierungs- und Sättigungsreihen sind ausgefallene Läufe dagegen Messergebnisse und kein Abbruchgrund.
- Pro Lauf entsteht ein vollständiges Messprotokoll (5.16).

**Phasen der Messung** (beschlossen am 2026-10-16). Das Zeitfenster umfasst drei bis vier Wochen Dauerbetrieb. Davon entfallen bei den Beispiel-Wiederholungszahlen rund 12 bis 13 Tage auf die reine Messzeit (Belastungstest 1 Tag, Pilot rund 1,6 Tage, Block 1 und Block 2 je rund 4,7 Tage, Skalierung und Sättigung zusammen unter einem Tag). Der Rest ist Puffer für Einrichtung, Wiederholungen nach Abbrüchen und die Auswertung des Pilots.

| Phase | Zweck | Auswertung |
|---|---|---|
| 1. Belastungstest (24 h) | Nachweis, dass Kühlung und Netzteil Dauerlast ohne Drosselung tragen (`infra/pi/burn-in.sh`) | beschreibend |
| 2. Pilot (`phase: pilot`) | Festlegung der Wiederholungszahl je Laststufe | Zwischenstände, nicht konfirmatorisch |
| 3. Block 1 (`phase: main`, `block: 1`) | Hauptmessung aller 39 geplanten Tests | konfirmatorisch, Holm-Korrektur (5.8) |
| 4. Block 2 (`phase: main`, `block: 2`) | vollständige Wiederholung in anderer, zufälliger Reihenfolge | Replikationsabgleich (5.8) |
| 5. Skalierungsreihe (`phase: scaling`) | 10, 50, 100, 250, 500, 750 und 1 000 Clients je Zelle, 1 Event/s, je Stufe 3 Läufe nach 1 Warm-up-Lauf | beschreibend (H4) |
| 6. Sättigungstest (`phase: saturation`) | höchste nachhaltige Event-Rate je Zelle (5.17) | beschreibend |
| 7. Ansturm (`phase: storm`) | alle Clients verbinden sich im selben Moment, je Zelle einzeln mit 500 Clients und 3 Läufen nach 1 Warm-up-Lauf. Unter Aufsicht, nicht im unbeaufsichtigten Zeitplan (5.10) | beschreibend |
| Kontrollmessung, laufend (`phase: control`) | einmal täglich node-minimal/SSE mit 50 Clients und 1 Event/s, 5 Läufe nach 1 Warm-up-Lauf. Macht Drift über die Wochen sichtbar | beschreibend |

**Kriterien der beschreibenden Reihen** (vorab festgelegt, Standardwerte in `tools/orchestrate/run.js`):

- **Kapazitätsgrenze** (Skalierungsreihe, RQ2, H4). Die kleinste Clientzahl, bei der im Median der gültigen Läufe weniger als 99 % der Clients bedient werden (`scaling.minServedRatio`). Wird das Kriterium bis 1 000 Clients nie verfehlt, lautet das Ergebnis „nicht erreicht".
- **Höchste nachhaltige Event-Rate** (Sättigungstest, H11). Die höchste Stufe, bis zu der auf jeder Stufe im Median mindestens 99 % der Events zugestellt werden und die p95-Latenz höchstens 1 000 ms beträgt (5.17).
- **Drift der Kontrollmessung.** Abweichung des Medians der Latenz-Mittelwerte vom ersten Messtag. Ab 20 % warnt `status.js`, die Arbeit berichtet den Verlauf.

`tools/orchestrate/plan-campaigns.js` erzeugt die Kampagnen einer Phase aus `plan.json`, für den Pilot mit einer Auswahl der Vergleiche (`--comparisons`). `tools/orchestrate/schedule.js` arbeitet sie in zufälliger, reproduzierbarer Reihenfolge ab, schiebt die Kontrollmessung ein und setzt nach einem Abbruch an der nächsten unvollständigen Kampagne fort. Da `schedule.js` erledigte Kampagnen am Namen erkennt, erhalten Probeläufe ein eigenes Namenspräfix (`--prefix smoke-`). Andernfalls würde ein Probelauf die gleichnamige Kampagne der echten Phase als erledigt markieren.

**Warum Replikation statt mehr Wiederholungen.** Die Genauigkeit einer Schätzung wächst nur mit der Wurzel der Anzahl. Von 100 auf 400 Paare halbiert sich die Breite des Konfidenzintervalls, von 100 auf 1 000 wird sie nur etwa dreimal schmaler. Sehr große Zahlen machen zudem praktisch bedeutungslose Unterschiede signifikant. Die verfügbare Messzeit wird deshalb in eine vollständige Wiederholung der Hauptmessung (Stabilität der Ergebnisse über die Zeit), eine feinere Skalierungsreihe und eine tägliche Kontrollmessung investiert. Die Messzeit von drei bis vier Wochen ist ausdrücklich gedeckt (Rücksprache mit der Autorin am 2026-10-16).

**Stichprobengröße.** Ohne Daten von der Zielhardware lässt sich die nötige Zahl an Wiederholungen nicht verlässlich vorab bestimmen. Der Betreuer bat zudem darum, auszuweisen, ab wie vielen Wiederholungen sich Unterschiede zeigen (2026-10-16). Ablauf:

1. **Pilot** auf dem Pi mit Zwischenauswertungen alle N Läufe. Ein Vergleich gilt als stabil, wenn sich Vorzeichen und Effektklasse von Cliff's Delta nicht mehr ändern und die Breite des Konfidenzintervalls je weiteren N Läufen um weniger als 10 % abnimmt.
2. **Festlegung** der Wiederholungszahl je Laststufe für Block 1 und Block 2, mit mindestens 20 gültigen Paaren und höchstens so vielen, wie in das Zeitbudget passen. Stabilisiert sich ein Vergleich innerhalb dieser Grenze nicht, wird das als Ergebnis berichtet („Unterschied unterhalb der Auflösung dieses Aufbaus").
3. **Hauptmessung** mit fester Wiederholungszahl. Zwischenauswertungen dienen dort nur der Kontrolle, nicht als Abbruchkriterium. Wiederholtes Testen auf anwachsenden Daten mit Abbruch bei Signifikanz erhöht die Fehlerrate erheblich (Armitage, McPherson & Rowe 1969). Pilotdaten gehen nicht in die konfirmatorische Auswertung ein.

**Verworfener Ausgangsrahmen.** Die Unterlagen zum Abstimmungstermin nannten 800–1 000 (Baseline), 300–500 (Medium) und 100–150 (Stress) Läufe pro Konfiguration. Bei rund 80 s pro Lauf (60 s Haltezeit, 10 s Einschwingzeit, Nebenzeit) und 13 Vergleichen entspräche das rund 29–40 Tagen ununterbrochener Messung allein für einen Block, ohne Replikation (bei der ursprünglichen Planung mit acht Vergleichen 18–25 Tage). Diese Zahlen waren für die Stabilisierung von p99-Werten innerhalb eines Laufs gedacht. Mit dem Lauf als Analyseeinheit genügen erfahrungsgemäß deutlich weniger Paare (Kalibera & Jones 2013). Der Rahmen ist daher verworfen.

### 5.10 Ressourcenlimits — ENTSCHIEDEN (1,5 GiB je Zelle mit verteiltem Verbindungsaufbau, 2026-10-27)

**Endwerte vom 2026-10-22.** **2 CPUs und 1 536 MiB (1,5 GiB) Speicher pro Zelle** (`SUT_CPU_LIMIT=2`, `SUT_MEM_LIMIT=1536m` in `.env`), kein Swap. Grundlage ist der geliehene Raspberry Pi 5 mit 4 GB (2026-10-22). Bis dahin galten 2 GiB als Arbeitswert. Die lokalen Prüfläufe liefen damit.

Der Speicher ist bewusst großzügig bemessen, weil RAM eine gemessene Größe ist und keine Obergrenze, die einzelne Zellen per OOM-Kill aus dem Vergleich entfernt. Das frühere Limit von 512 MiB hätte php-laravel/SSE bei 500 Clients abgebrochen. Im Produktionsbetrieb erreichte diese Zelle lokal eine Spitze von ca. 1 390 MiB (5.5). Unter 2 GiB lief der Stresstest ohne OOM, ohne verlorene Events und mit allen Clients innerhalb der Einschwingzeit verbunden (2026-10-16). Der Abstand zum Limit ist damit kleiner als im früheren Entwicklungsbetrieb (ca. 1 035 MiB) und auf dem Pi erneut zu prüfen. Der Orchestrator wertet jeden Lauf als ungültig, in dem ein Container der Zelle per OOM beendet wurde.

Die Endwerte hängen vom Pi-Modell ab. Ein Pi 5 hat vier Kerne. Bei paarweisen Kampagnen laufen zwei Zellen gleichzeitig. Mit 2 GiB je Zelle sind 8 GB RAM erforderlich.

Begründung des Endwerts für den Pi 5 mit 4 GB (festgelegt 2026-10-22, vorbereitet am 2026-10-19). **1,5 GiB je Zelle**. Zwei Limits von 1,5 GiB und rund 0,6 GiB für Betriebssystem, Docker, Redis, Nginx und `resource-sampler` bleiben unter 4 GB, sodass das Budget ohne Swap tatsächlich verfügbar ist. Die lokal gemessenen Spitzen (Working Set von Zelle und Redis) liegen darunter, bei 500 Clients 1 030 MiB für php-laravel-sse, 1 056 MiB für php-laravel-sse-queue (Laravel 13, 2026-10-16) und 391 MiB für php-minimal-sse. Diese lokalen Werte stammen noch von PHP 8.4 und Laravel 13.34, der Probelauf auf dem Pi prüft die Spitze mit den Versionen aus 5.26. Eine ruhende Zelle belegt bis etwa 340 MiB. Oberhalb von 550 Clients wächst PHP-FPM nicht weiter, weil keine weiteren Worker entstehen. Der Wert wird im Probelauf auf dem Pi mit der Stress-Stufe geprüft, bevor der Pilot beginnt. Ein Unsicherheitsfaktor ist die Seitengröße. Raspberry Pi OS verwendet auf dem Pi 5 standardmäßig einen Kernel mit 16-KB-Speicherseiten (`kernel_2712.img`), die lokalen Werte stammen von einem Kernel mit 4-KB-Seiten. Viele kleine Prozesse wie die 550 FPM-Worker können dadurch mehr Speicher belegen. Reicht der Abstand im Probelauf nicht, wird mit `kernel=kernel8.img` in `config.txt` der Kernel mit 4-KB-Seiten gewählt und in der Arbeit genannt. Die Kerne bleiben bei zwei je Zelle, weil auch der 4-GB-Pi vier Kerne hat.

**Probelauf auf dem Pi (2026-10-27).** Mit 1,5 GiB je Zelle scheitert php-laravel-sse bei 500 Clients. Die folgenden Prüfungen grenzen die Ursache ein. Ein Einzeltest bedeutet, dass nur diese Zelle lief, mit einem Lauf ohne Warm-up, 10 s Einschwingzeit und 10 s Haltezeit. Ab dem ersten Einzeltest gelten die Versionen aus 5.26. Die Ergebnisverzeichnisse (`…_probe16k-…`, `…_probe4k-…`, `…_probe3gb-…`, `…_probe2g-…`) liegen noch auf dem Lastgenerator.

| Prüfung | Seitengröße | Limit je Zelle | Ergebnis bei 500 Clients |
|---|---|---|---|
| zweiter Probelauf, Vergleich 10, noch mit PHP 8.4 und Laravel 13.34 | 16 KB | 1,5 GiB | Verbindungsaufbau rund 39 s, Fehlerseiten von Nginx statt Ereignisstrom, Sampler ohne Antwort, Queue-Worker beendet, Pi per ssh kaum erreichbar. Kampagne abgebrochen |
| Einzeltest php-laravel-sse | 16 KB | 1,5 GiB | 8 Prozesse wegen Speichermangels beendet, Spitze 1 543 MiB, Verbindungsaufbau 4,3 s, mittlere Latenz rund 3 s, 98,8 % der Clients bedient. Lauf ungültig |
| Einzeltest php-laravel-sse | 4 KB | 1,5 GiB | 72 Prozesse beendet, Spitze 1 536 MiB, Verbindungsaufbau 32 s, kein Client bedient |
| Einzeltest php-laravel-sse | 4 KB | 3 GiB | gültig, alle Clients bedient, Verbindungsaufbau 3,0 s, mittlere Latenz 11 ms, Working Set im Mittel 1 046 MiB, gemessene Spitze 1 150 MiB |
| Vergleich 10, beide Laravel-Zellen | 4 KB | 2 GiB | im ersten Lauf nur 364 von 500 Clients rechtzeitig verbunden (Verbindungsaufbau 17 s), beim zweiten Lauf Sampler ohne Antwort, danach Neustart des Pi |

Hinweise zur Messung. Ein erster Versuch mit 3 GiB scheiterte, weil nur der Topf der Zelle angehoben war. Jeder Container hat zusätzlich ein eigenes Limit in Höhe des Budgets (`mem_limit`). Die gemessene Spitze von 1 150 MiB stammt aus der Abtastung alle 250 ms und unterschätzt kurze Spitzen. Dass die Zelle bei 1,5 GiB per OOM abbricht, zeigt, dass der Bedarf beim gleichzeitigen Verbindungsaufbau aller Clients kurzzeitig darüber liegt. Die Zähler eines Topfes (`memory.events`, `memory.peak`) gelten seit seiner Entstehung, für einen einzelnen Lauf sind nur die Werte des Containers verlässlich. Das Systemprotokoll des abgestürzten Starts ging verloren, weil Raspberry Pi OS es nur im Arbeitsspeicher hielt. Seitdem wird es dauerhaft gespeichert (5.20).

**Folgerung.** 1,5 GiB reichen für php-laravel-sse und php-laravel-sse-queue bei 500 Clients nicht. Ein Limit, das eine Zelle per OOM-Kill aus dem Vergleich entfernt, widerspricht dem Grundsatz oben, denn der Speicher ist eine Messgröße. Betroffen wären auf der Stress-Stufe die Vergleiche 3, 7, 10 und 11, darunter mit Vergleich 3 ein Kernvergleich (5.24). Die Seitengröße ist nicht die Hauptursache, die Zelle scheitert mit beiden. Mehr als 1,5 GiB lassen sich auf dem 4-GB-Pi nicht vergeben, weil bei jedem Vergleich zwei Zellen nebeneinander laufen.

**Möglichkeiten** (bewertet am 2026-10-27):

1. **Pi 5 mit 8 GB und 3 GiB je Zelle.** Zwei Zellen mit vollem Budget und 0,6 GiB Reserve brauchen 6,6 GB und passen in 8 GB. Der Versuchsaufbau bleibt unverändert, die Einrichtung auf der Festplatte ist weiter nutzbar. Zunächst bevorzugt, durch die Entscheidung für Möglichkeit 5 nicht mehr nötig.
2. **Oberste Laststufe 250 Clients für alle Zellen.** Möglich auf dem 4-GB-Pi. Der untersuchte Unterschied zwischen einem Prozess pro Verbindung und einer Event Loop zeigt sich aber vor allem bei vielen gleichzeitigen Verbindungen, und PHP-FPM bliebe weit unter seiner Grenze von 550 Workern. In der Skalierungsreihe würde Laravel unterhalb von 500 Clients am Speicherbudget scheitern statt an der Zahl seiner Worker. Die Reihe zeigte dann eine Grenze der Testhardware statt des Mechanismus aus H4.
3. **Immer nur eine Zelle auf dem Pi, mit 3 GiB.** Möglich auf dem 4-GB-Pi, gibt aber den Wechsel A/B innerhalb einer Kampagne auf. Jede Zelle müsste vor ihrem Lauf neu starten und bräuchte jedes Mal einen Warm-up-Lauf. Die Messzeit stiege deutlich, und Drift ließe sich schlechter ausgleichen (5.9).
4. **Niedrigere Stress-Stufe nur für Vergleiche mit Laravel/SSE.** Hält die übrigen Vergleiche bei 500 Clients, misst aber Vergleich 3 auf einer anderen Laststufe als die Vergleiche 1, 2 und 4. Die Sprachvergleiche wären untereinander nicht mehr vergleichbar.
5. **Gestaffelter Verbindungsaufbau.** Die Clients verbinden sich nicht alle im selben Moment, sondern verteilt über die ersten Sekunden der Einschwingzeit. Der Bedarf läge dann vermutlich nahe am gemessenen Mittel von rund 1 050 MiB statt bei der kurzen Spitze über 1,5 GiB, und das Budget von 1,5 GiB könnte auf dem 4-GB-Pi reichen. Das gilt für alle Zellen gleich und entspricht eher dem üblichen Betrieb, in dem Clients nacheinander kommen. Es ändert aber die Bedeutung des gemessenen Verbindungsaufbaus, der bisher bewusst den gleichzeitigen Ansturm erfasst (5.9). Umgesetzt ist die Möglichkeit als Kampagneneinstellung `connectSpreadSeconds`. Ein lokaler Vergleich (2026-10-27, je ein Lauf mit 500 Clients) bestätigt die Vermutung. Die echte Spitze des Containers von php-laravel-sse sank von 1 350 MiB bei gleichzeitigem Aufbau auf 1 052 MiB bei einem über 5 s verteilten Aufbau, der mittlere Verbindungsaufbau von 6,8 s auf 1,1 s. Der Sampler hatte bei gleichzeitigem Aufbau lokal nur rund 1 020 MiB erfasst, er unterschätzt die Spitze also um etwa 300 MiB. Gewählt, Begründung und Prüfung auf dem Pi unten.

Verworfen sind ein höheres Budget nur für Laravel (verletzt 5.6.2), weniger PHP-FPM-Worker (verändert das gemessene Laufzeitmodell, 5.5), Swap (verzerrt Latenz und Speicher) und Messungen auf dem Laptop. Dagegen sprechen die Vorgabe des Betreuers für einen Pi (5.14), fehlende Root-Rechte auf dem Laptop und die Drosselung von Laptop-Prozessoren bei Hitze.

**Seitengröße.** Nach der Regel oben läuft der Pi seit 2026-10-27 mit dem Kernel mit 4-KB-Seiten (`kernel=kernel8.img`, Kernel `6.18.50+rpt-rpi-v8`). Allein löst das den Speichermangel nicht. Der Kernel bleibt trotzdem, weil 4 KB die übliche Seitengröße von Servern ist und alle Zellen gleich betrifft (5.20). `setup.sh` stellt ihn auf einem neuen Pi selbst ein.

**Entscheidung (2026-10-27).** Gewählt ist Möglichkeit 5. Die Clients verbinden sich in allen Messphasen gleichmäßig verteilt über die ersten 5 s der Einschwingzeit (5.9). Budget (2 CPUs, 1,5 GiB), Laststufen, Hypothesen und der Kernel mit 4-KB-Seiten bleiben unverändert. Ausschlaggebend ist nicht der Speicher des Pi, sondern die Gültigkeit der Messung.

- **Die Messung erfasst den Normalbetrieb.** Die Einschwingzeit soll laut 5.9 den Verbindungsansturm von der Zustellung im Normalbetrieb trennen. Der gleichzeitige Aufbau dauerte aber auf dem Pi 3 bis 32 s und lokal 6,8 s. Er füllte die Einschwingzeit oder reichte darüber hinaus. Verteilt sind alle Clients nach etwa 5 s verbunden, und vor dem Messfenster bleiben mindestens 5 s ohne neue Verbindungen.
- **Die Speicherspitze misst den Bedarf offener Verbindungen.** H1 und H10 vergleichen, wie viel Speicher eine Architektur für 500 offene Verbindungen braucht. Beim gleichzeitigen Aufbau bestimmt ein kurzer Sonderzustand aus 500 gleichzeitigen Laravel-Starts die Spitze, und die Abtastung alle 250 ms erfasst ihn unzuverlässig. Lokal lag die echte Spitze bei 1 350 MiB, abgetastet wurden rund 1 020 MiB. Verteilt liegt die Spitze nahe am Dauerzustand.
- **Die Skalierungsreihe zeigt den Mechanismus aus H4.** Beim gleichzeitigen Aufbau scheitert Laravel schon unterhalb von 500 Clients am Speicherbudget. Verteilt bleibt die Zelle auch mit 550 Prozessen im Budget, und ab 551 Clients greift die erwartete Grenze der Worker-Zahl.
- **Der Effekt hängt nicht vom Pi ab.** Auch lokal auf einem deutlich schnelleren Rechner senkte die Verteilung die Spitze um rund 300 MiB und den Verbindungsaufbau von 6,8 auf 1,1 s.
- **Gleich für alle Zellen und vor dem Pilot festgelegt.** Alle Varianten erhalten denselben Ankunftsverlauf. Die Hypothesen bleiben wörtlich gleich, und die Änderung stützt sich nur auf Daten zur Machbarkeit, nicht auf Ergebnisse zu Hypothesen.
- **Der Wert 5 s.** Die Hälfte der Einschwingzeit bleibt ohne neue Verbindungen. 100 Verbindungen pro Sekunde bei 500 Clients liegen unter dem Durchsatz der langsamsten Zelle auf dem Pi, die mit genug Speicher 500 Verbindungen in 3 s aufbaute, also rund 170 pro Sekunde. Gemessen werden damit die Kosten einer Verbindung, keine Warteschlange.

Der gleichzeitige Ansturm ist selbst ein realer Fall. Nach einem Neustart des Servers verbinden sich alle Browser über EventSource automatisch neu (WHATWG Server-Sent Events). Er wird deshalb in einer eigenen, beschreibenden Phase gemessen (`phase: storm`, 5.9), jede Zelle einzeln mit 500 Clients, die sich im selben Moment verbinden. Das Ergebnis zeigt, welche Varianten einen solchen Ansturm im Budget überstehen, und fließt in die Entscheidungshilfe der Arbeit ein. Zusätzlich erfasst der Sampler in jedem Lauf die exakte Speicherspitze des Kernels (`memory.peak`, 5.16), damit kurze Spitzen nicht von der Abtastung abhängen.

**Prüfung auf dem Pi** (2026-10-27, Budget 1,5 GiB, 4-KB-Seiten, Verteilung über 5 s):

| Prüfung | Ergebnis |
|---|---|
| php-laravel-sse allein, 500 Clients | gültig, echte Spitze des Containers 1 084 MiB, kein Prozess wegen Speichermangels beendet |
| Vergleich 10 mit beiden Laravel-Zellen, alle drei Laststufen | alle Läufe gültig, bei 500 Clients alle Clients bedient, mittlere Latenz rund 10 ms, Verbindungsaufbau rund 7 ms. Echte Spitzen 1 061 MiB (php-laravel-sse) und 1 057 MiB (php-laravel-sse-queue), freier Arbeitsspeicher des Pi mindestens 1,4 GB |

Lokal liefen außerdem der Ansturm-Test und Vergleich 3 bei 500 Clients mit dem neuen Standard ohne ungültige Läufe. Die Spitze von php-laravel-sse lag laut Kernel bei 1 330 MiB im Ansturm und bei 1 131 MiB mit verteiltem Aufbau.

### 5.11 Apache-Vergleich — ENTFÄLLT (5.1)

Kein Apache-Messaufbau. Die Arbeit diskutiert den Vergleich literaturgestützt. Für eine spätere empirische Prüfung wäre Apache mit `mod_proxy_fcgi` vor demselben PHP-FPM-Backend zu betreiben, sodass ausschließlich der Webserver variiert.

### 5.12 HTTP/2-Messung — ENTFÄLLT (5.2)

Kein zweiter Nginx-Server-Block mit TLS und HTTP/2. Die Arbeit diskutiert den Unterschied. Ob k6 und xk6-sse HTTP/2 aushandeln würden, ist ungeprüft.

### 5.13 Debugging- und Monitoring-Vergleich, Ergebnisse — DURCHGEFÜHRT (2026-08-25)

Die Kriterien aus 5.3 wurden gegen den bestehenden Code geprüft, im Entwicklungsbetrieb, da Debugging in der Entwicklung stattfindet. Der Experimentcode lag nur temporär vor. Die Prototypen sind unverändert.

**1. Tooling:**

| | PHP | Node.js |
| - | --- | ---- |
| Schritt-Debugger | Xdebug, separate PECL-Erweiterung, nicht in PHP enthalten (xdebug.org/docs/install) | im Node-Kern enthalten (`--inspect`, V8 Inspector / Chrome-DevTools-Protokoll, nodejs.org/api/debugger.html) |
| Profiler | Xdebug-Profiling oder externe APM-Werkzeuge (Blackfire, Tideways), ebenfalls Zusatzinstallation | `--prof` / `--cpu-prof`, im Node-Kern enthalten |
| Strukturiertes Logging | in Laravel enthalten (Monolog), in php-minimal nicht vorhanden | in keiner Node-Variante enthalten (auch nicht in Express). Zusatzbibliothek nötig (z. B. pino, winston) |

**Befund.** Debugger und Profiler sind bei Node.js ohne Zusatzinstallation nutzbar, bei PHP nicht. Das ist ein Sprachunterschied. Strukturiertes Logging trennt dagegen eher Framework- und Minimalvariante als PHP und Node.js (Laravel bringt es mit, Express nicht). Die Arbeit sollte Sprach- und Framework-Frage an dieser Stelle getrennt behandeln.

**2. Correlation-ID über die Queue-Grenze.** Geprüft wurden die Pfade mit Queue-Grenze, also `node-express/queue/` (BullMQ) sowie `ProcessScanEvent.php` und `DispatchTestScanCommand.php` (Laravel Queue). Eine Correlation-ID im Event-Payload durchzureichen, kostet in beiden Stacks keine zusätzliche Zeile, da beide Pipelines das vollständige Datenobjekt weiterreichen (`{...job.data, …}` bzw. `[...$this->payload, …]`). Die ursprünglich geplante Kennzahl „Anzahl Änderungen zum Durchreichen" ist für beide Stacks null und unterscheidet sie nicht. Der unterschiedliche Aufwand liegt im Sichtbarmachen der ID im Fehlerfall (Punkt 3).

**3. Fehlersichtbarkeit in Queue-Workern**, geprüft mit einem absichtlich fehlschlagenden Job (`correlation_id="corr-test-abc123"`):

- *BullMQ (Node.js).* Der vorhandene `worker.on('failed', …)`-Handler protokolliert Job-ID, Fehlermeldung und Stacktrace, nicht aber die Correlation-ID. Diese ist jedoch programmatisch abrufbar. `queue.getFailed()` liefert die vollständigen Job-Daten einschließlich `correlation_id`, dauerhaft in Redis gespeichert und ohne Zusatzkonfiguration. Für die Ausgabe im Log genügt die Änderung einer bestehenden Zeile (`job.data` im vorhandenen `console.error`-Aufruf).
- *Laravel Queue.* `queue:work` zeigt in der Konsole nur `... FAIL`, ohne Fehlermeldung oder ID. Das Standard-Fehlerprotokoll (Tabelle `failed_jobs`, `DatabaseUuidFailedJobProvider`) ist im damals verwendeten Laravel-12-Starter-Kit nicht sofort funktionsfähig. Die Migration für `failed_jobs` gehört nicht zu den Standard-Migrationen, und in der gewählten Konfiguration existiert keine SQLite-Datenbankdatei (`CACHE_STORE=file` und `SESSION_DRIVER=cookie` vermeiden SQLite bewusst im SSE-Pfad). Der Versuch, den fehlgeschlagenen Job zu protokollieren, scheitert daher mit einer zweiten Exception (`SQLiteDatabaseDoesNotExistException`), die die eigentliche Fehlermeldung verdeckt. Die Correlation-ID erscheint nur als Nebeneffekt im serialisierten Datenblock in `storage/logs/laravel.log`. Abhilfe. `php artisan queue:failed-table` mit funktionierender Datenbank (Betriebsschritt) oder eine `failed()`-Methode in der Job-Klasse (Laravels vorgesehener Hook, ca. drei Zeilen mit `Log::error(...)` und `$this->payload`).

Wiederholung unter Laravel 13.34.0 (2026-10-17, Produktionsbetrieb, Fehler nur im laufenden Prüf-Container eingebaut). Gleiches Ergebnis. `queue:work` meldet nur `FAIL`. Das Protokollieren des fehlgeschlagenen Jobs scheitert an der fehlenden SQLite-Datenbank (`QueryException`), und `queue:failed` bricht mit derselben Meldung ab. Die eigentliche Fehlermeldung und die Correlation-ID stehen nur im Kontext dieses Folgefehlers in `storage/logs/laravel.log`. Der Befund gilt damit für die gemessene Version.

Wiederholung der übrigen Punkte mit den gemessenen Versionen (2026-10-18, eigene Prüf-Queue, Prototypen unverändert). Unter BullMQ 5.81.2 und Node.js 22.11.0 meldet derselbe `failed`-Handler Job-ID und Fehlermeldung ohne Correlation-ID. `queue.getFailed()` liefert den Job mit `correlation_id`, Fehlergrund und Zahl der Versuche. Node.js 22.11.0 enthält `--inspect`, `--prof` und `--cpu-prof`. Im PHP-8.4-Image der Prototypen ist kein Xdebug installiert, Laravel 13 bringt Monolog 3.10 mit. Der gesamte Werkzeugvergleich galt damit für die damals festgelegten Versionen.

Wiederholung mit den Versionen aus 5.26 (2026-10-27, `results/2026-10-27_version-update/`). Unter BullMQ 6.3.14 mit ioredis 6.0.0 und Node.js 26.11.1 meldet der `failed`-Handler weiterhin Job-ID und Fehlermeldung ohne Correlation-ID, und `queue.getFailed()` liefert den Job mit `correlation_id`, Fehlergrund und Zahl der Versuche. Node.js 26.11.1 enthält `--inspect`, `--prof` und `--cpu-prof`. Im Image mit PHP 8.5.11 ist kein Xdebug installiert, Laravel 13.36.0 bringt Monolog 3.12.1 mit. Unter Laravel 13.36.0 meldet `queue:work` weiterhin nur `FAIL`, das Protokollieren scheitert an der fehlenden SQLite-Datenbank, und die Correlation-ID steht nur im Kontext dieses Folgefehlers in `storage/logs/laravel.log`. Der Werkzeugvergleich gilt damit auch für die gemessenen Versionen.

**Einordnung.** BullMQ bietet Fehlersichtbarkeit ohne zusätzliche Infrastruktur (Redis-natives Failed-Set). Laravels Standardmechanismus setzt eine eingerichtete Datenbank voraus, die in einem schlanken, datenbankfreien Aufbau nicht automatisch vorhanden ist. Das ist ein Unterschied im Betriebsaufwand, kein Fehler in Laravel.

### 5.14 Testumgebung, Raspberry Pi mit separatem Lastgenerator — ENTSCHIEDEN (Hardware im Einsatz seit 2026-10-22)

**Vorgabe vom 2026-10-16.** Die Messungen laufen auf einem selbst aufgesetzten Raspberry Pi. Erwogen wurden auch mehrere Pis für unterschiedliche Vergleiche.

**Aufbau.** Ein Pi ist reiner Testserver (Redis, Front-Nginx, die Zellen der laufenden Kampagne, `resource-sampler`). k6, die Ereignisquellen und der Orchestrator laufen auf einem separaten Lastgenerator, der per Kabel verbunden ist. Die Einrichtung beschreibt `infra/pi/README.md`.

Begründung:

- **Kein Engpass durch das Lastwerkzeug.** Ein Pi hat vier Kerne, das Budget einer Zelle beträgt zwei. Auf den übrigen Kernen müssten k6 (bei 500 und mehr Clients rechenintensiv), Ereignisquellen, Redis und Nginx laufen. Bei der Stress-Stufe würde dann die Grenze des Werkzeugs gemessen statt die des Systems. Die Auslastung des Lastgenerators wird in jedem Lauf gemessen. Liegt sie im Mittel über 80 %, ist der Lauf ungültig.
- **Eine Uhr für beide Zeitstempel.** Sendezeitstempel (Ereignisquelle) und Empfangszeitpunkt (k6) stammen beide vom Lastgenerator, eine Synchronisation zwischen Geräten ist nicht nötig. NTP erreicht typischerweise nur Genauigkeiten im Millisekundenbereich (RFC 5905), was bei Latenzen im einstelligen Millisekundenbereich nicht ausreichen würde. Die Netzwerkstrecke ist in jeder Latenz enthalten, für alle Zellen gleich und verzerrt den Vergleich nicht.
- **Identische Hardware für alle Zellen.** Alle Kampagnen laufen nacheinander auf demselben Pi.

Mehrere Pis parallel (je ein Vergleichspaar pro Gerät) wurden verworfen. Zwei Geräte desselben Modells unterscheiden sich in Fertigungsstreuung, Kühlung und Speichermedium. Gepaarte Vergleiche auf demselben Gerät blieben zwar gültig, Gegenüberstellungen über Geräte hinweg (z. B. Skalierungsverläufe aller Zellen) enthielten aber den Hardwareunterschied.

**Hardware** (Bedarf an den Betreuer gemeldet am 2026-10-16). Gemeldet wurden ein Raspberry Pi 5 mit 8 GB RAM, aktivem Kühler, offiziellem 27-W-Netzteil und SSD statt SD-Karte sowie ein Lastgenerator mit Linux, mindestens vier Kernen und 8 GB RAM (ein zweiter Pi 5 könnte bei 1 000 Clients selbst zum Engpass werden). Dazu kamen ein kabelgebundenes, getrenntes Messnetz und optional eine USV.

**Eingesetzte Hardware** (vom Betreuer geliehen, erhalten am 2026-10-22):

| Rolle | Gerät |
|---|---|
| Testserver | Raspberry Pi 5 mit 4 GB RAM, Gehäuse mit Kühler, offizielles 27-W-Netzteil. Raspberry Pi OS Lite 64 Bit (Debian 13 „trixie"), gestartet von einer 1,8-TB-USB-Festplatte (2,5 Zoll, Strom über USB) |
| Lastgenerator | Laptop mit Intel Core i7-9750H (6 Kerne, 12 Threads) und 32 GB RAM, Debian Testing („forky"), Node.js 24. Docker 29.9.2 mit Compose 5.6.1 wie auf dem Pi, aus der Docker-Paketquelle für Debian 13, weil es für Debian Testing keine eigene gibt |
| Netz | Gigabit-Switch (ein Uplink, vier Anschlüsse), zwei LAN-Kabel. Messnetz 192.168.50.0/24 mit fester Adresse 192.168.50.20 für den Laptop und 192.168.50.10 für den Pi |

Abweichungen von der Bedarfsmeldung und ihre Behandlung:

- **4 statt 8 GB RAM.** Budget 1,5 GiB je Zelle. Mit gleichzeitigem Verbindungsaufbau reichte das für Laravel/SSE bei 500 Clients nicht, mit verteiltem Aufbau reicht es mit rund 30 % Abstand (5.10).
- **USB-Festplatte statt SSD.** Ausreichend, weil auf dem Pi während der Messung wenig geschrieben wird. Die Container-Logs sind begrenzt (Log-Rotation), die Ergebnisdateien schreibt der Orchestrator auf dem Lastgenerator. Wie eine SSD vermeidet die Festplatte den Verschleiß einer SD-Karte. Eine Festplatte, die im Leerlauf den Motor abschaltet, könnte einzelne Schreibzugriffe um Sekunden verzögern. Der Probelauf zeigt, ob das auftritt.
- **Node.js 24 statt 22 auf dem Lastgenerator.** Node.js läuft dort nur für den Orchestrator. Tests und Kampagnenplanung sind mit Node.js 24 geprüft (2026-10-22). Die Prototypen behalten ihre Version im Container.
- **Messnetz mit zwei Kabeln (geplant).** Für die Einrichtung hängt der Switch am Router. Für die Messung hängen nur Pi und Lastgenerator am Switch, beide mit fester Adresse. Der Lastgenerator erreicht das Internet dann nur noch über WLAN, für die Benachrichtigungen. Der Messverkehr läuft ausschließlich über das Kabel.

**Erste Erprobung auf dem Pi (2026-10-22).** `setup.sh` lief nach einem Neustart mit Exit-Code 0, und alle Images ließen sich auf dem Pi bauen. Der Sampler meldet den memory-Controller, den Governor `performance` und keinen Swap. Den Drosselstatus der Firmware stellt der Pi 5 mit Kernel 6.18 nicht in sysfs bereit, der Sampler im Container kann ihn daher nicht lesen. Der Orchestrator liest ihn stattdessen per ssh mit `vcgencmd get_throttled` direkt vor und nach jeder Messung, wie es auch der Belastungstest tut. Ist der Status auf dem Pi nicht lesbar, bricht die Vorabprüfung ab, und ein betroffener Lauf gilt als ungültig (`host_throttle_unknown`).

**Alle Zellen auf dem Pi gestartet (2026-10-23).** Alle zehn Zellen liefen gleichzeitig ohne Neustarts, auch Redis und PHP-FPM mit dem Kernel mit 16-KB-Seiten. Das Working Set im Leerlauf betrug 328 MiB für php-laravel-sse, 359 MiB für php-laravel-sse-queue und 330 MiB für php-minimal-sse, bei allen übrigen Zellen weniger als 100 MiB. Das entspricht den lokalen Werten mit 4-KB-Seiten (bis etwa 340 MiB, 5.10). Die Spitze unter Last zeigt erst der Probelauf. Ein Durchlauf von der Ereignisquelle über Redis und den Front-Nginx bis zu einem SSE-Client lieferte ein Event pro Sekunde.

**Belastungstest bestanden (2026-10-22 bis 2026-10-23).** Alle vier Kerne liefen 24 Stunden unter Volllast (`infra/pi/burn-in.sh`), protokolliert wurde jede Minute, insgesamt 1 440 Messpunkte. Der Takt lag durchgehend bei 2 400 MHz. Die Temperatur erreichte höchstens 67,2 °C, im Mittel 64,4 °C. Der Drosselstatus war bei jedem Messpunkt `0x0`, es traten also weder Unterspannung noch Taktbegrenzung oder thermische Drosselung auf. Kühlung und Netzteil tragen die Dauerlast damit auch mit der über USB versorgten Festplatte. Die Rohdaten liegen in `results/2026-10-22T13-43-23Z_burn-in.csv`.

**Probeläufe mit beiden Rechnern (2026-10-27).** Der erste Probelauf war vollständig ungültig, weil die Adresse des Pi in `sut.pi.json` mit einem Schrägstrich endete (Änderungsverlauf). Im zweiten Probelauf liefen fünf von neun Kampagnen vollständig durch. Damit sind die ssh-Steuerung, die veröffentlichten Ports, die cgroup-Töpfe, der Drosselstatus per `vcgencmd` und die Messung der Auslastung des Lastgenerators auf echter Hardware bestätigt. Die Temperatur des Pi lag bei höchstens 55 °C, die Auslastung des Lastgenerators bei höchstens 15 %. Gescheitert ist zunächst nur Laravel/SSE bei 500 Clients am Speicherbudget, solange sich alle Clients gleichzeitig verbanden. Mit verteiltem Verbindungsaufbau liefen beide Laravel-Zellen fehlerfrei (5.10). Bei einem Prüflauf mit 2 GiB je Zelle startete der Pi neu, die Ursache ist nicht protokolliert. Offen ist noch ein Test mit gleichzeitiger CPU- und Schreiblast, der ausschließt, dass die über USB versorgte Festplatte unter Last den Strom verliert (Abschnitt 6).

Bekannte Risiken auf dem Pi und ihre Behandlung:

| Risiko | Behandlung |
|---|---|
| fehlerhafte oder unvollständige Einrichtung des Pi | Einrichtungsskript `infra/pi/setup.sh` (wiederholbar, mit Zusammenfassung offener Punkte). Vorabprüfung jeder Kampagne. Probelauf mit eigenem Namenspräfix vor dem Pilot |
| memory-cgroup unter Raspberry Pi OS ggf. deaktiviert, Speicherlimits dann wirkungslos | Boot-Parameter (`infra/pi/setup.sh`). Die Vorabprüfung bricht ab, wenn der Controller fehlt |
| thermische Drosselung bei Dauerlast | aktive Kühlung. 24-h-Belastungstest vor dem Pilot. Temperatur und Drosselstatus pro Lauf protokolliert. Gedrosselte Läufe sind ungültig |
| Taktanpassung (CPU-Governor) erzeugt Rauschen | Governor fest auf `performance` (`infra/pi/cpu-performance.service`), Vorabprüfung |
| Swap verzerrt Speicher- und Latenzmessung | Swap abgeschaltet, Vorabprüfung |
| Ausfall der SD-Karte bei wochenlangem Schreiben | System auf einer USB-Festplatte statt einer SD-Karte |
| Container-Logs und Ergebnisse füllen über Wochen den Datenträger | Log-Rotation in `docker-compose.yml`. `status.js` warnt unter 10 % freiem Platz auf beiden Geräten |
| automatische Updates ändern mitten in der Messung Docker oder Kernel | automatische Updates abgeschaltet. Versionen in jedem Lauf protokolliert |
| Stromausfall oder Absturz | Kampagnen pro Laststufe, Fortsetzen über `schedule.js`. Optional USV |
| Abbruch oder Stillstand bleibt im unbeaufsichtigten Betrieb tagelang unbemerkt | `tools/orchestrate/status.js` (Fortschritt, ungültige Läufe, Temperatur, Drift der Kontrollmessung, Speicherplatz) als stündlicher cron-Job. Optionale Benachrichtigung über `NOTIFY_URL` bei Warnungen, abgebrochenen Kampagnen und am Ende des Zeitplans. Die Nachrichten enthalten keine Messwerte, Adressen oder Schlüssel |
| ARM64-Kompatibilität | alle Basis-Images multi-arch, geprüft am 2026-10-16 |
| Speicherbedarf einer Zelle übersteigt das Budget | Probelauf mit der Stress-Stufe vor dem Pilot, verteilter Verbindungsaufbau, exakte Spitze laut Kernel je Lauf, Läufe mit Abbruch wegen Speichermangels sind ungültig (5.10) |
| Absturz des Pi ohne erkennbare Ursache | Systemprotokoll dauerhaft gespeichert (5.20) |

**Stand.** Der Zwei-Rechner-Aufbau ist auf dem Pi erprobt, und das Budget ist mit verteiltem Verbindungsaufbau bestätigt (2026-10-27, 5.10). Vor dem Pilot stehen noch die Punkte in Abschnitt 6 aus.

### 5.15 Geplante Vergleiche — ENTSCHIEDEN

Geplant sind dreizehn Vergleiche, nicht alle möglichen Paare der zehn Zellen. Ausgewählt sind nur jene, die eine der Fragen (Sprache, Framework-Overhead, Queue-Overhead, Transport) direkt beantworten. Das beantwortet die Betreuerfrage, was am Ende sinnvoll miteinander verglichen werden soll:

| Nr. | Vergleich | Forschungsfrage |
| - | --------- | ---------------- |
| 1 | Node-minimal/SSE vs. PHP-minimal/SSE | Sprache (SSE, ohne Framework) |
| 2 | Node-minimal/WS vs. PHP-minimal/WS | Sprache (WS, ohne Framework) |
| 3 | Node-express/SSE vs. PHP-laravel/SSE | Sprache (SSE, mit Framework) |
| 4 | Node-express/WS vs. PHP-laravel/WS | Sprache (WS, mit Framework) |
| 5 | Node-minimal/SSE vs. Node-express/SSE | Framework-Overhead (Node.js, SSE) |
| 6 | Node-minimal/WS vs. Node-express/WS | Framework-Overhead (Node.js, WS) |
| 7 | PHP-minimal/SSE vs. PHP-laravel/SSE | Framework-Overhead (PHP, SSE) |
| 8 | PHP-minimal/WS vs. PHP-laravel/WS | Framework-Overhead (PHP, WS) |
| 9 | Node-express/SSE vs. Node-express/SSE mit Queue | Queue-Overhead (Node.js) |
| 10 | PHP-laravel/SSE vs. PHP-laravel/SSE mit Queue | Queue-Overhead (PHP) |
| 11 | Node-express/SSE mit Queue vs. PHP-laravel/SSE mit Queue | Sprache mit Queue |
| 12 | Node-minimal/SSE vs. Node-minimal/WS | Transport (Node.js) |
| 13 | PHP-minimal/SSE vs. PHP-minimal/WS | Transport (PHP) |

Jeder Vergleich wird in eigenen Kampagnen über die drei Laststufen gemessen (5.6.3). Die Signifikanztests werden je Messgröße über alle 39 Tests (13 Vergleiche × 3 Laststufen) mit Holm korrigiert (5.8).

**Transport als Vergleichsachse** (beschlossen am 2026-10-16, ersetzt die frühere Festlegung „Transport ist Kontext, keine Vergleichsachse", Begründung der Abweichung vom Exposé in 5.23). Der Transport wird auf zwei Ebenen verglichen:

- **Gepaart und konfirmatorisch** nur in den Minimalvarianten (Vergleiche 12 und 13). Dort unterscheiden sich die beiden Zellen ausschließlich im Transport und in dem, was er in der jeweiligen Sprache mit sich bringt. In den Framework-Varianten käme bei Laravel ein anderes Protokoll (Pusher-Protokoll über Reverb) und ein zusätzlicher Prozess mit internem HTTP-Aufruf hinzu (H6). Ein Unterschied wäre dort nicht mehr dem Transport zuzuordnen.
- **Beschreibend für alle vier Varianten mit beiden Transporten** über Skalierungsreihe und Sättigungstest, die ohnehin für alle Zellen laufen (`tools/orchestrate/series.js`). Das deckt die Erwartung des Exposés ab, dass WebSockets bei hoher Ereignisfrequenz im Vorteil sind (H11).

Bei PHP ist der Transport nicht vom Laufzeitmodell zu trennen. SSE läuft in der üblichen Betriebsweise über PHP-FPM (ein Worker je Verbindung, 5.5), ein WebSocket-Server ist dagegen ein langlaufender Prozess mit Ereignisschleife (Ratchet). Vergleich 13 misst daher die praktische Entscheidung, vor der ein PHP-Team steht, und nicht das Protokoll allein (H10). Bei Node.js nutzen beide Transporte dieselbe Ereignisschleife. Vergleich 12 kommt einem reinen Protokollvergleich am nächsten (H9).

**Einschränkung.** SSE wird mit der Erweiterung xk6-sse, WebSocket mit dem WebSocket-Modul von k6 gemessen. Beide laufen im selben k6-Prozess auf dem Lastgenerator, und beide Zeitstempel stammen von dort. Unterschiede in der clientseitigen Verarbeitung der beiden Module können dennoch in die Latenz eingehen. Die Arbeit nennt das als Bedrohung der Konstruktvalidität. Dasselbe gilt für Vergleich 4, denn php-laravel/WS wird mit `ws-reverb.js` gemessen, das zusätzlich den Verbindungsaufbau und das Abonnement des Pusher-Protokolls durchläuft, node-express/WS mit `ws-skeleton.js`. Der Unterschied betrifft vor allem den Verbindungsaufbau. Die Event-Latenz misst beide Male die Zeit vom Senden bis zum Empfang des Events.

**Aufwand.** Zwei Vergleiche mehr je Block, also sechs Kampagnen. Bei den Beispiel-Wiederholungszahlen (80, 60 und 40 Läufe zuzüglich Warm-up) sind das rund 17 Stunden je Block. Die Holm-Korrektur wird geringfügig strenger (kleinste Schwelle α/39 statt α/33).

### 5.16 Messprotokoll und Telemetrie — ENTSCHIEDEN, umgesetzt

**Vorgabe vom 2026-10-16.** Telemetriedaten als Datei speichern (Dauer, übertragene Bytes, Bytes pro Sekunde u. a.). Die Tests sollen ein aussagekräftiges Log im JSON-Format erzeugen.

Ablage pro Kampagne unter `results/<zeitstempel>_<name>/`:

| Datei | Inhalt |
|---|---|
| `campaign.json` | verwendete Kampagnendefinition |
| `campaign.log.jsonl` | fortlaufendes Ereignisprotokoll mit Start, gestoppten und gestarteten Diensten, Kontext, jedem Lauf mit Kurzergebnis, Zwischenauswertungen und Abbruch |
| `runs/<laststufe>_<konfiguration>_runNNNN.json` | vollständiges Protokoll eines Laufs |
| `aggregate.json` | Kampagnenauswertung mit deskriptiven Kennzahlen, Vergleichen mit unkorrigierten p-Werten, Zwischenständen und ggf. Skalierung oder Sättigung |

`tools/orchestrate/schedule.js` schreibt zusätzlich ein Protokoll je Zeitplan (`results/<zeitstempel>_schedule_<name>.jsonl`), `tools/orchestrate/evaluate.js` die Gesamtauswertung über alle Hauptkampagnen (`results/<zeitstempel>_evaluation/evaluation.json` und `evaluation.md`), `tools/orchestrate/series.js` die Auswertung von Skalierung und Sättigung (`results/<zeitstempel>_series/series.json` und `series.md`) und `tools/code-metrics/metrics.js` die Code-Kennzahlen (`results/<zeitstempel>_code-metrics/metrics.json` und `metrics.md`).

Inhalt eines Lauf-Protokolls:

- **Lauf.** Konfiguration, Zelle, Laststufe, Phase, Block, Laufnummer, Warm-up, Gültigkeit mit Grund, Start- und Endzeit.
- **Last.** Clients, Einschwing- und Haltezeit, Verteilung des Verbindungsaufbaus, eingestellte Event-Rate, Ereignisquelle, Skript, Messgröße, Modus des Front-Nginx.
- **Latenz (Messfenster).** Mittelwert, Minimum, Median, p90, p95, p99, Maximum.
- **Verbindung.** Dauer des Verbindungsaufbaus (Mittel, Median, p95, Maximum), bis zum Ende der Einschwingzeit verbundene Clients, im Messfenster bediente Clients (mindestens ein Event erhalten) und die zugehörigen Anteile.
- **Zustellung** (5.17). Empfangene, eindeutige, erwartete, verlorene und doppelte Events, Zustellquote, zugestellte Events pro Sekunde, gemessene Senderate.
- **Netz.** Empfangene und gesendete Bytes sowie Bytes pro Sekunde (k6 `data_received` und `data_sent`, für SSE und WebSockets geprüft am 2026-10-16).
- **Ressourcen** von Zelle, Redis und beiden zusammen sowie je Container:
  - CPU-Zeit als Differenz des cgroup-Zählers `usage_usec` zwischen Beginn und Ende des Laufs (exakt) sowie mittlere CPU-Auslastung in Kernen,
  - Speicher (`memory.current` und Working Set = `memory.current` − `inactive_file`, wie bei `docker stats`) als Mittel und Spitze, alle 250 ms abgetastet. Die Spitze von Zelle und Redis zusammen wird aus der Summe je Abtastung gebildet. Dazu die exakte Spitze laut Kernel seit Start jedes Containers (`memory.peak`), zu Beginn und am Ende des Laufs. Ist sie im Lauf gestiegen, ist der Endwert die exakte Spitze dieses Laufs.
- **Lastgenerator.** CPU-Auslastung des Hosts (Mittel und höchster Wert je Sekunde).
- **Host des Testservers.** Temperatur zu Beginn, am Ende und als Maximum. Drosselstatus der Firmware zu Beginn und am Ende (auf dem Pi 5 per `vcgencmd`, 5.14).
- **Container.** Status, OOM-Kennzeichen, Image.
- **Kontext:**
  - Code-Stand (Git-Commit beider Seiten, Anzahl nicht committeter Änderungen),
  - k6- und Erweiterungsversion,
  - Host (Modell, Kernel, Kerne, RAM, Swap, cgroup-Controller, Governor),
  - je Container wirksame Limits, Image und Betriebsmodus (`NODE_ENV`, `APP_ENV`, `APP_DEBUG`, geladene `php.ini`).
- **Rohdaten.** Vollständige k6-Zusammenfassung.

Von zusätzlichen Umgebungsvariablen (z. B. dem Reverb-App-Key) werden nur die Namen protokolliert, nie die Werte. Liegt eine Kampagnendatei außerhalb des Repositorys, wird nur ihr Dateiname protokolliert.

**Ressourcenmessung.** `tools/resource-sampler` liest die cgroup-v2-Dateien direkt. Er ersetzt `docker stats`, das pro Abfrage ein bis drei Sekunden benötigt, selbst CPU auf dem gemessenen Rechner verbraucht und nicht an einzelne Läufe gekoppelt war. Das frühere Protokollwerkzeug für `docker stats` (`tools/monitor`) wurde am 2026-10-17 entfernt.

Die Betreuerantwort zu Frage 8 betrifft dieses Messprotokoll und ersetzt den Werkzeugvergleich (5.3, 5.13) nicht (Auslegung vom 2026-10-18).

### 5.17 Durchsatz und Zustellung — ENTSCHIEDEN, umgesetzt

Durchsatz ist als Messgröße angekündigt („wie viele Events pro Sekunde zugestellt werden"). Bei fester Event-Rate ist die Zahl der zugestellten Events pro Sekunde jedoch durch die Last vorgegeben (Clients × Rate) und unterscheidet die Zellen nicht, solange keine Events verloren gehen. Durchsatz wird daher in zwei Stufen erfasst:

1. **Zustellung bei fester Rate** (alle Kampagnen):
   - Jedes Event trägt eine laufende Nummer `seq`. k6 zählt pro Verbindung im Messfenster erwartete Events (alle Nummern zwischen dem ersten und dem letzten empfangenen Event) sowie eindeutige, verlorene und doppelte Events (`k6/lib/delivery.js`). Daraus ergibt sich die Zustellquote.
   - Die Zustellquote bezieht sich nur auf bediente Clients. Clients, die gar nicht bedient werden (z. B. jenseits der 550 FPM-Worker), erfasst der Anteil bedienter Clients (5.16). Ohne ihn sähe die Zustellquote in diesem Fall fälschlich vollständig aus.
   - Die tatsächliche Senderate wird aus den Zeitstempeln der Events bestimmt, nicht aus der eingestellten Rate.
   - **Einschränkung.** Verluste nach dem letzten empfangenen Event einer Verbindung sind nicht erkennbar. Bei Haltezeiten weit über dem Event-Intervall ist das vernachlässigbar.
2. **Sättigungstest** (eigene Kampagnen, `phase: saturation`):
   - Feste Clientzahl, stufenweise steigende Event-Rate, wenige Wiederholungen pro Stufe, rein beschreibende Auswertung.
   - Ergebnis pro Zelle ist die höchste nachhaltige Rate, also die höchste Stufe, bis zu der auf jeder Stufe im Median mindestens 99 % der Events zugestellt werden und die p95-Latenz im Median höchstens 1 000 ms beträgt.
   - Die Latenzgrenze orientiert sich an der Grenze von etwa einer Sekunde, bis zu der Verzögerungen den Gedankenfluss von Nutzern nicht unterbrechen (Nielsen 1993).
   - Clientzahl und Ratenstufen werden nach dem Pilot festgelegt.

Die Ereignisquellen takten nach absolutem Zeitplan (Start + seq · Intervall) statt „senden, dann volles Intervall warten". Letzteres hätte die Rate systematisch um die Dauer jedes Sendevorgangs gesenkt. Lokal hielt der Event-Simulator 500 Events/s auf 0,1 Events/s genau ein (2026-10-16).

### 5.18 Hypothesen — ENTSCHIEDEN (vor der Datenerhebung festgelegt am 2026-10-16)

Die Hypothesen sind aus der Architektur der Stacks abgeleitet und vor der Datenerhebung festgelegt (`plan.json`). Das schützt vor dem nachträglichen Anpassen von Erwartungen an die Ergebnisse (HARKing, Kerr 1998). Die Signifikanztests bleiben zweiseitig. Die Hypothesen strukturieren die Diskussion. Jede Hypothese wird in der Arbeit als bestätigt, nicht bestätigt oder unentschieden bewertet.

| Nr. | Hypothese | Begründung |
|---|---|---|
| H1 | Für SSE benötigt PHP-FPM bei 500 Clients ein Vielfaches des Speichers von Node.js. | Ein Prozess pro Verbindung gegenüber einem Objekt pro Verbindung. |
| H2 | Bei 10 Clients sind die Latenzunterschiede höchstens klein (\|δ\| < 0,33). | Bei geringer Last ist keine Architektur ausgelastet. |
| H3 | Von 10 zu 500 Clients wachsen die Latenzunterschiede zwischen PHP und Node.js. Die Richtung ist offen. | **Gegenläufige Mechanismen.** Bei PHP-FPM läuft die Verteilung parallel in vielen Prozessen und teils in Redis. Node.js verteilt in einem Thread nacheinander, aber ohne Prozesswechsel. |
| H4 | In der Skalierungsreihe erreicht PHP-FPM/SSE als erste Variante eine harte Grenze. Node.js und die PHP-WebSocket-Server werden allmählich langsamer. | Fest 550 Worker gegenüber Event Loop. |
| H5 | Der Framework-Effekt ist bei der Event-Latenz klein, beim Verbindungsaufbau und beim Speicher aber bei Laravel deutlich größer als bei Express. | Nach dem Verbindungsaufbau führen beide Frameworks pro Event kaum eigenen Code aus. Laravel startet pro SSE-Verbindung das Framework. |
| H6 | php-laravel/WS hat durchgehend höhere Latenz als node-express/WS. | Jedes Event durchläuft einen zusätzlichen internen HTTP-Aufruf (Listener → Reverb). |
| H7 | Die Queue erhöht die Latenz in beiden Stacks, bei Laravel stärker als bei BullMQ. | Job-Serialisierung und ein schwergewichtigerer Worker bei Laravel. |
| H8 | Bei PHP/SSE trägt Redis einen wesentlichen Teil der Gesamt-CPU, bei allen anderen Zellen nur einen geringen. | Verteilung an N Abonnenten (5.6.2). |
| H9 | Bei Node.js, wo beide Transporte dasselbe Laufzeitmodell nutzen, verursacht SSE weniger Overhead als WebSockets, also weniger CPU-Zeit und ein kleineres Working Set bei gleicher Last (Vergleich 12). | Erwartung aus dem Exposé. SSE ist reines HTTP ohne Protokollwechsel und ohne Rahmenformat. Jedes Event ist eine Textzeile in einer offenen Antwort. |
| H10 | **Bei PHP bestimmt das Laufzeitmodell den Transportvergleich.** PHP-FPM/SSE benötigt bei 500 Clients ein Vielfaches des Speichers des Ratchet-WebSocket-Servers (Vergleich 13, Stress). | Ein PHP-Prozess je SSE-Verbindung gegenüber einer Ereignisschleife für alle WebSocket-Verbindungen (5.5, 5.15). |
| H11 | Bei hohen Event-Raten erreichen die WebSocket-Varianten eine höhere nachhaltige Rate als die SSE-Varianten derselben Sprache und Variante (Sättigungstest, beschreibend). | Erwartung aus dem Exposé. WebSocket-Rahmen sind kompakter als SSE-Textzeilen. Bei PHP/SSE verteilen zudem viele Prozesse jedes Event einzeln. |

H9 und H11 übernehmen die Erwartungen des Exposés zum Transportvergleich, H10 ergänzt die Besonderheit von PHP (5.23). Sie wurden am 2026-10-16 vor der Datenerhebung festgelegt, wie H1 bis H8.

**Entscheidungsregeln** (festgelegt am 2026-10-17, vor der Datenerhebung, maschinenlesbar in `plan.json`, `decisionRules` und `rule` je Hypothese, mit englischem Wortlaut für die Arbeit). Ohne festgelegte Regeln wäre die Bewertung als bestätigt, nicht bestätigt oder unentschieden selbst eine nachträgliche Entscheidung (Kerr 1998).

Allgemeine Regeln:

- **G1.** Eine gerichtete Aussage gilt als gezeigt, wenn der Test nach Holm signifikant ist und die Median-Differenz in die vorhergesagte Richtung zeigt.
- **G2.** Eine Aussage über keinen oder höchstens einen kleinen Unterschied wird über das Effektmaß geprüft (|δ| < 0,33), nicht über fehlende Signifikanz. Ein nicht signifikanter Test belegt keine Gleichheit.
- **G3.** „Vielfaches" bedeutet ein Verhältnis der Mediane von mindestens 2.
- **G4.** Betrifft eine Hypothese mehrere Vergleiche oder Laststufen, ist sie bestätigt, wenn die Bedingung in allen Fällen erfüllt ist, und nicht bestätigt, wenn mindestens ein Fall das Gegenteil zeigt. Sonst ist sie unentschieden, ebenso wenn ein benötigter Vergleich weniger als 20 verwertbare Paare hat oder fehlt.

| Nr. | Bestätigt, wenn … |
|---|---|
| H1 | **Vergleiche 1 und 3 bei 500 Clients.** Working Set (Variante und Redis) von PHP mindestens das Doppelte von Node.js, Unterschied signifikant |
| H2 | **Alle 13 Vergleiche bei 10 Clients.** \|δ\| < 0,33 bei der Latenz. Nicht bestätigt, sobald ein Vergleich \|δ\| ≥ 0,33 zusammen mit einem signifikanten Unterschied zeigt |
| H3 | **Vergleiche 1–4.** Betrag der Median-Differenz der Latenz bei 500 Clients größer als bei 10 Clients und bei 500 Clients signifikant. Cliff's Delta wird hier nicht verwendet, weil es bei gleichbleibendem Unterschied schon bei 10 Clients nahe seinem Maximum liegt und nicht weiter wachsen kann |
| H4 | die PHP-FPM-Varianten mit SSE (php-minimal-sse, php-laravel-sse, php-laravel-sse-queue) haben die niedrigsten Kapazitätsgrenzen aller Varianten, und ihr Anteil bedienter Clients fällt zwischen zwei aufeinanderfolgenden Stufen um mindestens 5 Prozentpunkte (harte Grenze). Die Node.js-Varianten und die PHP-WebSocket-Server zeigen bis zur selben Stufe keinen solchen Sprung |
| H5 | **Vergleiche 5–8.** \|δ\| < 0,33 bei der Latenz auf allen Laststufen. Bei Verbindungsaufbau und Working Set ist die Median-Differenz Laravel gegen Minimalumsetzung größer als Express gegen Minimalumsetzung bei gleichem Transport und gleicher Laststufe, und der Laravel-Effekt ist signifikant |
| H6 | **Vergleich 4.** Die Variante php-laravel-ws hat auf allen drei Laststufen eine signifikant höhere Latenz |
| H7 | **Vergleiche 9 und 10.** Die Variante mit Queue hat auf allen Laststufen eine signifikant höhere Latenz, und die Median-Differenz ist bei Laravel (Vergleich 10) größer als bei BullMQ (Vergleich 9) |
| H8 | bei 500 Clients, Median des Redis-Anteils an der gesamten CPU-Zeit über alle gültigen Läufe der Variante in Block 1, mindestens 25 % für alle PHP-FPM-Varianten mit SSE („wesentlich") und unter 10 % für alle übrigen Varianten („gering") |
| H9 | **Vergleich 12.** SSE mit signifikant niedrigerer CPU-Zeit und kleinerem Working Set auf allen Laststufen |
| H10 | **Vergleich 13 bei 500 Clients.** Working Set von SSE mindestens das Doppelte von WebSocket, Unterschied signifikant |
| H11 | in allen vier Paaren aus SSE- und WebSocket-Variante gleicher Sprache und Framework-Wahl erreicht die WebSocket-Variante die höhere nachhaltige Rate. Unentschieden bei Gleichstand, etwa wenn beide die höchste Stufe erreichen |

Die Schwellen von H8 (25 % und 10 %) sind aus der Formulierung „wesentlicher" bzw. „geringer" Anteil abgeleitet. Die lokalen Funktionsprüfungen hatten zu diesem Zeitpunkt bereits Redis-Anteile gezeigt, auch bei WebSocket-Varianten über 25 %. Die Schwellen wurden nicht an diese Werte angepasst, und die Arbeit nennt das offen.

**Transparenz.** Lokale Funktionsprüfungen vor der Festlegung zeigten bei H6 bereits diese Richtung (2,2 ms gegenüber 1,1 ms bei 10 Clients, n = 3, nicht auf der Zielhardware). H6 wurde aus der Architektur abgeleitet, nicht aus diesen Werten. Gleiches gilt für Hinweise zu H4, H5 und H8 aus den Funktionsprüfungen (`results/2026-10-16_verification-2/`). Die Arbeit nennt das offen.

### 5.19 Queue-Achse — ENTSCHIEDEN (beschlossen am 2026-10-16)

Das Exposé fragt, wie ein ereignisgesteuertes Benachrichtigungssystem „mit SSE und Queues" in PHP und Node.js entworfen und umgesetzt werden kann. Die acht Hauptzellen enthalten bewusst keine Queue (5.7). Die Queue wird deshalb als eigene Achse gemessen, beschränkt auf die Framework-Varianten mit SSE:

| Zelle | Ereignisquelle | Weg |
|---|---|---|
| node-express-sse-queue | Event-Simulator, Modus `queue` (BullMQ-Jobs) | BullMQ-Queue → BullMQ-Worker → Redis Pub/Sub `notifications` → Express-SSE |
| php-laravel-sse-queue | `scan:produce` (Laravel-Jobs, nur Laravel kann sein Job-Format erzeugen) | Laravel-Queue → `queue:work` → Redis Pub/Sub `notifications` → Laravel-SSE (PHP-FPM) |

- Der Worker gehört zur Zelle und zum gemeinsamen Ressourcenbudget (5.6.2).
- Der SSE-Endpunkt ist derselbe Code wie in der Zelle ohne Queue. Er abonniert lediglich `notifications` statt `scan-events`.
- **Beschränkung auf SSE.** Die Queue sitzt vor der Verteilung an die Clients. Ihr Effekt sollte unabhängig von der Transportart sein. Diese Annahme wird in der Arbeit offen genannt.
- Laravels Worker wartet mit `block_for` blockierend auf Jobs, statt bei leerer Queue 3 s zu schlafen (5.20). Ohne diese Einstellung würde bei 1 Event/s vor allem die Schlafpause gemessen.
- Neue Vergleiche 9–11 (5.15). Die Testfamilien wuchsen damit auf 33 Tests, mit den Transportvergleichen 12 und 13 auf 39 (5.8, 5.15).

### 5.20 Abweichungen von der Standardkonfiguration — ENTSCHIEDEN

Jede Einstellung, die vom Auslieferungszustand der Komponenten abweicht, mit Begründung. Das dient der Nachvollziehbarkeit im Methodikteil.

| Komponente | Einstellung | Standard | Begründung |
|---|---|---|---|
| PHP-FPM | `pm = static`, `pm.max_children = 550` | `pm = dynamic`, 5 Worker | ein Worker pro SSE-Verbindung. Zielzahl 500 Clients (5.5) |
| PHP-FPM | `ping.path = /healthz` | aus | Erreichbarkeitsprüfung durch den Front-Nginx (5.6.1) |
| Laravel Queue | `block_for = 5` | `null` (Polling mit 3 s Schlafpause) | sonst misst die Queue-Achse die Schlafpause (5.19). Dokumentierte Laravel-Einstellung |
| Nginx | `proxy_buffering off`, `fastcgi_buffering off` | an | Pufferung würde Events zurückhalten (5.6.1) |
| Nginx | `proxy_read_timeout`/`fastcgi_read_timeout` 3600 s | 60 s | SSE-Verbindungen bleiben offen |
| Nginx | `worker_connections 4096`, `worker_rlimit_nofile 8192` | 1024 bzw. Systemwert | 500 und mehr gleichzeitige Verbindungen |
| Container | `ulimits.nofile` 8192 | Systemwert (oft 1024) | wie oben |
| Container | `memswap_limit` gleich `mem_limit` | Swap bis zum Doppelten des Limits | keine ausgelagerten Seiten in der Messung |
| SSE-Endpunkte | SSE-Kommentar `: connected` beim Verbindungsaufbau | — | Verbindungsaufbau messbar (5.9) |
| Raspberry Pi OS | Kernel mit 4-KB-Seiten (`kernel=kernel8.img`) | Kernel mit 16-KB-Seiten (`kernel_2712.img`) | übliche Seitengröße von Servern, gleich für alle Zellen. Wechsel nach der vorab festgelegten Regel in 5.10 |
| Raspberry Pi OS | Systemprotokoll dauerhaft (`Storage=persistent`) | nur im Arbeitsspeicher | Abstürze im unbeaufsichtigten Betrieb bleiben nachvollziehbar (5.14) |

Der Produktionsbetrieb nach offizieller Dokumentation (5.5) gilt nicht als Abweichung, sondern als Bezugszustand.

### 5.21 Testlast und ihre Grenzen — ENTSCHIEDEN

Die Testlast bildet Lokato an zentralen Stellen nach und vereinfacht an anderen. Die Vereinfachungen werden in der Arbeit als Grenzen der externen Validität genannt (Entscheidung vom 2026-10-16, keine zusätzlichen Messreihen):

| Merkmal | Testlast | Bewertung |
|---|---|---|
| Nachrichtenformat | Originalformat eines Lokato-Scans plus Messfelder `seq` und `ts`, ca. 140 Byte | realistisch. Echte Lokato-Events sind ähnlich klein |
| Empfänger | jedes Event an alle Clients (Broadcast) | entspricht einem Dashboard. Gezielte Zustellung an einzelne Nutzer wäre eine eigene Architekturfrage |
| Zeitmuster | gleichmäßige Rate (1 Event/s, Sättigungstest höher) | stoßweise Last (viele Scans gleichzeitig an einem Tor) nicht abgebildet |
| Anmeldung | keine (öffentlicher Kanal) | in Produktion üblich. Zusätzlicher Aufwand beim Verbindungsaufbau nicht erfasst |
| Verbindungsabbrüche | keine | Wiederverbindung (SSE mit `Last-Event-ID`, WS mit eigener Logik) nicht erfasst |

### 5.22 Komplexität und Wartbarkeit — ENTSCHIEDEN (beschlossen am 2026-10-16)

Das Exposé fragt nach Komplexität und Wartbarkeit der Umsetzungen. Für Wartbarkeit gibt es kein einzelnes anerkanntes Maß. Die Arbeit beantwortet die Frage deshalb aus zwei Richtungen, beide ohne zusätzliche Messzeit:

1. **Statische Code- und Betriebskennzahlen je Zelle** (`tools/code-metrics`). Eigener Anwendungscode (Dateien, Codezeilen ohne Leer- und Kommentarzeilen), Betriebskonfiguration (Dockerfile, FPM-Pool, Startskript), Zahl der Container, direkt genutzte Abhängigkeiten und alle davon abhängigen Pakete laut Lock-Datei, Systemerweiterungen außerhalb des Paketmanagers. Je Prototyp zusätzlich der Projektumfang ohne Abhängigkeiten und die Zahl installierter Produktionspakete. Welche Dateien zu einer Zelle gehören, legt `tools/code-metrics/variants.json` ausdrücklich fest.
2. **Qualitativer Debugging- und Monitoring-Vergleich** (5.13). Werkzeuge, Correlation-ID über die Queue-Grenze, Sichtbarkeit von Fehlern im Worker.

Die Kennzahlen zeigen einen Zielkonflikt, der ohne Gewichtung berichtet wird. Ein Framework verringert den eigenen Code (Laravel erledigt Routing, Broadcasting und Queue-Verarbeitung), erhöht aber die Zahl der Abhängigkeiten und den Projektumfang (vom Framework erzeugtes Gerüst). Codezeilen und Paketzahlen sind grobe Näherungen. Sie erfassen weder Verständlichkeit noch Qualität der Dokumentation. Eine Gesamtnote wird daher nicht gebildet. Die Auswertung läuft auf dem Commit, mit dem gemessen wird.

### 5.23 Abweichungen vom Exposé — ENTSCHIEDEN (vom Betreuer bestätigt am 2026-10-19)

**Maßstab für jede Abweichung.** Sie muss sinnvoll begründet sein und den Entwicklern, für die die Entscheidungshilfe gedacht ist, einen echten Mehrwert bringen (Vorgabe der Autorin, 2026-10-17). Die Tabelle nennt diesen Mehrwert je Punkt.

Das Exposé beschreibt den Plan zu Beginn der Arbeit. Während der Umsetzung, der Abstimmung mit dem Betreuer am 2026-10-16 und zwei Überprüfungen des Messaufbaus (Abschnitt 8) haben sich Abweichungen ergeben. Jede ist hier mit Begründung festgehalten. In den Entwürfen für den Betreuer stehen sie als Tabelle in einem eigenen Abschnitt der Methodik, der vor der Abgabe entfernt wird. Die Abgabefassung beschreibt die Methode, wie sie durchgeführt wurde, und bezeichnet methodische Änderungen wie das Latenzmaß nicht als Abweichung. Dieses Protokoll bleibt als Nachweis im Repository.

| Nr. | Punkt | Exposé | Umsetzung | Mehrwert für Entwickler |
|---|---|---|---|---|
| 1 | Titel | „Design and Implementation of an Event-Driven Notification System in PHP Using SSE and Queues: A Comparative Study with Node.js/Express" | Vorschläge „Event-Driven Notification Systems in PHP and Node.js: A Performance Comparison of Server-Sent Events, WebSockets and Queues" oder „Event-Driven Notification Systems in PHP and Node.js: A Comparative Study of Server-Sent Events, WebSockets and Queues under Load". Endgültiger Titel mit dem Betreuer abzustimmen | Der Titel zeigt sofort, welche Entscheidungen die Arbeit unterstützt. Sprache, Transport, Framework und Queue |
| 2 | Forschungsfragen | eine Hauptfrage (Entwurf, Umsetzung, messbare Unterschiede) mit sechs Unterfragen | drei messbare Forschungsfragen und ein praktisches Ziel. Entwurf und Umsetzung als konstruktiver Teil | Antworten mit Zahlen und Effektstärken statt einer allgemeinen Beschreibung, dazu eine Entscheidungshilfe |
| 3 | SSE und WebSocket | direkter Vergleich mit Erwartung | Vergleiche 12 und 13 (gepaart), Skalierung und Sättigung (beschreibend), H9 bis H11 | Die Wahl zwischen SSE und WebSocket ist eine der häufigsten Entscheidungen bei Benachrichtigungen. Gemessene Unterschiede statt Erfahrungsberichten |
| 4 | Symfony | EventDispatcher als zweite Referenz | nicht umgesetzt | Kein irreführendes Ergebnis über einen Go-Hub als „Symfony". Der Hinweis auf Mercure ist selbst eine praktische Information |
| 5 | Komplexität und Wartbarkeit | Unterfrage | Code-Kennzahlen und Debugging-Vergleich (5.13, 5.22) | Sichtbar, was eine Variante an Code, Abhängigkeiten und Betrieb kostet, nicht nur an Leistung |
| 6 | Latenzmaß | p50, p95, p99 | Mittelwert pro Lauf als Testgröße, Perzentile beschreibend | Belastbare Unterschiede, die sich bei Wiederholung bestätigen. Perzentile für die Nutzersicht bleiben erhalten |
| 7 | Durchsatz | Events pro Sekunde bei steigender Last | Zustellquote je Lauf und Sättigungstest | Die Rate, ab der ein Stack versagt, ist eine direkte Grundlage für Kapazitätsplanung |
| 8 | Skalierung | 10, 50, 100 und 500 Clients | Laststufen 10, 50, 500. Skalierungsreihe 10 bis 1 000 | Zeigt, ab wie vielen Clients PHP-FPM an seine Worker-Grenze stößt, und damit, wie ein Pool zu dimensionieren ist |
| 9 | Laravel-Version | 13.x | 13.36.0 (zwischenzeitlich 12.61.1 und 13.34.0) | Ergebnisse gelten für die Version, die Entwickler heute einsetzen |
| 10 | Literatur | zehn Quellen, u. a. Fielding, Fowler, Laigner et al., Lazzari & Farias, Tzialla et al., Woodside | neun übernommen (drei standen bereits in LITERATUR.md), zwei Angaben korrigiert, Tzialla et al. nicht übernommen (LITERATUR.md) | Nur geprüfte, passende Quellen. Korrigierte Angaben sparen Lesern Sucharbeit |
| 11 | Grundlage der Prototypen | PHP-Prototyp erweitert das bestehende Lokato-Backend (Laravel, relationale Datenbank) | eigenständige Prototypen mit dem Ereignisformat von Lokato, ohne Datenbank | Ergebnisse sind auf eigene Projekte übertragbar statt an eine bestimmte Code-Basis gebunden. Die Prototypen dienen als Referenzcode |
| 12 | Queue in den Varianten | Laravel-Queue und Event-Dispatcher als Teil der vollständigen Umsetzungen | Queue als eigene Achse in zwei Varianten (5.19) | Eigener Preis einer Queue, getrennt vom Framework. Hilft bei der Entscheidung, ob sich eine Queue lohnt |
| 13 | Erwartung zur Latenz | Node.js mit geringerer Latenz und höherem Durchsatz unter hoher Last | H3 mit offener Richtung | Keine vorweggenommene Antwort. Die Erwartung des Exposés wird trotzdem geprüft |

**1. Titel.** Die Studie ist symmetrischer geworden als geplant. Beide Sprachen werden jeweils ohne und mit Framework umgesetzt, beide Transporte gemessen, und die Queue ist eine von vier Achsen (Sprache, Framework, Transport, Queue). Ein Titel, der PHP mit SSE und Queues in den Mittelpunkt stellt und Node.js/Express nur als Vergleichsgröße nennt, beschreibt die Arbeit daher nicht mehr genau. Dem Betreuer wurden am 2026-10-18 zwei Titel vorgeschlagen, „Event-Driven Notification Systems in PHP and Node.js: A Performance Comparison of Server-Sent Events, WebSockets and Queues" und „Event-Driven Notification Systems in PHP and Node.js: A Comparative Study of Server-Sent Events, WebSockets and Queues under Load". Beide übernehmen den Anfang des Exposés und lassen „Design and Implementation" weg, weil der Beitrag der Arbeit der Vergleich unter Last ist. Der erste benennt, was verglichen wird, der zweite bleibt mit „Comparative Study" näher an der Formulierung des Exposés. Ein früherer Kompromissvorschlag („Design and Implementation of Event-Driven Notification Systems in PHP and Node.js: A Comparative Study of Server-Sent Events, WebSockets and Queues") ist damit ersetzt.

**2. Forschungsfragen.** Die Hauptfrage des Exposés verbindet eine konstruktive Frage (wie lässt sich ein solches System entwerfen und umsetzen) mit einer empirischen (welche messbaren Unterschiede gibt es). Die konstruktive Frage beantwortet die Arbeit durch den Entwurf und die zehn Umsetzungen (Kapitel zu Entwurf und Umsetzung). Die empirische Frage ist in messbare Forschungsfragen zerlegt, weil nur sie sich vor der Datenerhebung mit Messgrößen, Tests und Hypothesen festlegen lassen (5.8, 5.18):

- **RQ1.** Wie groß sind die Unterschiede in Latenz, Verbindungsaufbau, Ressourcenverbrauch und Zustellung zwischen den Sprachen, den Transporten, mit und ohne Framework, mit und ohne Queue?
- **RQ2.** Wo liegen die Grenzen der einzelnen Varianten bei steigender Clientzahl und Event-Rate unter gleichem Ressourcenbudget?
- **RQ3.** Wie unterscheiden sich die Varianten in Umsetzungsaufwand und Betreibbarkeit (Code, Abhängigkeiten, Debugging und Monitoring)?

Die übergeordnete Frage in einem Satz (2026-10-18, Vorgabe der Lehrveranstaltung WIA4SE, Teil 3) lautet „Wie wirken sich Sprache und Laufzeitmodell, Transportprotokoll, Framework und Message Queue auf Leistung, Skalierbarkeit und Umsetzungsaufwand eines ereignisgesteuerten Benachrichtigungssystems in PHP und Node.js bei gleichem Ressourcenbudget aus?" RQ1 bis RQ3 sind ihre Unterfragen.
- **Praktisches Ziel.** Eine begründete Entscheidungshilfe, welche Kombination sich für welches Szenario eignet.

**Die Unterfragen des Exposés gehen darin auf.** Latenz, Durchsatz und Skalierung in RQ1 und RQ2, der Transportvergleich in RQ1 und RQ2 (Punkt 3), Komplexität und Wartbarkeit in RQ3 (Punkt 5), die Frage nach Laravel und Symfony in der Framework-Achse (Punkt 4).

**3. SSE und WebSocket.** Das Exposé vergleicht beide Transporte ausdrücklich und erwartet für SSE weniger Overhead, für WebSocket Vorteile bei hoher Ereignisfrequenz. Der Messaufbau behandelte den Transport bis zum 2026-10-16 nur als Kontext. Begründet war das damit, dass sich in den Framework-Varianten mit dem Transport auch Protokoll und Prozessaufbau ändern (Reverb, 5.15). Diese Begründung trägt für die Framework-Varianten weiterhin, nicht aber für die Minimalvarianten. Da der Transport im Titel des Exposés und der Arbeit steht und eine zentrale Erwartung des Exposés betrifft, wird er jetzt gemessen, und zwar gepaart in den Minimalvarianten, beschreibend für alle Varianten über Skalierung und Sättigung und mit den vorab festgelegten Hypothesen H9 bis H11 (5.15, 5.18). Der Zeitpunkt vor dem Pilot ist dafür der letzte, an dem die Erweiterung ohne Nachteil für die Vorabfestlegung möglich ist. Die Kosten sind gering, rund 17 Stunden Messzeit je Block und eine etwas strengere Holm-Korrektur.

**4. Symfony.** Eine Symfony-Variante wird nicht umgesetzt:

- Die Framework-Frage ist bereits durch den Vergleich von Laravel mit der Minimalvariante beantwortet (Vergleiche 7 und 8), auf Node.js-Seite durch Express (5 und 6). Ein zweites PHP-Framework würde die Frage „Laravel oder Symfony" beantworten, die nicht zu den Kernfragen der Arbeit gehört.
- Für Push-Nachrichten setzt Symfony auf Mercure. Die dauerhaften SSE-Verbindungen hält dabei ein eigener Hub-Server, der als Go-Programm bzw. Caddy-Modul ausgeliefert wird (LITERATUR.md). Eine Symfony-Variante würde den Push-Pfad also nicht in PHP messen und wäre mit den übrigen Zellen nicht vergleichbar. Der EventDispatcher allein ist ein Ereignismechanismus innerhalb eines Prozesses und kein Transport zum Client.
- Zwei bis drei zusätzliche Zellen mit mindestens vier Vergleichen hätten die Messzeit um rund ein Drittel und die Zahl der Tests deutlich erhöht.

Die Arbeit nennt Symfony in der Abgrenzung und im Ausblick.

**5. Komplexität und Wartbarkeit.** Wartbarkeit lässt sich nicht mit einer einzelnen Messgröße erfassen. Die Arbeit kombiniert objektive statische Kennzahlen mit dem qualitativen Debugging- und Monitoring-Vergleich und bildet keine Gesamtnote (5.22). Das ist belastbarer als eine subjektive Einschätzung und vermeidet eine scheinbare Genauigkeit.

**6. Latenzmaß.** p50, p95 und p99 werden für jeden Lauf berichtet. Als Testgröße dient aber der Mittelwert pro Lauf. Die Zeitstempel haben eine Auflösung von 1 ms, daher ist der Median eines Laufs fast immer eine ganze Zahl. Im ersten lokalen Probelauf hatten deshalb alle Paare die Differenz 0 und fielen aus dem Wilcoxon-Test. Der Mittelwert ist dagegen fein aufgelöst und unverzerrt (Widrow & Kollár 2008). Perzentile über alle Events mehrerer Läufe zu bilden, wäre Pseudoreplikation (Hurlbert 1984). Die ausführliche Begründung steht in 5.8.

**7. Durchsatz.** Bei fester Senderate ist die Zahl empfangener Events pro Sekunde gleich Senderate mal Clientzahl, solange nichts verloren geht. Als Messgröße wäre sie daher wenig aussagekräftig. Aussagekräftig ist, ab welcher Rate die Zustellung zusammenbricht. Das misst der Sättigungstest (höchste nachhaltige Event-Rate), ergänzt um die Zustellquote je Lauf (5.17).

**8. Skalierung.** Die Laststufen der Hauptmessung bleiben bei 10, 50 und 500 Clients. Die zusätzliche Skalierungsreihe bis 1 000 Clients ist eine Erweiterung. Die Grenze von PHP-FPM/SSE liegt bei der Zahl der Worker (550, 5.5). Ohne Stufen oberhalb von 500 Clients ließe sich RQ2 für diese Variante nicht beantworten (H4).

**9. Laravel-Version.** Das Exposé nennt Laravel 13.x. Umgesetzt war zunächst Laravel 12.61.1. Am 2026-10-16 wurde vor dem Pilot auf Laravel 13.34.0 aktualisiert, mit Reverb 1.12.0 (unterstützt Laravel 13). Gründe:

- Übereinstimmung mit dem Exposé.
- Laravel 12 erhält seit dem 2026-08-13 keine Fehlerbehebungen mehr, nur noch Sicherheitsupdates bis 2027-02-24. Laravel 13 erhält Fehlerbehebungen bis Q3 2027 und Sicherheitsupdates bis 2028-03-17 (Laravel Release Notes, LITERATUR.md). Die Messung erfolgt damit mit einer Version, die aktiv gepflegt wird.
- Gewählt wurde die neueste Version, die zum Zeitpunkt des Upgrades mindestens zwei Wochen alt war, um nicht eine gerade erschienene Version zu messen.
- Nach dem Pilot ist ein Versionswechsel nicht mehr möglich, ohne die Vergleichbarkeit der Blöcke zu gefährden.

Ein lokaler Prüflauf im Produktionsbetrieb mit allen drei Laravel-Zellen (10 und 500 Clients) verlief ohne ungültige Läufe (`results/2026-10-16_verification-3/`). Am 2026-10-27 folgte nach derselben Regel Laravel 13.36.0, zusammen mit allen übrigen gemessenen Komponenten (5.26).

**10. Literatur.** Die zehn Quellen des Exposés wurden einzeln geprüft (LITERATUR.md, Abschnitt zur ereignisgesteuerten Architektur). Übernommen sind alle, die eine Aussage der Arbeit stützen. Zwei Angaben sind korrigiert. Laigner et al. ist nicht bei SIGMOD 2024, sondern 2026 in ACM TOSEM erschienen, und von Lazzari & Farias wird statt der arXiv-Vorabfassung die begutachtete Zeitschriftenfassung (Farias & Lazzari 2023) zitiert. Tzialla et al. (2024) wird nicht übernommen. „Auditing" bezeichnet dort die Prüfung, ob ein Server eine Anwendung unverfälscht ausgeführt hat, und berührt keine Aussage dieser Arbeit. Für Herausforderungen bei Überwachung und Fehlersuche steht Laigner et al. zur Verfügung.

**11. Grundlage der Prototypen.** Laut Exposé sollte der PHP-Prototyp das bestehende Lokato-Backend erweitern, das Scan-Ereignisse in einer relationalen Datenbank speichert. Umgesetzt sind eigenständige Prototypen, die das Ereignisformat von Lokato übernehmen (5.21), aber keine Datenbank und keine weitere Anwendungslogik enthalten. Gründe:

- **Gleiche Ausgangslage.** Ein Node.js-Gegenstück zum gewachsenen Lokato-Backend hätte erst nachgebaut werden müssen. Die PHP-Seite hätte sonst Code, Middleware und Datenbankzugriffe mitgebracht, die auf der Node.js-Seite fehlen, und der Vergleich hätte die beiden Code-Basen statt der Technologien gemessen.
- **Kein Störfaktor durch die Datenbank.** Ein Schreibzugriff pro Ereignis hätte die Latenz um die Datenbank verlängert und deren eigene Schwankung in jede Messung getragen. Die Zustellung eines Ereignisses ist die untersuchte Frage, nicht seine Speicherung.
- **Lesbarkeit.** Die Prototypen dienen in der Arbeit als Codebeispiele und bleiben deshalb so knapp wie möglich (Abschnitt 1).

Der Bezug zu Lokato bleibt über das Ereignisformat, die Ereignisquelle und das Szenario (Broadcast an Dashboards) erhalten.

**12. Queue in den Varianten.** Das Exposé sieht die Queue als Bestandteil der vollständigen Umsetzungen in allen vier Konfigurationen vor. Umgesetzt ist sie als eigene Achse in je einer Variante pro Sprache (5.19). So bleibt der Effekt der Queue messbar, statt sich mit dem Framework-Effekt zu vermischen. Die ausführliche Begründung steht in 5.7 und 5.19.

**13. Erwartung zur Latenz.** Das Exposé erwartet, dass Node.js unter hoher Last eine geringere Latenz und einen höheren Durchsatz erreicht. H3 lässt die Richtung offen, weil zwei Mechanismen gegeneinander wirken. PHP-FPM verteilt ein Ereignis parallel in vielen Prozessen, Node.js nacheinander in einem Thread (5.18). Die Erwartung des Exposés wird in der Diskussion den Ergebnissen gegenübergestellt. Die Tests sind ohnehin zweiseitig. Die Erwartung zum Ressourcenverbrauch je Verbindung bei PHP ist in H1 und H10 enthalten.

### 5.24 Schwerpunkte der schriftlichen Arbeit und Reihenfolge von Kürzungen — ENTSCHIEDEN (vor der Datenerhebung festgelegt am 2026-10-17)

Zehn Varianten, dreizehn Vergleiche, elf Hypothesen, Replikation, Skalierung, Sättigung und Code-Kennzahlen erzeugen mehr Material, als sich in einer Bachelorarbeit gleich ausführlich darstellen lässt. Die Arbeit legt deshalb vor der Messung fest, welche Themen ausführlich und welche knapp behandelt werden. Vorrangiger Zweck ist eine fokussierte, kürzere schriftliche Arbeit. Erst in zweiter Linie regelt der Abschnitt, was bei Zeitmangel an Messzeit eingespart wird.

**Schwerpunkte im Text.** Maßgeblich ist das Abstract des Exposés, das den Einfluss des Technologie-Stacks und des Transportprotokolls als Kern der Untersuchung nennt.

| Stufe | Inhalt | Darstellung |
|---|---|---|
| Kern | **Sprache und Laufzeitmodell unter Last.** Vergleiche 1–4, H1, H3, H4, H6, H8 (Anteil von Redis an der CPU), Skalierungsreihe | ausführlich, mit eigenen Abbildungen, zentral in der Diskussion |
| Kern | **Transport.** Vergleiche 12 und 13, H9–H11, SSE gegen WebSocket im Sättigungstest | ausführlich, mit eigenen Abbildungen, zentral in der Diskussion |
| Ergänzung | **Kosten der Architektur.** Framework (Vergleiche 5–8, H5), Queue (Vergleiche 9–11, H7) | ein Abschnitt, je Achse eine Tabelle und wenige Absätze |
| übergreifend | H2 (alle dreizehn Vergleiche bei 10 Clients) | Belege in den jeweiligen Abschnitten, Bewertung in der Hypothesentabelle |
| Ergänzung | Komplexität und Wartbarkeit (RQ3, 5.13, 5.22) | ein Abschnitt mit einer Tabelle der Kennzahlen und dem qualitativen Vergleich |
| Ergänzung | Messbetrieb, Zustellung, Replikation, Ansturm (5.10) | knapp, Zusammenfassung im Text, der Ansturm in höchstens einem Absatz |
| Anhang | vollständige Tabellen aller 39 Tests je Messgröße, rangbiseriale Korrelation, Replikation je Vergleich, Stufen von Skalierung und Sättigung je Variante, Verlauf von Pilot und Kontrollmessung | nur Tabellen, im Text verwiesen |

Regeln:

- Alle vorab festgelegten Tests werden gemessen, ausgewertet und berichtet, mindestens im Anhang. Die Schwerpunkte bestimmen nur die Ausführlichkeit, nicht, was berichtet wird.
- Die Zuordnung steht vor der Datenerhebung fest und wird nicht an Ergebnisse angepasst. Ein signifikantes Ergebnis in einem Ergänzungsthema rückt dadurch nicht in den Kern, ein fehlender Unterschied im Kern wird ebenso ausführlich berichtet wie ein vorhandener. Andernfalls entstünde selektives Berichten.
- Die Holm-Korrektur gilt unverändert über alle 39 Tests je Messgröße (5.8).
- Jede Hypothese erhält in der Hypothesentabelle eine Bewertung.
- Als Effektmaß wird im Text Cliff's Delta berichtet. Die rangbiseriale Korrelation steht nur in den Anhangstabellen und in einem definierenden Satz der Methodik (5.8).

**Reihenfolge von Kürzungen bei Zeitmangel.** Reicht die Messzeit nicht, wird in dieser Reihenfolge gekürzt, und nur so weit wie nötig:

1. Block 2 (Replikation) nur für die Kernvergleiche 1–4, 12 und 13 statt für alle dreizehn. Bei den Beispiel-Wiederholungszahlen spart das rund 2,5 Tage. Umgesetzt wird das mit `plan-campaigns.js main --block 2 --comparisons 1,2,3,4,12,13`.
2. Wiederholungszahlen je Laststufe auf das kleinste Maß senken, das der Pilot noch trägt, mindestens 20 gültige Paare (5.9).
3. Block 2 ganz entfallen lassen. Die Arbeit berichtet dann die fehlende Replikation als Grenze.

Nicht gekürzt werden Belastungstest, Pilot, Block 1 mit allen dreizehn Vergleichen, Kontrollmessung, Skalierungsreihe, Sättigungstest und Ansturm. Diese drei beschreibenden Phasen kosten zusammen weniger als einen Tag und tragen RQ2, H4 und H11. Jede Kürzung wird mit Umfang und Grund in der Arbeit genannt.

**Kürzungen im Text** (2026-10-27). Gemessen wird alles oben Genannte, der Text wird dagegen knapp gehalten. Wird die Arbeit zu lang, wandern zuerst vollständige Tabellen und der Ansturm in den Anhang. Danach werden die Grundlagen, die verwandten Arbeiten, Framework und Queue sowie Wartbarkeit gestrafft. Nicht gekürzt werden die Methodik, die Kernabschnitte der Ergebnisse, die Antworten auf RQ1 und RQ2 und die Grenzen der Arbeit. Einrichtung, Fehlersuche und die einzelnen Probeläufe gehören nicht in die Arbeit. Jede Entscheidung zur Methode bekommt höchstens einen Absatz mit dem, was entschieden wurde, warum und mit welchem Beleg.

### 5.25 Abbildungen für die Arbeit — ENTSCHIEDEN (2026-10-17)

`tools/figures` erzeugt die Abbildungen der Ergebniskapitel als Vektor-PDF aus `evaluation.json` und `series.json`, damit sie nach der Messung ohne Handarbeit entstehen und bei einer Neuauswertung identisch neu erzeugt werden können.

- **Inhalt.** Boxplots der Lauf-Werte je Vergleichsgruppe und Messgröße (Kern Sprache, Vergleiche 1–4, und Transport, Vergleiche 12 und 13, Anhang Framework, Queue), Skalierungskurven (bediente Clients, Latenz, Working Set) je Sprache und Framework-Wahl, höchste nachhaltige Rate im Sättigungstest. `figures.md` beschreibt jede Datei und nennt fehlende Werte.
- **Gestaltung** (überarbeitet am 2026-10-18). Dieselbe Gestaltung wie die TikZ-Diagramme der Arbeit (`diagram-styles.tex`, Palette A). Farbe kodiert die Sprache oder die Queue, Grau die gemeinsame Infrastruktur, die Linienart den Transport (durchgezogen SSE, gestrichelt WebSocket). Die Farbwerte stimmen mit den Diagrammen überein. Schraffur und Markierung trennen zusätzlich, was im Schwarzweißdruck sonst gleich aussähe. Schrift Latin Modern Roman wie in der Vorlage, in den Größen von `\small` und `\scriptsize` bei 11 pt, als TrueType eingebettet, damit die PDFs die PDF/A-Prüfung nicht gefährden. Die frühere eigene Palette und die Anhangsabbildungen in Graustufen sind damit ersetzt.
- **Darstellung** (geprüft am 2026-10-18 gegen gängige Regeln für wissenschaftliche Diagramme). Boxplots zeigen zusätzlich jeden Lauf als Punkt und über jedem Paar Cliff's Delta mit Stern bei Signifikanz nach Holm. Die y-Achsen beginnen bei null, weil alle Messgrößen verhältnisskaliert sind. Die Skalierungsreihe zeigt die Spannweite der Läufe je Stufe als Fehlerbalken (dafür enthält jede Stufe in `aggregate.json` Zahl, Minimum und Maximum der Läufe) und wechselt auf eine logarithmische y-Achse, wenn die Werte einen Faktor 20 übersteigen. Der Sättigungstest ist ein Punktdiagramm auf den getesteten Stufen, weil sein Ergebnis eine Stufe ist und kein stetiger Wert. `figures.md` nennt je Abbildung, was die Bildunterschrift erklären muss.
- **Umgebung.** Python mit matplotlib 3.11.2 und numpy 2.5.3 in einem eigenen Container (Basis-Image per Digest gepinnt, Latin Modern aus `fonts-lmodern` 2.005-1). Die Messwerkzeuge bleiben bei Node.js. Python wird nur für die Abbildungen gebraucht, weil matplotlib druckfähige Vektorgrafiken mit eingebetteten Schriften ohne weitere Werkzeuge erzeugt.

### 5.26 Versionen der gemessenen Software — ENTSCHIEDEN (2026-10-27)

**Anlass.** Die Basis-Images waren seit 2026-10-17 festgeschrieben, ohne dass die Wahl der Versionen begründet war. PHP lag mit 8.4 eine Version hinter dem aktuellen Stand, Node.js mit 22.11 vom Oktober 2024 zwei Hauptversionen. Bei einem Leistungsvergleich der beiden Sprachen wäre Node.js damit benachteiligt gewesen. Vor dem Pilot wurden deshalb alle gemessenen Komponenten nach einer einheitlichen Regel neu festgelegt.

**Regel.** Für jede Komponente gilt die neueste stabile Version, die am Stichtag 2026-10-27 mindestens zwei Wochen alt war. Die Regel verallgemeinert die Begründung der Laravel-Version (5.23, Punkt 9). Sie gilt für beide Sprachen gleich und vermeidet gerade erschienene Versionen, deren Fehler noch nicht bekannt sind. Maßgeblich ist das Erscheinungsdatum laut Projekt (Release-Liste von Node.js, php.net, Packagist, npm, GitHub-Releases von Redis, Änderungsprotokoll von Nginx). Für Abhängigkeiten zweiter Ordnung gilt der Stand der Lock-Dateien vom Stichtag. Nach dem Pilot ändern sich die Versionen nicht mehr.

| Komponente | bisher | neu | erschienen |
|---|---|---|---|
| PHP | 8.4 | 8.5.11 | 2026-09-24 |
| Node.js | 22.11 | 26.11.1 | 2026-10-07 |
| Laravel | 13.34.0 | 13.36.0 | 2026-10-13 |
| Reverb | 1.12.0 | unverändert, neueste | 2026-09-22 |
| Express | 4.22.2 | 5.3.0 | 2026-10-09 |
| BullMQ | 5.81.2 | 6.3.14 | 2026-10-13 |
| ioredis | in BullMQ enthalten | 6.0.0 | 2026-07-31 |
| node-redis (`redis`) | 4.7.0 | 6.3.0 | 2026-09-30 |
| ws | 8.21.1 | 8.22.0 | 2026-09-26 |
| Ratchet / clue/redis-react | 0.4.4 / 2.8.0 | unverändert, neueste | 2021-12-14 / 2025-01-03 |
| phpredis | 6.3.0 | unverändert, neueste | 2025-11-06 |
| Redis | 7.4 | 8.10.2 | 2026-09-17 |
| Nginx | 1.27 | 1.30.5, stabile Linie | 2026-09-15 |
| Composer (nur Build) | 2.8 | 2.10.3 | 2026-08-27 |

Nach der Regel ausgeschlossen waren unter anderem Node.js 26.12.1 (Sicherheitsupdate vom 2026-10-21), PHP 8.5.12 (2026-10-21), Laravel 13.37.0 bis 13.39.0, BullMQ ab 6.4, Redis 8.10.3 (2026-10-26) und Nginx 1.30.6 (2026-10-14). Für die Aussagekraft im isolierten Messnetz spielen fehlende Sicherheitskorrekturen keine Rolle.

**Nicht geändert.** k6 und xk6-sse bleiben bei 1.2.1 und 0.1.12. Sie sind das Messinstrument und arbeiten nur in dieser Kombination zusammen (Abschnitt 3). Dasselbe gilt für das Laufzeit-Image von k6 (Alpine 3.20). Python und matplotlib für die Abbildungen (5.25) beeinflussen keinen Messwert. Node.js auf dem Lastgenerator (24.22.0) steuert nur den Orchestrator.

**Anpassungen am Code.**

- BullMQ 6 bringt ioredis nicht mehr selbst mit und erwartet in ES-Modulen eine fertige Verbindung. Worker, Testproduzent und Ereignisquelle erzeugen sie deshalb selbst, der Worker mit `maxRetriesPerRequest: null`, wie es die BullMQ-Dokumentation für blockierende Abfragen verlangt. BullMQ arbeitet damit weiter mit ioredis wie bisher.
- node-redis 6 spricht standardmäßig RESP3 statt RESP2. Die Standardeinstellung bleibt, entsprechend dem Auslieferungszustand (5.5). Das veraltete `quit()` ist durch `close()` ersetzt.
- Express 5 erforderte keine Änderung, die Prototypen nutzen nur einfache Routen.
- `--legacy-peer-deps` beim Bauen entfällt, weil die neuen Versionen keine Konflikte bei Peer-Abhängigkeiten mehr haben.

**Redis 8.** Das offizielle Image lädt standardmäßig die Module für Suche, JSON, Zeitreihen, Bloom-Filter und Vektoren. Die Prototypen nutzen keines davon. Redis belegt dadurch im Leerlauf rund 22 MiB (RSS). Die Module bleiben geladen, weil das dem Auslieferungszustand entspricht und alle Zellen gleich betrifft. Die Persistenz ist unverändert (offener Punkt in Abschnitt 6).

**Prüfung** (2026-10-27, lokal, `results/2026-10-27_version-update/`). Alle Images ließen sich bauen, die Basis-Images gibt es auch für arm64. Ein Prüflauf im Produktionsbetrieb mit allen zehn Zellen verlief ohne ungültige Läufe. Bei 10 Clients wurden alle Events zugestellt, bei 500 Clients bedienten alle Zellen sämtliche Clients. Die Spitze des Working Sets bei 500 Clients lag für php-laravel-sse bei 1 022 MiB, für php-laravel-sse-queue bei 1 055 MiB und für php-minimal-sse bei 360 MiB, also im Bereich der früheren Werte. Lokal reichte das Budget von 1,5 GiB damit, auf dem Pi dagegen nicht (5.10). Der Werkzeugvergleich (5.13) ist mit den neuen Versionen wiederholt. Vor dem Pilot wird der Probelauf auf dem Pi mit den neuen Images wiederholt.

## 6. Offene Punkte

| Punkt | Stand | Klärung durch |
|---|---|---|
| Titel | zwei Vorschläge (5.23). Der Betreuer hat die Abweichungen bestätigt, aber keinen der beiden gewählt | Autorin |
| Code-Kennzahlen | auf dem Commit der Messung erheben (5.22) | vor Block 1 |
| Hardware | **Vom Betreuer geliehen und erhalten (2026-10-22).** Raspberry Pi 5 mit 4 GB, Linux-Laptop als Lastgenerator, Switch, LAN-Kabel. Einrichtung nach infra/pi/README.md, Ausstattung des Laptops dabei prüfen | Autorin |
| Pilot, Wiederholungszahlen, Ratenstufen | Verfahren festgelegt (5.9, 5.17). Der Belastungstest ist bestanden (2026-10-23, 5.14) | auf dem Pi |
| Ansturm-Phase | beschreibende Messung unter Aufsicht, nicht im unbeaufsichtigten Zeitplan, weil ein Speicherengpass den Pi kurzzeitig blockieren kann (5.9, 5.10) | Messphase |
| Festplatte unter Last | 30-minütiger Test mit gleichzeitiger CPU- und Schreiblast ausstehend (5.14) | vor dem Pilot |
| Vollständiger Probelauf | mit den Versionen aus 5.26 und dem verteilten Verbindungsaufbau wiederholen | vor dem Pilot |
| Ergebnisse vom Lastgenerator | Die Probeläufe vom 2026-10-27 liegen nur auf dem Laptop. Für die Messphase braucht der Laptop einen Weg, Ergebnisse ins Repository zu übertragen | vor dem Pilot |
| Redis-Persistenz | Redis läuft in der Standardeinstellung, die Schnappschüsse auf den Datenträger schreibt, sobald sich genug Schlüssel geändert haben. Das betrifft nur die Zellen mit Queue. Im vollständigen Probelauf prüfen, ob und wie oft das geschieht, danach entscheiden (5.20) | vor dem Pilot |
| Forschungslücke | in IEEE Xplore, ACM Digital Library und Google Scholar bestätigen (LITERATUR.md, Verwandte Arbeiten) | vor dem Schreiben des Kapitels |

## 7. Konventionen

- Prototypen enthalten minimalen Vergleichscode (Abschnitt 1).
- Konfiguration ausschließlich über `.env`. Geheimnisse (z. B. `prototypes/php-laravel/.env`) werden nie versioniert und nie in Images übernommen.
- Ergebnisdateien werden nie überschrieben (Zeitstempel im Verzeichnisnamen).
- Commit-Nachrichten auf Englisch im Format `<typ>: <zusammenfassung>` mit den Typen `feat`, `fix`, `infra`, `docs`, `test`.

## 8. Änderungsverlauf

| Datum | Änderung |
|---|---|
| 2026-07-26 | **Abschnitte 1–4.** Repository, Laufzeitumgebung, Machbarkeit von xk6-sse, Portabilität |
| 2026-08-25 | Debugging- und Monitoring-Vergleich durchgeführt (5.13). Statistische Methodik erstmals festgelegt (5.8) |
| 2026-10-16 | **Abstimmung mit dem Betreuer.** Nginx (5.1), HTTP/1.1 (5.2), Redis (5.4), PHP-FPM (5.5), gleiches Budget (5.6), Raspberry Pi (5.14), deskriptive Kennzahlen (5.8), JSON-Protokoll (5.16). Gepaarter Wilcoxon-Test ersetzt Mann-Whitney-U, Holm ersetzt Bonferroni. Ratchet-WebSocket-Server für php-minimal ergänzt. |
| 2026-10-16 | **Erste Überprüfung des Messaufbaus (zwölf Befunde).** Skript und Messgröße pro Zelle (5.9), Reverb hinter dem Front-Nginx (5.6.1), Speicherlimit 2 GiB (5.10), paarweise Kampagnen (5.6.3), Paarbildung über die Laufnummer und Mittelwert pro Lauf (5.8), Durchsatz und Zustellung (5.17), Budget pro Zelle (5.6.2), Messprotokoll mit Ressourcenmessung (5.16), Pi mit separatem Lastgenerator (5.14), Holm je Messgröße, Pilot vor den Hauptkampagnen (5.8, 5.9). Frühere Prüfberichte. REVIEW.md, METHODOLOGY-REVIEW.md (historisch). |
| 2026-10-16 | **Zweite Überprüfung (Bewertung als Bachelorarbeit, neun Befunde).** Produktionsbetrieb (5.5), Einschwingzeit und Verbindungsaufbau (5.9), Redis im Ressourcenvergleich (5.6.2, 5.8), Messphasen mit Replikation, Skalierungsreihe und Kontrollmessung (5.9), Queue-Achse mit Vergleichen 9–11 (5.15, 5.19), Hypothesen (5.18), verwandte Arbeiten (LITERATUR.md), ein Nginx pro Zelle ohne Brücke (5.6.1), Grenzen der Testlast (5.21), Abweichungen von der Standardkonfiguration (5.20). |
| 2026-10-16 | **Betrieb.** Pilot-Kampagnen und Namenspräfix für Probeläufe in `plan-campaigns.js` (5.9), Statusbericht und Benachrichtigung für den Dauerbetrieb, Einrichtungsskript für den Pi (5.14). |
| 2026-10-16 | **Abgleich mit dem Exposé (5.23).** Transportvergleiche 12 und 13 und Hypothesen H9 bis H11 (5.15, 5.18), Testfamilien mit 39 Tests (5.8), beschreibender Transportvergleich über Skalierung und Sättigung (`series.js`), Code-Kennzahlen zu Komplexität und Wartbarkeit (5.22), Upgrade auf Laravel 13.34.0 (5.23), Quellen zu Spezifikationen und eingesetzten Technologien (LITERATUR.md), Ergebnistabellen mit Dezimalpunkt. |
| 2026-10-17 | Quellen des Exposés geprüft und übernommen, zwei Angaben korrigiert, eine verworfen (LITERATUR.md). Weitere Abweichungen vom Exposé ergänzt (eigenständige Prototypen, Queue als Achse, Erwartung zur Latenz, 5.23). |
| 2026-10-17 | Schwerpunkte der schriftlichen Arbeit und Reihenfolge von Kürzungen festgelegt (5.24), Cliff's Delta als einziges Effektmaß im Text (5.8). Außerdem `tools/monitor` und `tools/redis-baseline` entfernt und frühere Prüfberichte nach `docs/archive/` verschoben. |
| 2026-10-17 | Alle Basis-Images auf Multi-Arch-Digests gepinnt (README.md, Versionen) und mit einer Prüfkampagne über alle zehn Zellen bestätigt. Alle Literaturangaben über Crossref bzw. Open Library bestätigt, Prüfvermerke aufgelöst. Fehlersichtbarkeit der Laravel-Queue unter Laravel 13 bestätigt (5.13). |
| 2026-10-17 | **Prüfung durch den Schreib-Chat umgesetzt.** Entscheidungsregeln der Hypothesen (5.18), Verbindungsaufbau als vierte Testfamilie (5.8), Regel für die Replikation (5.8), Kriterien und Last von Skalierung, Sättigung und Kontrollmessung (5.9), H6 und H8 im Kern, H2 übergreifend (5.24), englischer Wortlaut der Hypothesen in `plan.json`, unterschiedliche k6-Skripte in Vergleich 4 als Grenze (5.15). |
| 2026-10-17 | Abbildungswerkzeug `tools/figures` (5.25). Auslegung des Budgets geklärt, Vergleichseinheit ist die Zelle (5.6.2). Mehrwert für Entwickler als Maßstab der Abweichungen vom Exposé (5.23). |
| 2026-10-27 | **Verteilter Verbindungsaufbau als Standard, Phase Ansturm, Speicherspitze laut Kernel (5.9, 5.10, 5.16).** Alle Messphasen verbinden die Clients über 5 s verteilt. Das Budget von 1,5 GiB bleibt und ist auf dem Pi mit beiden Laravel-Zellen bei 500 Clients bestätigt. Der gleichzeitige Ansturm wird beschreibend gemessen (`phase: storm`). |
| 2026-10-27 | **Verteilter Verbindungsaufbau als Einstellung (5.10, Möglichkeit 5).** `connectSpreadSeconds` in Kampagnen und `--connect-spread` in `plan-campaigns.js`, Standard 0. Lokal senkt ein über 5 s verteilter Aufbau die Spitze von php-laravel-sse bei 500 Clients von 1 350 auf 1 052 MiB. |
| 2026-10-27 | **Speicherbudget auf dem Pi unzureichend (5.10).** Laravel/SSE scheitert bei 500 Clients mit 1,5 GiB je Zelle, unabhängig von der Seitengröße. Mit 3 GiB gültig, mit 2 GiB im ungünstigsten Paar Neustart des Pi. Pi 5 mit 8 GB erwogen, Möglichkeiten bewertet. |
| 2026-10-27 | **Zwei-Rechner-Aufbau erprobt, Kernel mit 4-KB-Seiten, Systemprotokoll dauerhaft (5.14, 5.20).** Fünf von neun Kampagnen des zweiten Probelaufs liefen vollständig. `setup.sh` richtet Kernel und Protokoll jetzt selbst ein. |
| 2026-10-27 | **Versionen nach einheitlicher Regel neu festgelegt (5.26).** Neueste Version, die am Stichtag mindestens zwei Wochen alt war, für PHP (8.5.11), Node.js (26.11.1), Laravel (13.36.0), Express (5.3.0), BullMQ (6.3.14), Redis (8.10.2) und Nginx (1.30.5). Anpassungen für BullMQ 6 und node-redis 6. |
| 2026-10-27 | **Erster Probelauf auf dem Pi ungültig.** `targetBaseUrl` endete mit einem Schrägstrich, k6 fragte deshalb `//sse` und `//ws` an, und alle Zellen antworteten mit 404. Orchestrator und k6 entfernen den Schrägstrich jetzt selbst. |
| 2026-10-27 | **Lastgenerator eingerichtet (5.14).** Docker 29.9.2 und Compose 5.6.1 wie auf dem Pi, Versionen festgehalten, automatische Updates und Ruhezustand abgeschaltet, feste Adresse im Messnetz. |
| 2026-10-23 | **Alle Zellen auf dem Pi gestartet (5.14).** Kein Neustart, Working Set im Leerlauf wie lokal, SSE-Durchlauf bis zum Client funktioniert. Redis-Persistenz als offener Punkt aufgenommen. |
| 2026-10-23 | **Belastungstest bestanden (5.14).** 24 Stunden Volllast, Takt durchgehend 2 400 MHz, höchstens 67,2 °C, keine Drosselung. Rohdaten in `results/`. |
| 2026-10-22 | **Einrichtung auf dem Pi erprobt (5.14).** `setup.sh`, Images und Sampler laufen. Den Drosselstatus liest der Orchestrator auf dem Pi 5 per `vcgencmd`, weil sysfs ihn nicht bereitstellt. Ein nicht lesbarer Status macht einen Lauf ungültig. |
| 2026-10-22 | **Eingesetzte Hardware dokumentiert (5.14).** USB-Festplatte statt SSD, Laptop mit Debian Testing und Node.js 24 als Lastgenerator, Messnetz mit zwei Kabeln. |
| 2026-10-22 | Hardware erhalten (Raspberry Pi 5 mit 4 GB), Endwerte 2 CPUs / 1,5 GiB je Zelle (5.10). `setup-slices.sh` prüft, dass zwei Zellen plus Reserve in den Arbeitsspeicher passen, `setup.sh` meldet die Seitengröße des Kernels. |
| 2026-10-19 | **Antwort des Betreuers.** Messaufbau, Vergleiche und Abweichungen vom Exposé bestätigt (5.23), KI-Nutzung einschließlich Programmierunterstützung und Textentwürfen bestätigt, Hardware wird geliehen. Ausweichwert von 1,5 GiB je Zelle für einen Pi mit 4 GB (5.10). |
| 2026-10-18 | **Darstellung der Abbildungen überarbeitet.** Einzelläufe, Cliff's Delta, Achsen ab null, Streuung und logarithmische Achse in der Skalierungsreihe, Punktdiagramm für den Sättigungstest, Hinweise für Bildunterschriften. Stufen der Skalierungsreihe mit Zahl, Minimum und Maximum der Läufe (5.25). |
| 2026-10-18 | **Abbildungen an die TikZ-Diagramme angeglichen.** Palette A, Linienart nach Transport, Schrift Latin Modern der Vorlage als TrueType (5.25). |
| 2026-10-18 | Übergeordnete Forschungsfrage in einem Satz ergänzt, RQ1 bis RQ3 als Unterfragen (5.23). |
| 2026-10-18 | Abweichungen vom Exposé nur in den Entwürfen für den Betreuer, nicht in der Abgabefassung (5.23). Rangbiseriale Korrelation mit einem definierenden Satz in der Methodik (5.8, 5.24). |
| 2026-10-18 | **Frage 8 geklärt.** Die Betreuerantwort betrifft das Messprotokoll (5.16), der Werkzeugvergleich bleibt als Teil von RQ3 (5.3) und ist mit den gemessenen Versionen wiederholt (5.13). Erledigten Punkt zu den Literaturangaben aus den offenen Punkten entfernt. |
| 2026-10-18 | **Zwei Titelvorschläge an den Betreuer.** „Event-Driven Notification Systems in PHP and Node.js: A Performance Comparison of Server-Sent Events, WebSockets and Queues" und „Event-Driven Notification Systems in PHP and Node.js: A Comparative Study of Server-Sent Events, WebSockets and Queues under Load" (5.23). |
| 2026-10-18 | **Bezug zu Lokato im Event-Weg dokumentiert.** Lokato verteilt über Datenbank und Änderungssignal im 500-ms-Takt, MQTT nur als Geräteeingang. Gründe für einen Broker und für Redis statt MQTT (5.4). |
