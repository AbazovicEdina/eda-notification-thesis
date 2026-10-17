# Entscheidungsprotokoll

Dieses Dokument hält die Architektur- und Methodikentscheidungen des Messaufbaus mit ihrer Begründung fest und dient als Grundlage für das Methodik-Kapitel der Arbeit. Weichen Implementierung und Dokument voneinander ab, ist das Dokument maßgeblich; die Implementierung wird angepasst.

Status der Abschnitte:

- **ENTSCHIEDEN**: festgelegt und umgesetzt bzw. verbindlich für die Umsetzung.
- **OFFEN**: noch zu klären; der Arbeitsstand ist angegeben.
- **ENTFÄLLT**: verworfene Option, zur Nachvollziehbarkeit dokumentiert.

Abstimmungen mit dem Betreuer (Mag. Volker Christian) sind mit Datum vermerkt. Den Verlauf der Änderungen enthält Abschnitt 8, die offenen Punkte Abschnitt 6.

---

## 1. Repository-Struktur: Monorepo — ENTSCHIEDEN

Ein Repository enthält alle Prototypen, k6-Skripte, Infrastruktur, Werkzeuge und Ergebnisse (Struktur: README.md).

Begründung:

- Die Prototypen teilen Docker-Compose-Aufbau, k6-Skripte, `.env`-Konventionen und Auswertung. Getrennte Repositories würden diese gemeinsamen Teile duplizieren und auseinanderlaufen lassen.
- Nebeneinanderliegende Prototypen (`prototypes/php-*`, `prototypes/node-*`) machen Unterschiede direkt sichtbar.
- Eine gemeinsame Commit-Historie dokumentiert den Arbeitsfortschritt.

Trennungsprinzip: `prototypes/` enthält ausschließlich minimalen, lesbaren Vergleichscode ohne Komfortfunktionen. Hilfsserver sowie Mess- und Auswertungswerkzeuge liegen in `tools/`, Infrastruktur-Konfiguration in `infra/`.

## 2. Laufzeitumgebung: Docker Compose — ENTSCHIEDEN

PHP, Node.js, Redis, Nginx und k6 laufen ausschließlich als Container. Ausgenommen ist das Steuerwerkzeug `tools/orchestrate`: Es ruft selbst Docker auf und läuft deshalb direkt mit Node.js auf dem steuernden Rechner.

Begründung:

- Identisches Verhalten unter Windows, macOS und Linux ohne manuelle Anpassung; native Installationen driften (Versionen, Pfade).
- k6 benötigt für SSE einen eigenen Build mit der Erweiterung xk6-sse (Abschnitt 3). Der Go-Build läuft im Container (Multi-Stage, `k6/Dockerfile`), eine lokale Go-Installation entfällt.
- Der Wechsel auf die Zielumgebung (5.14) erfordert nur Docker und Compose v2.

Lokale Messwerte dienen ausschließlich der Funktions- und Plausibilitätsprüfung. Die Ergebnisse der Arbeit entstehen auf dem Raspberry-Pi-Testserver (5.14).

Mechanik:

- `docker-compose.yml`: portable Basis ohne umgebungsspezifische Einstellungen, mit Log-Rotation für alle Dienste.
- `docker-compose.override.yml`: lokale Abweichungen (z. B. Host-Ports für manuelle Tests), nicht versioniert; Vorlage `docker-compose.override.example.yml`.
- `docker-compose.pi.yml`: Ergänzung für den Pi (im Netz veröffentlichte Ports, cgroup-Slice pro Zelle), aktiviert über `COMPOSE_FILE` in der `.env`.
- Parameter ausschließlich über `.env` (Vorlage `.env.example`), nicht versioniert.
- k6 erreicht die Ziele lokal über Service-Namen im Compose-Netzwerk, im Zwei-Rechner-Aufbau über die Adresse des Pi.

## 3. Machbarkeit von xk6-sse — ENTSCHIEDEN (geprüft am 2026-07-26)

k6 unterstützt WebSockets nativ (`k6/ws`), SSE nur über die Community-Erweiterung [xk6-sse](https://github.com/phymbert/xk6-sse) (`k6/x/sse`). Diese blockiert die jeweilige VU (virtueller Benutzer in k6), solange die Verbindung offen ist. Geprüft wurde, ob die Latenzmessung damit bei nennenswerter Nebenläufigkeit stabil bleibt.

Prüfaufbau:

- `tools/sse-feasibility/`: minimaler SSE-Server ohne Abhängigkeiten, sendet pro Verbindung alle `EVENT_INTERVAL_MS` ein Event `{"seq":n,"ts":<ms-epoch>}`.
- `k6/scripts/sse-feasibility.js` (damalige Fassung): N VUs halten je eine Verbindung über `K6_HOLD_SECONDS` und messen pro Event Empfangszeit minus `ts`.

Ergebnis (lokal, Docker unter Windows 11/WSL2):

| Lauf | VUs | Dauer | Events erwartet | Events empfangen | Latenz avg | p95 | max | Fehler |
| ---- | --- | ----- | --------------- | ---------------- | ---------- | --- | --- | ------ |
| 1 | 50 | 60 s | 3 000 | 3 000 (100 %) | 0,10 ms | 1 ms | 2 ms | 0 |
| 2 | 200 | 60 s | 12 000 | 12 000 (100 %) | 0,07 ms | 1 ms | 1 ms | 0 |

Rohausgaben: `results/xk6-sse-feasibility-50vu.txt`, `results/xk6-sse-feasibility-200vu.txt`.

Bewertung: xk6-sse ist tragfähig. Es gingen keine Events verloren, alle Verbindungen blieben über die volle Haltedauer stabil, und die Latenzverteilung war auch bei 200 Verbindungen eng. xk6-sse blockiert nur die jeweilige VU (eine Goroutine pro Verbindung), nicht den Prozess. Da das Testdesign pro Verbindung eine VU vorsieht (`holdScenario()` in `k6/lib/config.js`), ist das Blockieren unkritisch. SSE-Tests laufen daher über xk6-sse, WebSocket-Tests über `k6/ws`.

Abgebrochene Zwischenschritte während der Prüfung (ohne Einfluss auf die Ergebnisse):

1. Ein manueller curl-Aufruf des SSE-Endpunkts endete mit Exit-Code 28. Das ist erwartet: curl war mit `-m 4` auf vier Sekunden begrenzt, und ein SSE-Stream endet nicht von selbst.
2. Der erste 50-VU-Lauf brach mit Exit-Code 107 ab, weil das k6-Binary die Erweiterung nicht aktiv hatte (Einschränkung 1). Der Abbruch erfolgte vor Teststart beim Auflösen des Imports; es entstanden keine Messdaten.
3. Docker Desktop lief zu Beginn noch nicht. Dieser Schritt hat keinen Bezug zu den Messschritten.

Beide Ergebnisläufe stammen vom korrigierten Binary, dessen aktive Erweiterung vorher per `k6 version` geprüft wurde („github.com/phymbert/xk6-sse v0.1.12, k6/x/sse [js]"). Die Zustellraten von 100 % sind damit uneingeschränkt gültig.

Einschränkungen:

1. **Versionen sind gepinnt.** `xk6 build` ohne Versionsangabe baut k6 v2 (Modulpfad `go.k6.io/k6/v2`). xk6-sse v0.1.12 hängt am v1-Modulpfad und wird dann zwar kompiliert, ist zur Laufzeit aber nicht aktiv. `k6/Dockerfile` pinnt daher k6 v1.2.1, xk6-sse v0.1.12 und den Builder `grafana/xk6:1.4.7`. Der Orchestrator prüft vor jedem Lauf, ob die Erweiterung aktiv ist, und protokolliert die Versionsausgabe.
2. Die Machbarkeit wurde mit 1 Event/s pro Verbindung geprüft. Höhere Raten deckt der Sättigungstest ab (5.17).
3. Die Zeitauflösung beträgt 1 ms (`Date.now()`). Die Konsequenz für die Auswertung beschreibt 5.8.
4. Absolute lokale Latenzwerte sind nicht belastbar; geprüft wurden Stabilität und Plausibilität.

## 4. Portabilität — ENTSCHIEDEN

Jede Zielumgebung benötigt nur Docker und Compose v2: Repository klonen, `.env` anlegen, Images bauen. Die Einrichtung des Raspberry-Pi-Testservers und des Lastgenerators beschreibt `infra/pi/README.md`. Alle Images basieren auf offiziellen Multi-Architektur-Images, die auch für ARM64 verfügbar sind (geprüft am 2026-10-16, einschließlich `grafana/xk6:1.4.7`).

## 5. Methodische Entscheidungen

### 5.1 Webserver: Nginx für alle Zellen — ENTSCHIEDEN (abgestimmt am 2026-10-16)

Vorgabe: Alle Vergleiche laufen mit demselben Webserver. Welcher Webserver (Nginx oder Apache) schneller wäre, wird in der Arbeit literaturgestützt diskutiert, nicht gemessen.

Gewählt ist Nginx. Begründung:

- Nginx ist vor allen Zellen gebaut und geprüft (`infra/nginx/`). Ein Wechsel auf Apache erforderte `mod_proxy_fcgi` für PHP-FPM und `mod_proxy_wstunnel` für WebSockets, ohne Erkenntnisgewinn gegenüber der Literaturdiskussion.
- Nginx arbeitet wie Node.js ereignisbasiert mit einer asynchronen Verarbeitungsschleife, Apache je nach MPM mit einem Prozess oder Thread pro Verbindung. Dieser Unterschied fügt sich in die Diskussion von PHP-FPM (Worker pro Verbindung) gegenüber Node.js (Event Loop) ein.

Den Aufbau des Front-Nginx (HTTP-Proxy bzw. FastCGI) beschreibt 5.6.1. Ein Apache-Messaufbau ist nicht vorgesehen (5.11).

### 5.2 HTTP-Version: HTTP/1.1 — ENTSCHIEDEN (abgestimmt am 2026-10-16)

Alle Messungen laufen über HTTP/1.1. SSE funktioniert über HTTP/1.1 uneingeschränkt (Abschnitt 3). Ein HTTP/2-Messlauf ist nicht vorgesehen; die Arbeit erläutert den Unterschied zwischen HTTP/1.1 und HTTP/2 für SSE. Der mögliche Vorteil von HTTP/2 betrifft SSE: Multiplexing über eine Verbindung umgeht das Limit von sechs gleichzeitigen Verbindungen pro Origin, das Browser unter HTTP/1.1 einhalten. Dieser Effekt betrifft Browser-Clients und wird von k6 nicht abgebildet. Bei WebSockets ist nach dem Upgrade das WebSocket-Protokoll maßgeblich, die HTTP-Version spielt danach kaum eine Rolle.

### 5.3 Debugging- und Monitoring-Vergleich: Kriterien — ENTSCHIEDEN, durchgeführt (5.13)

Die Entwicklungswerkzeuge beider Stacks werden anhand von drei Kriterien verglichen:

1. Verfügbares Tooling (Debugger, Profiler, Log-Integration).
2. Nachvollziehbarkeit eines Events über Queue-Grenzen hinweg per Correlation-ID.
3. Sichtbarkeit von Fehlern in Queue-Workern.

Die Betreuerantwort zu Frage 8 des Abstimmungstermins betrifft das Telemetrie-Logging der Testläufe (5.16). Ob sie den Werkzeugvergleich ersetzt oder ergänzt, ist offen (Abschnitt 6).

### 5.4 Event-Backbone: Redis Pub/Sub — ENTSCHIEDEN (abgestimmt am 2026-10-16)

Alle Prototypen beziehen die Events aus Redis Pub/Sub. Den MQTT-Eingang des Ausgangsprojekts Lokato ersetzen Ereignisquellen (`tools/event-simulator`, für die Laravel-Queue `scan:produce`), die direkt nach Redis publizieren bzw. in die Queue einreihen. Gemessen wird die Strecke Redis → Backend → Client, nicht der MQTT-Eingang.

Auch die Minimalvariante nutzt Redis Pub/Sub; sie verzichtet nur auf Framework und Queue-Worker. Eine Variante ganz ohne Broker würde nur die Verbindungskosten pro Client messen, nicht den Zustellweg eines Events, und ist für die Fragestellung nicht ergiebig. Damit ist eine missverständliche Formulierung („Minimalvariante ohne Broker") in den Unterlagen zum Abstimmungstermin aufgelöst.

Festlegungen:

- Die Ereignisquelle setzt den Zeitstempel `ts` beim Senden. Die gemessene Latenz ist damit Ende-zu-Ende einschließlich der Verarbeitung im Backend. Ein Backend kann zusätzlich `sut_ts` (eigene Sendezeit) setzen; ausgewertet wird `ts`.
- Event-Format: ein Scan-Event im Originalformat von Lokato (`event`, `device`, `uid`, `timestamp`), ergänzt um die Messfelder `seq` (laufende Nummer, Verlustzählung, 5.17) und `ts`. Größe ca. 140 Byte (5.21).
- Jedes Backend hält **eine** Redis-Subscription pro Prozess und verteilt die Events prozessintern an alle Clients. Eine Subscription pro Verbindung würde Redis zum Engpass machen und die Stacks unterschiedlich stark verzerren. Ausnahme ist PHP-FPM/SSE: Dort ist jeder Worker ein eigener Prozess mit eigener Verbindung; die Verteilung an alle Clients übernimmt Redis (5.6.2, H8).

### 5.5 PHP-Laufzeitmodell und Betriebsmodus — ENTSCHIEDEN (abgestimmt am 2026-10-16)

SSE läuft über PHP-FPM, WebSockets über einen separaten, langlaufenden Prozess. Durchgehend asynchrones PHP (Octane/Swoole) ist nicht vorgesehen. Gründe, warum PHP-FPM den höheren Vergleichswert hat:

1. **Konstruktvalidität.** PHP-FPM mit einem Worker pro Verbindung ist die Standard-Betriebsart von PHP hinter einem Webserver: Das PHP-Handbuch beschreibt FPM als FastCGI-Implementierung für den Betrieb hinter Webservern, und die Nginx-Beispielkonfiguration der Laravel-Deployment-Dokumentation leitet Anfragen an PHP-FPM weiter (LITERATUR.md). Eine Erhebung zur Verbreitung in der Praxis liegt nicht vor; die Arbeit formuliert deshalb „Standard-Betriebsart laut Dokumentation", nicht „dominante Betriebsart". Ein Ergebnis mit Octane/Swoole wäre eine Aussage über asynchrones PHP, nicht über PHP in üblicher Betriebsweise.
2. **Sichtbarer Architekturunterschied.** Worker pro Verbindung (PHP-FPM) gegenüber Event Loop (Node.js) ist der Kern des Vergleichs. Beide Seiten asynchron zu bauen, würde genau diesen Unterschied einebnen.
3. **Nähe zum Ausgangsprojekt.** Lokato läuft unter klassischem PHP-FPM.

Umsetzung:

- **PHP/SSE:** PHP-FPM mit `pm = static` und `pm.max_children = 550` (über der Zielzahl von 500 Clients), für `php-minimal` und `php-laravel`.
- **PHP/WS:** Laravel Reverb (`php-laravel`) bzw. Ratchet auf ReactPHP mit asynchronem Redis-Client (`php-minimal`, `ws.php`).
- **Speicher pro Verbindung ist eine Messgröße**, kein Störfaktor. Lokale Messung mit 500 SSE-Clients im Produktionsbetrieb (2026-10-16): Spitze des Working Sets bei php-laravel/SSE ca. 1 390 MiB, bei php-minimal/SSE ca. 375 MiB (Konsequenz für die Limits: 5.10). Nach dem Upgrade auf Laravel 13 (5.23) lag die Spitze in einem kürzeren Prüflauf (10 s Haltezeit) bei ca. 1 010 MiB; der maßgebliche Wert wird auf dem Pi erhoben.

**Betriebsmodus: Produktion nach offizieller Dokumentation, ohne darüber hinausgehendes Tuning** (beschlossen am 2026-10-16). Die Begründung „PHP in üblicher Betriebsweise" trägt nur, wenn die Stacks auch so konfiguriert sind, wie sie produktiv betrieben werden:

| Stack | Einstellung | Quelle |
|---|---|---|
| PHP allgemein | `php.ini-production` | Dokumentation des offiziellen PHP-Images |
| Laravel | `APP_ENV=production`, `APP_DEBUG=false`, `LOG_LEVEL=warning`; Konfiguration, Routen und Events beim Start gecacht (`docker/start.sh`; kein View-Cache, da keine Views) | Laravel-Deployment-Dokumentation |
| Node.js / Express | `NODE_ENV=production` | Express-Dokumentation (Produktionsbetrieb) |

Für die Fehlersuche ist lokal per `.env` auf Entwicklung umschaltbar. Der Orchestrator protokolliert den Modus jedes Containers in jedem Lauf und bricht Pilot-, Haupt- und Kontrollkampagnen ab, wenn eine Zelle nicht im Produktionsbetrieb läuft. Der Werkzeugvergleich (5.13) wurde dagegen bewusst im Entwicklungsbetrieb durchgeführt, weil Debugging in der Entwicklung stattfindet.

### 5.6 Fairness-Regeln — ENTSCHIEDEN (abgestimmt am 2026-10-16; Präzisierung in 5.6.2 offen)

**Node.js läuft als einzelner Prozess** ohne `cluster`-Modul. Wie PHP-FPM ist das der ökosystemtypische Standardbetrieb ohne gezielte Zusatzoptimierung. Eine Konsequenz ist in der Arbeit zu berichten: Ein Node-Prozess führt JavaScript auf einem Kern aus und kann ein Budget von zwei Kernen strukturell nicht ausschöpfen, PHP-FPM mit mehreren Worker-Prozessen dagegen schon. Gleiches Budget bedeutet gleiche Zuteilung, nicht gleiche Ausschöpfbarkeit. Die tatsächlich genutzte CPU-Zeit wird pro Lauf gemessen (5.16) und macht den Effekt sichtbar.

#### 5.6.1 Einheitliche Topologie: genau ein Nginx pro Zelle

Alle Zellen laufen hinter demselben Front-Nginx (`infra/nginx/`). Er arbeitet je nach Zelle in einem von zwei Modi, sodass jede Zelle genau einen Nginx durchläuft, wie im realen Betrieb:

| Modus | Zellen | Weg |
|---|---|---|
| `http` (`templates/http/`) | Node.js (SSE, WS), php-minimal/WS (Ratchet), php-laravel/WS (Reverb) | Client → Nginx (HTTP-Proxy) → Server |
| `fastcgi` (`templates/fastcgi/`) | PHP-FPM/SSE (php-minimal, php-laravel, php-laravel mit Queue) | Client → Nginx (FastCGI) → PHP-FPM |

Ein früherer Aufbau leitete PHP-FPM über eine zweite Nginx-„Brücke" hinter dem Front-Nginx. Das gab PHP einen Nginx mehr als Node.js und als im realen Betrieb; die Brücke wurde am 2026-10-16 entfernt.

Pflicht-Direktiven in beiden Modi: keine Pufferung (`proxy_buffering off` bzw. `fastcgi_buffering off`), kein gzip, gleicher Lese-Timeout weit über dem Event-Intervall; im HTTP-Modus Upgrade-Header für WebSockets (Pfade `/ws` und `/app/` für Reverb); `worker_connections` und Dateideskriptor-Limits mindestens doppelt so hoch wie die Zielzahl der Clients. Die Erreichbarkeit prüft der Orchestrator vor jedem Lauf über `/healthz` (bei PHP-FPM der eingebaute `ping.path` des Pools).

Der Weg eines Events nach Redis unterscheidet sich je Zelle durch die Architektur der Stacks:

| Zelle | Weg nach Redis |
|---|---|
| Node.js, SSE und WS | Redis → Node-Prozess → Nginx → Client |
| php-minimal/WS | Redis → Ratchet-Prozess → Nginx → Client |
| php-laravel/WS | Redis → Listener → HTTP-Aufruf → Reverb → Nginx → Client (Standardweg von Laravel-Broadcasting) |
| PHP-FPM/SSE | Redis (Verteilung an N Abonnenten) → FPM-Worker → Nginx (FastCGI) → Client |
| mit Queue (5.19) | Ereignisquelle → Queue → Worker → Redis Pub/Sub → … wie oben |

#### 5.6.2 Gleiches Ressourcenbudget pro Zelle

Jede Zelle erhält dasselbe CPU- und Speicherbudget (Werte: 5.10). Vergleichseinheit ist die **Zelle**, nicht der Container: Zellen bestehen teils aus mehreren Containern, die jedes Event durchläuft (Reverb und Listener; FPM-Pool und Queue-Worker). Ein Limit pro Container würde diesen Zellen insgesamt mehr Ressourcen zugestehen. Eine lokale Messung am 2026-10-16 zeigt, wie groß dieser Anteil sein kann: Bei php-laravel/WS entfiel in einem Lauf mit 50 Clients der größere Teil der CPU-Zeit auf den Listener (0,064 s gegenüber 0,020 s für Reverb). Ohne gemeinsames Budget liefe dieser Teil unbegrenzt.

Umsetzung:

- Auf dem Pi liegen alle Container einer Zelle in einer gemeinsamen systemd-Slice (`eda_<zelle>.slice`) mit `CPUQuota` und `MemoryMax` (`docker-compose.pi.yml`, `infra/pi/setup-slices.sh`).
- Zusätzlich gilt pro gemessenem Container dasselbe Limit (`x-sut-resources` in `docker-compose.yml`). Lokal ist das die einzige Begrenzung; lokale Werte dienen nur der Funktionsprüfung.
- SUT-Container nutzen keinen Swap (`memswap_limit` gleich `mem_limit`, auf dem Pi zusätzlich `MemorySwapMax=0`).

**Redis außerhalb des Budgets.** Redis ist gemeinsame Infrastruktur und gehört zu keiner Zelle. Bei PHP-FPM/SSE übernimmt Redis aber die Verteilung an alle Clients (eine Subscription pro Worker), bei allen anderen Zellen der Zellprozess selbst. Damit diese Verlagerung den Vergleich nicht verzerrt, wird Redis in jedem Lauf mitgemessen, und die Ressourcen-Familien der Statistik verwenden den Gesamtverbrauch „Zelle + Redis" (5.8, 5.16). Zelle und Redis werden zusätzlich einzeln berichtet.

Offen: Die Betreuervorgabe lautete „gleiches Budget pro Container". Sie wird als „gleiches Budget pro verglichenem System" ausgelegt, da sie vermutlich von einem Container pro Zelle ausging. Die Bestätigung steht aus (Abschnitt 6).

#### 5.6.3 Nur die Zellen der laufenden Kampagne sind gestartet

Während einer Kampagne laufen ausschließlich die Container der gemessenen Zellen sowie Redis, Front-Nginx, `resource-sampler` und die benötigten Ereignisquellen. Nicht gemessene Zellen sind nicht untätig: Sie halten Redis-Subscriptions, verarbeiten jedes Event mit und belegen Speicher (statische FPM-Pools). Der Orchestrator stoppt deshalb vor Kampagnenbeginn alle übrigen Dienste und startet die benötigten.

Das alternierende Design (5.9) benötigt beide Zellen eines Vergleichs gleichzeitig. Gemessen wird daher **paarweise**: eine Kampagne pro geplantem Vergleich und Laststufe (5.15). Die gegenseitige Störung innerhalb eines Paares ist symmetrisch. Da jede Zelle in mehreren Vergleichen vorkommt, wird sie in mehreren Kampagnen gemessen.

### 5.7 Messumfang: Minimal- und Framework-Variante — ENTSCHIEDEN

Gemessen werden beide Varianten pro Sprache:

- **Framework-Variante** (`php-laravel`, `node-express`): Hauptvergleich PHP gegenüber Node.js, nahe am realistischen Einsatz in Lokato.
- **Minimalvariante** (`php-minimal`, `node-minimal`): Baseline ohne Framework. Sie zeigt, ob ein Unterschied von Sprache und Laufzeit kommt oder vom Framework.

Daraus ergeben sich acht Zellen (2 Sprachen × 2 Transportarten × 2 Varianten). In diesen acht Zellen liegt keine Queue im Weg; der Vergleich Minimal- gegenüber Framework-Variante zeigt damit Framework-Overhead, nicht zusätzlich Queue-Overhead. Die Queue ist eine eigene, dritte Achse mit zwei zusätzlichen Zellen (5.19).

### 5.8 Statistische Auswertung — ENTSCHIEDEN (vor der Datenerhebung festgelegt)

Alle Festlegungen dieses Abschnitts sind vor der Hauptmessung getroffen und in `tools/orchestrate/plan.json` maschinenlesbar fixiert. Testverfahren, Schwellenwerte, Testfamilien und Hypothesen (5.18) werden nicht nachträglich an Ergebnisse angepasst. Quellen: LITERATUR.md.

**Analyseeinheit: der k6-Lauf.** Events innerhalb eines Laufs teilen Prozesszustand und Host-Auslastung und sind nicht unabhängig. Sie als Stichprobe zu behandeln, wäre Pseudoreplikation (Hurlbert 1984). Jeder Lauf liefert pro Messgröße einen Wert, verglichen werden diese Werte über die Läufe hinweg.

**Messfenster.** Gewertet werden nur Events nach einer Einschwingzeit von 10 s ab dem gemeinsamen Start aller Clients, über eine Haltezeit von 60 s (5.9). Der Verbindungsaufbau wird getrennt gemessen.

**Kennzahl pro Lauf: Mittelwert der Latenz.** Die Zeitstempel haben eine Auflösung von 1 ms (Abschnitt 3). Jede einzelne Latenz ist daher ganzzahlig, und auch der Median eines Laufs ist fast immer eine ganze Zahl. Bei niedriger Last liegen beide Zellen eines Vergleichs oft auf demselben Median. Solche Paare haben die Differenz 0 und fallen aus dem Wilcoxon-Test heraus; im ersten lokalen Probelauf betraf das alle Paare. Der Rundungsfehler pro Event ist dagegen gleichverteilt und im Mittel null, weil Senden und Empfangen nicht im Millisekundentakt erfolgen. Über viele Events mittelt er sich heraus, sodass der Mittelwert pro Lauf fein aufgelöst und unverzerrt ist (Quantisierungsrauschen; Widrow & Kollár 2008). Der Mittelwert reagiert stärker auf Ausreißer als der Median. Das ist vertretbar, weil Ausreißer reale Nutzererfahrung abbilden und die Robustheit des Vergleichs aus dem nichtparametrischen Test über die Läufe hinweg kommt. Median, p95, p99 und Maximum werden zusätzlich beschreibend berichtet, da Tail-Latenzen für Nutzer oft wichtiger sind als der Durchschnitt (Dean & Barroso 2013).

**Deskriptive Kennzahlen** (Vorgabe vom 2026-10-16): Für jede Messgröße und Zelle werden über die Läufe Mittelwert, Minimum, Maximum, Median, p95, p99, Standardabweichung und Varianz ausgegeben.

**Signifikanztest: Wilcoxon-Vorzeichen-Rang-Test** (gepaart, zweiseitig, α = 0,05; Wilcoxon 1945).

- Ein Paar besteht aus den beiden Läufen derselben Laufnummer, die im alternierenden Design (5.9) direkt nacheinander stattfanden. Es zählt nur, wenn beide Läufe gültig sind. Die Paare werden über die Laufnummer gebildet, nicht über die Position in einer Liste; ein ausgefallener Lauf verschiebt daher keine nachfolgenden Paare.
- Differenzen von exakt 0 werden verworfen (Verfahren nach Wilcoxon).
- Bis 50 Paare ohne Bindungen gilt der exakte p-Wert aus der Nullverteilung, darüber die Normalapproximation mit Stetigkeits- und Bindungskorrektur der Varianz.
- Bleiben weniger als **20** verwertbare Paare, wird der Vergleich als nicht aussagekräftig markiert.
- Ein nichtparametrischer Test ist gewählt, weil Latenzverteilungen rechtsschief und Performance-Messdaten typischerweise nicht normalverteilt sind (Georges et al. 2007; Kalibera & Jones 2013). Eine auf der Normalverteilung beruhende Signifikanzprüfung (Vorschlag vom 2026-10-16) wird deshalb bewusst nicht verwendet; die Arbeit begründet diese Abweichung. Gegenüber dem ungepaarten Mann-Whitney-U-Test nutzt der gepaarte Test die Paarstruktur des Designs und ist dadurch trennschärfer. Die Tests bleiben zweiseitig, auch wo eine Hypothese eine Richtung erwartet (5.18).

**Effektstärke.** Signifikanz allein sagt nichts über die praktische Größe eines Unterschieds; bei vielen Wiederholungen wird nahezu jeder Unterschied signifikant (Arcuri & Briand 2014).

- **Cliff's Delta** (Cliff 1993) ist das eingeordnete Effektmaß und das einzige Effektmaß im Text der Arbeit; die rangbiseriale Korrelation steht nur in den Anhangstabellen (5.24). Die Schwellen nach Romano et al. (2006) sind vorab festgelegt:

  | \|δ\| | Einordnung |
  | --- | --- |
  | < 0,147 | vernachlässigbar |
  | 0,147 – < 0,33 | klein |
  | 0,33 – < 0,474 | mittel |
  | ≥ 0,474 | groß |

- Zusätzlich wird die **rangbiseriale Korrelation für gepaarte Daten** ausgegeben: r = (W⁺ − W⁻) / (W⁺ + W⁻) (Kerby 2014). Sie ist das zum Wilcoxon-Test passende Effektmaß, da Cliff's Delta die Paarung nicht berücksichtigt.

**Konfidenzintervall:** Das 95-%-Intervall für den Median der gepaarten Differenzen wird per nichtparametrischem Bootstrap bestimmt (Perzentil-Methode, 10 000 Resamples; Efron & Tibshirani 1993). Der Zufallsgenerator startet mit einem festen, im Ergebnis protokollierten Startwert; jede Neuauswertung liefert dasselbe Intervall.

**Mehrfachtests: Holm-Korrektur je Testfamilie** (Holm 1979). Bei vielen Tests steigt die Wahrscheinlichkeit, dass mindestens einer zufällig signifikant wird (familienweise Fehlerrate). Die Holm-Korrektur kontrolliert diese Rate bei beliebiger Abhängigkeit zwischen den Tests und ist trennschärfer als die Bonferroni-Korrektur. Die Familien sind vorab festgelegt (`plan.json`) und gelten für Block 1 der Hauptmessung (konfirmatorisch, 5.9):

| Familie | Rolle | Tests |
|---|---|---|
| Latenz (Mittelwert pro Lauf) | primär | 13 Vergleiche × 3 Laststufen = 39 |
| CPU-Zeit von Zelle und Redis pro Lauf | sekundär | 39 |
| Spitze des Speicher-Working-Sets von Zelle und Redis pro Lauf | sekundär | 39 |

Getrennte Familien für Haupt- und Nebenmessgrößen sind üblich, sofern sie vorab festgelegt sind. Die Korrektur erfolgt über alle Kampagnen hinweg in `tools/orchestrate/evaluate.js`. Geplante, aber nicht gemessene Tests gehen mit p = 1 ein, damit Weglassen die Korrektur nicht abschwächt. Block 2 (Replikation) wird beschreibend gegen Block 1 abgeglichen: gleiche Richtung, gleiche Effektklasse, überlappende Konfidenzintervalle. Skalierungsreihe, Sättigungstest und Kontrollmessungen werden nur beschreibend ausgewertet.

Implementierung: `tools/orchestrate/stats.js` und `pairing.js`. Die Tests in `tools/orchestrate/test/stats.test.js` prüfen sie gegen von Hand gerechnete Werte, u. a. die exakte Nullverteilung für n = 5 und n = 6, die Bindungskorrektur und die Holm-Schwellen.

Validitätsrahmen der Gesamtmethodik: Wohlin et al. (2024).

### 5.9 Versuchsablauf, Phasen und Stichprobengröße — ENTSCHIEDEN (Wiederholungszahlen nach dem Pilot)

**Ablauf eines Laufs** (`tools/orchestrate/run.js`):

- Alle Clients verbinden sich gleichzeitig. Die ersten **10 s (Einschwingzeit)** werden nicht gewertet: Events dieser Phase messen den Verbindungsansturm (bei 500 PHP-FPM-Verbindungen z. B. 500 gleichzeitige Laravel-Starts), nicht die Zustellung im Normalbetrieb. Danach wird über die **Haltezeit von 60 s** gemessen.
- Der **Verbindungsaufbau** wird getrennt erfasst: Dauer bis zum Empfang der Antwort-Header (SSE) bzw. bis zum abgeschlossenen Handshake (WebSocket). Damit der Zeitpunkt bei SSE messbar ist, senden alle SSE-Endpunkte beim Verbindungsaufbau sofort einen SSE-Kommentar (`: connected`); Clients ignorieren Kommentarzeilen.
- In Pilot-, Haupt- und Kontrollkampagnen ist ein Lauf ungültig, wenn sich bis zum Ende der Einschwingzeit nicht alle Clients verbunden haben.
- Weitere Gründe für ungültige Läufe: k6-Fehler, keine Events empfangen, Container abgestürzt oder per OOM beendet, fehlgeschlagene Ressourcenmessung, Drosselung des Pi, im Zwei-Rechner-Aufbau eine mittlere Auslastung des Lastgenerators über 80 %.

**Ablauf einer Kampagne:**

- Alternierendes Design A, B, A, B statt Blöcken. Es schützt vor Zeit-Drift (z. B. steigende Temperatur oder Hintergrundlast), die sonst nur eine Konfiguration träfe.
- Warm-up: Die ersten 5 Läufe pro Konfiguration gehen nicht in die Auswertung ein (Aufwärmen von JIT und OPcache, Verbindungsaufbau, Dateisystem-Cache; Georges et al. 2007).
- Zufällige Pause von 100–500 ms zwischen den Läufen.
- Laststufen: Baseline (10 Clients), Medium (50) und Stress (500), je 1 Event/s.
- **Eine Kampagne pro Vergleich und Laststufe.** Bricht der Dauerbetrieb ab, geht höchstens eine Laststufe verloren.
- Skript, Messgröße und zusätzliche Umgebungsvariablen sind pro Zelle festgelegt (`tools/orchestrate/cells.json`) und pro Kampagne überschreibbar. Damit kann eine Kampagne Zellen mit unterschiedlichen k6-Skripten vergleichen (z. B. `ws-skeleton.js` gegen `ws-reverb.js` in Vergleich 4).
- Übersteigt der Anteil ungültiger Läufe 5 % der gemessenen Läufe einer Konfiguration, bricht die Kampagne ab, da die Ergebnisse dann nicht belastbar sind. In Skalierungs- und Sättigungsreihen sind ausgefallene Läufe dagegen Messergebnisse und kein Abbruchgrund.
- Pro Lauf entsteht ein vollständiges Messprotokoll (5.16).

**Phasen der Messung** (beschlossen am 2026-10-16; Messzeit insgesamt drei bis vier Wochen Dauerbetrieb):

| Phase | Zweck | Auswertung |
|---|---|---|
| 1. Belastungstest (24 h) | Nachweis, dass Kühlung und Netzteil Dauerlast ohne Drosselung tragen (`infra/pi/burn-in.sh`) | beschreibend |
| 2. Pilot (`phase: pilot`) | Festlegung der Wiederholungszahl je Laststufe | Zwischenstände, nicht konfirmatorisch |
| 3. Block 1 (`phase: main`, `block: 1`) | Hauptmessung aller 39 geplanten Tests | konfirmatorisch, Holm-Korrektur (5.8) |
| 4. Block 2 (`phase: main`, `block: 2`) | vollständige Wiederholung in anderer, zufälliger Reihenfolge | Replikationsabgleich (5.8) |
| 5. Skalierungsreihe (`phase: scaling`) | 10, 50, 100, 250, 500, 750 und 1 000 Clients je Zelle | beschreibend (H4) |
| 6. Sättigungstest (`phase: saturation`) | höchste nachhaltige Event-Rate je Zelle (5.17) | beschreibend |
| laufend: Kontrollmessung (`phase: control`) | einmal täglich feste Zelle (node-minimal/SSE), feste Last; macht Drift über die Wochen sichtbar | beschreibend |

`tools/orchestrate/plan-campaigns.js` erzeugt die Kampagnen einer Phase aus `plan.json`, für den Pilot mit einer Auswahl der Vergleiche (`--comparisons`); `tools/orchestrate/schedule.js` arbeitet sie in zufälliger, reproduzierbarer Reihenfolge ab, schiebt die Kontrollmessung ein und setzt nach einem Abbruch an der nächsten unvollständigen Kampagne fort. Da `schedule.js` erledigte Kampagnen am Namen erkennt, erhalten Probeläufe ein eigenes Namenspräfix (`--prefix smoke-`); andernfalls würde ein Probelauf die gleichnamige Kampagne der echten Phase als erledigt markieren.

**Warum Replikation statt mehr Wiederholungen.** Die Genauigkeit einer Schätzung wächst nur mit der Wurzel der Anzahl: Von 100 auf 400 Paare halbiert sich die Breite des Konfidenzintervalls, von 100 auf 1 000 wird sie nur etwa dreimal schmaler. Sehr große Zahlen machen zudem praktisch bedeutungslose Unterschiede signifikant. Die verfügbare Messzeit wird deshalb in eine vollständige Wiederholung der Hauptmessung (Stabilität der Ergebnisse über die Zeit), eine feinere Skalierungsreihe und eine tägliche Kontrollmessung investiert. Die Messzeit von drei bis vier Wochen ist ausdrücklich gedeckt (Rücksprache mit der Autorin am 2026-10-16).

**Stichprobengröße.** Ohne Daten von der Zielhardware lässt sich die nötige Zahl an Wiederholungen nicht verlässlich vorab bestimmen. Der Betreuer bat zudem darum, auszuweisen, ab wie vielen Wiederholungen sich Unterschiede zeigen (2026-10-16). Ablauf:

1. **Pilot** auf dem Pi mit Zwischenauswertungen alle N Läufe. Kriterium für die Stabilisierung: Vorzeichen und Effektklasse von Cliff's Delta ändern sich nicht mehr, und die Breite des Konfidenzintervalls nimmt je weiteren N Läufen um weniger als 10 % ab.
2. **Festlegung** der Wiederholungszahl je Laststufe für Block 1 und Block 2: mindestens 20 gültige Paare, höchstens so viele, wie in das Zeitbudget passen. Stabilisiert sich ein Vergleich innerhalb dieser Grenze nicht, wird das als Ergebnis berichtet („Unterschied unterhalb der Auflösung dieses Aufbaus").
3. **Hauptmessung** mit fester Wiederholungszahl. Zwischenauswertungen dienen dort nur der Kontrolle, nicht als Abbruchkriterium: Wiederholtes Testen auf anwachsenden Daten mit Abbruch bei Signifikanz erhöht die Fehlerrate erheblich (Armitage, McPherson & Rowe 1969). Pilotdaten gehen nicht in die konfirmatorische Auswertung ein.

**Verworfener Ausgangsrahmen.** Die Unterlagen zum Abstimmungstermin nannten 800–1 000 (Baseline), 300–500 (Medium) und 100–150 (Stress) Läufe pro Konfiguration. Bei rund 80 s pro Lauf (60 s Haltezeit, 10 s Einschwingzeit, Nebenzeit) und 13 Vergleichen entspräche das rund 29–40 Tagen ununterbrochener Messung allein für einen Block, ohne Replikation (bei der ursprünglichen Planung mit acht Vergleichen 18–25 Tage). Diese Zahlen waren für die Stabilisierung von p99-Werten innerhalb eines Laufs gedacht; mit dem Lauf als Analyseeinheit genügen erfahrungsgemäß deutlich weniger Paare (Kalibera & Jones 2013). Der Rahmen ist daher verworfen.

### 5.10 Ressourcenlimits — ENTSCHIEDEN (Endwerte nach Festlegung des Pi-Modells)

Arbeitswerte: **2 CPUs und 2 GiB Speicher pro Zelle** (`SUT_CPU_LIMIT`, `SUT_MEM_LIMIT` in `.env`), kein Swap.

Der Speicher ist bewusst großzügig bemessen, weil RAM eine gemessene Größe ist und keine Obergrenze, die einzelne Zellen per OOM-Kill aus dem Vergleich entfernt. Das frühere Limit von 512 MiB hätte php-laravel/SSE bei 500 Clients abgebrochen. Im Produktionsbetrieb erreichte diese Zelle lokal eine Spitze von ca. 1 390 MiB (5.5); unter 2 GiB lief der Stresstest ohne OOM, ohne verlorene Events und mit allen Clients innerhalb der Einschwingzeit verbunden (2026-10-16). Der Abstand zum Limit ist damit kleiner als im früheren Entwicklungsbetrieb (ca. 1 035 MiB) und auf dem Pi erneut zu prüfen. Der Orchestrator wertet jeden Lauf als ungültig, in dem ein Container der Zelle per OOM beendet wurde.

Die Endwerte hängen vom Pi-Modell ab. Ein Pi 5 hat vier Kerne. Bei paarweisen Kampagnen laufen zwei Zellen gleichzeitig; mit 2 GiB je Zelle sind 8 GB RAM erforderlich.

### 5.11 Apache-Vergleich — ENTFÄLLT (5.1)

Kein Apache-Messaufbau; die Arbeit diskutiert den Vergleich literaturgestützt. Für eine spätere empirische Prüfung wäre Apache mit `mod_proxy_fcgi` vor demselben PHP-FPM-Backend zu betreiben, sodass ausschließlich der Webserver variiert.

### 5.12 HTTP/2-Messung — ENTFÄLLT (5.2)

Kein zweiter Nginx-Server-Block mit TLS und HTTP/2; die Arbeit diskutiert den Unterschied. Ob k6 und xk6-sse HTTP/2 aushandeln würden, ist ungeprüft.

### 5.13 Debugging- und Monitoring-Vergleich: Ergebnisse — DURCHGEFÜHRT (2026-08-25)

Die Kriterien aus 5.3 wurden gegen den bestehenden Code geprüft, im Entwicklungsbetrieb, da Debugging in der Entwicklung stattfindet. Der Experimentcode lag nur temporär vor; die Prototypen sind unverändert.

**1. Tooling:**

| | PHP | Node.js |
| - | --- | ---- |
| Schritt-Debugger | Xdebug, separate PECL-Erweiterung, nicht in PHP enthalten (xdebug.org/docs/install) | im Node-Kern enthalten (`--inspect`, V8 Inspector / Chrome-DevTools-Protokoll; nodejs.org/api/debugger.html) |
| Profiler | Xdebug-Profiling oder externe APM-Werkzeuge (Blackfire, Tideways), ebenfalls Zusatzinstallation | `--prof` / `--cpu-prof`, im Node-Kern enthalten |
| Strukturiertes Logging | Laravel: Monolog enthalten; php-minimal: nicht vorhanden | in keiner Node-Variante enthalten (auch nicht in Express); Zusatzbibliothek nötig (z. B. pino, winston) |

Befund: Debugger und Profiler sind bei Node.js ohne Zusatzinstallation nutzbar, bei PHP nicht; das ist ein Sprachunterschied. Strukturiertes Logging trennt dagegen eher Framework- und Minimalvariante als PHP und Node.js (Laravel bringt es mit, Express nicht). Die Arbeit sollte Sprach- und Framework-Frage an dieser Stelle getrennt behandeln.

**2. Correlation-ID über die Queue-Grenze.** Geprüft an den Pfaden mit Queue-Grenze: `node-express/queue/` (BullMQ) sowie `ProcessScanEvent.php` und `DispatchTestScanCommand.php` (Laravel Queue). Eine Correlation-ID im Event-Payload durchzureichen, kostet in beiden Stacks keine zusätzliche Zeile, da beide Pipelines das vollständige Datenobjekt weiterreichen (`{...job.data, …}` bzw. `[...$this->payload, …]`). Die ursprünglich geplante Kennzahl „Anzahl Änderungen zum Durchreichen" ist für beide Stacks null und unterscheidet sie nicht. Der unterschiedliche Aufwand liegt im Sichtbarmachen der ID im Fehlerfall (Punkt 3).

**3. Fehlersichtbarkeit in Queue-Workern**, geprüft mit einem absichtlich fehlschlagenden Job (`correlation_id="corr-test-abc123"`):

- *BullMQ (Node.js):* Der vorhandene `worker.on('failed', …)`-Handler protokolliert Job-ID, Fehlermeldung und Stacktrace, nicht aber die Correlation-ID. Diese ist jedoch programmatisch abrufbar: `queue.getFailed()` liefert die vollständigen Job-Daten einschließlich `correlation_id`, dauerhaft in Redis gespeichert und ohne Zusatzkonfiguration. Für die Ausgabe im Log genügt die Änderung einer bestehenden Zeile (`job.data` im vorhandenen `console.error`-Aufruf).
- *Laravel Queue:* `queue:work` zeigt in der Konsole nur `... FAIL`, ohne Fehlermeldung oder ID. Das Standard-Fehlerprotokoll (Tabelle `failed_jobs`, `DatabaseUuidFailedJobProvider`) ist im damals verwendeten Laravel-12-Starter-Kit (seit 2026-10-16 Laravel 13, 5.23; vor dem Schreiben des Abschnitts zu Komplexität und Wartbarkeit erneut prüfen) nicht sofort funktionsfähig: Die Migration für `failed_jobs` gehört nicht zu den Standard-Migrationen, und in der gewählten Konfiguration existiert keine SQLite-Datenbankdatei (`CACHE_STORE=file` und `SESSION_DRIVER=cookie` vermeiden SQLite bewusst im SSE-Pfad). Der Versuch, den fehlgeschlagenen Job zu protokollieren, scheitert daher mit einer zweiten Exception (`SQLiteDatabaseDoesNotExistException`), die die eigentliche Fehlermeldung verdeckt. Die Correlation-ID erscheint nur als Nebeneffekt im serialisierten Datenblock in `storage/logs/laravel.log`. Abhilfe: `php artisan queue:failed-table` mit funktionierender Datenbank (Betriebsschritt) oder eine `failed()`-Methode in der Job-Klasse (Laravels vorgesehener Hook, ca. drei Zeilen mit `Log::error(...)` und `$this->payload`).

Einordnung: BullMQ bietet Fehlersichtbarkeit ohne zusätzliche Infrastruktur (Redis-natives Failed-Set). Laravels Standardmechanismus setzt eine eingerichtete Datenbank voraus, die in einem schlanken, datenbankfreien Aufbau nicht automatisch vorhanden ist. Das ist ein Unterschied im Betriebsaufwand, kein Fehler in Laravel.

### 5.14 Testumgebung: Raspberry Pi mit separatem Lastgenerator — ENTSCHIEDEN (Hardware offen)

Vorgabe vom 2026-10-16: Die Messungen laufen auf einem selbst aufgesetzten Raspberry Pi; erwogen wurden auch mehrere Pis für unterschiedliche Vergleiche.

**Aufbau:** Ein Pi ist reiner Testserver (Redis, Front-Nginx, die Zellen der laufenden Kampagne, `resource-sampler`). k6, die Ereignisquellen und der Orchestrator laufen auf einem separaten Lastgenerator, der per Kabel verbunden ist. Die Einrichtung beschreibt `infra/pi/README.md`.

Begründung:

- **Kein Engpass durch das Lastwerkzeug.** Ein Pi hat vier Kerne, das Budget einer Zelle beträgt zwei. Auf den übrigen Kernen müssten k6 (bei 500 und mehr Clients rechenintensiv), Ereignisquellen, Redis und Nginx laufen. Bei der Stress-Stufe würde dann die Grenze des Werkzeugs gemessen statt die des Systems. Die Auslastung des Lastgenerators wird in jedem Lauf gemessen; liegt sie im Mittel über 80 %, ist der Lauf ungültig.
- **Eine Uhr für beide Zeitstempel.** Sendezeitstempel (Ereignisquelle) und Empfangszeitpunkt (k6) stammen beide vom Lastgenerator, eine Synchronisation zwischen Geräten ist nicht nötig. NTP erreicht typischerweise nur Genauigkeiten im Millisekundenbereich (RFC 5905), was bei Latenzen im einstelligen Millisekundenbereich nicht ausreichen würde. Die Netzwerkstrecke ist in jeder Latenz enthalten, für alle Zellen gleich und verzerrt den Vergleich nicht.
- **Identische Hardware für alle Zellen.** Alle Kampagnen laufen nacheinander auf demselben Pi.

Mehrere Pis parallel (je ein Vergleichspaar pro Gerät) wurden verworfen. Zwei Geräte desselben Modells unterscheiden sich in Fertigungsstreuung, Kühlung und Speichermedium. Gepaarte Vergleiche auf demselben Gerät blieben zwar gültig, Gegenüberstellungen über Geräte hinweg (z. B. Skalierungsverläufe aller Zellen) enthielten aber den Hardwareunterschied.

**Hardware** (Bedarf an den Betreuer gemeldet am 2026-10-16): Raspberry Pi 5 mit 8 GB RAM, aktiver Kühler, offizielles 27-W-Netzteil, SSD statt SD-Karte; Lastgenerator mit Linux, mindestens vier Kernen und 8 GB RAM (ein zweiter Pi 5 könnte bei 1 000 Clients selbst zum Engpass werden); kabelgebundenes, getrenntes Messnetz; optional eine USV.

Bekannte Risiken auf dem Pi und ihre Behandlung:

| Risiko | Behandlung |
|---|---|
| fehlerhafte oder unvollständige Einrichtung des Pi | Einrichtungsskript `infra/pi/setup.sh` (wiederholbar, mit Zusammenfassung offener Punkte); Vorabprüfung jeder Kampagne; Probelauf mit eigenem Namenspräfix vor dem Pilot |
| memory-cgroup unter Raspberry Pi OS ggf. deaktiviert, Speicherlimits dann wirkungslos | Boot-Parameter (`infra/pi/setup.sh`); die Vorabprüfung bricht ab, wenn der Controller fehlt |
| thermische Drosselung bei Dauerlast | aktive Kühlung; 24-h-Belastungstest vor dem Pilot; Temperatur und Drosselstatus pro Lauf protokolliert; gedrosselte Läufe sind ungültig |
| Taktanpassung (CPU-Governor) erzeugt Rauschen | Governor fest auf `performance` (`infra/pi/cpu-performance.service`), Vorabprüfung |
| Swap verzerrt Speicher- und Latenzmessung | Swap abgeschaltet, Vorabprüfung |
| Ausfall der SD-Karte bei wochenlangem Schreiben | SSD |
| Container-Logs und Ergebnisse füllen über Wochen den Datenträger | Log-Rotation in `docker-compose.yml`; `status.js` warnt unter 10 % freiem Platz auf beiden Geräten |
| automatische Updates ändern mitten in der Messung Docker oder Kernel | automatische Updates abgeschaltet; Versionen in jedem Lauf protokolliert |
| Stromausfall oder Absturz | Kampagnen pro Laststufe, Fortsetzen über `schedule.js`; optional USV |
| Abbruch oder Stillstand bleibt im unbeaufsichtigten Betrieb tagelang unbemerkt | `tools/orchestrate/status.js` (Fortschritt, ungültige Läufe, Temperatur, Drift der Kontrollmessung, Speicherplatz) als stündlicher cron-Job; optionale Benachrichtigung über `NOTIFY_URL` bei Warnungen, abgebrochenen Kampagnen und am Ende des Zeitplans. Die Nachrichten enthalten keine Messwerte, Adressen oder Schlüssel |
| ARM64-Kompatibilität | alle Basis-Images multi-arch, geprüft am 2026-10-16 |

Stand: Der Zwei-Rechner-Aufbau ist implementiert, aber noch nicht auf Pi-Hardware erprobt (Abschnitt 6).

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

**Transport als Vergleichsachse** (beschlossen am 2026-10-16, ersetzt die frühere Festlegung „Transport ist Kontext, keine Vergleichsachse"; Begründung der Abweichung vom Exposé: 5.23). Der Transport wird auf zwei Ebenen verglichen:

- **Gepaart und konfirmatorisch** nur in den Minimalvarianten (Vergleiche 12 und 13). Dort unterscheiden sich die beiden Zellen ausschließlich im Transport und in dem, was er in der jeweiligen Sprache mit sich bringt. In den Framework-Varianten käme bei Laravel ein anderes Protokoll (Pusher-Protokoll über Reverb) und ein zusätzlicher Prozess mit internem HTTP-Aufruf hinzu (H6). Ein Unterschied wäre dort nicht mehr dem Transport zuzuordnen.
- **Beschreibend für alle vier Varianten mit beiden Transporten** über Skalierungsreihe und Sättigungstest, die ohnehin für alle Zellen laufen (`tools/orchestrate/series.js`). Das deckt die Erwartung des Exposés ab, dass WebSockets bei hoher Ereignisfrequenz im Vorteil sind (H11).

Bei PHP ist der Transport nicht vom Laufzeitmodell zu trennen. SSE läuft in der üblichen Betriebsweise über PHP-FPM (ein Worker je Verbindung, 5.5), ein WebSocket-Server ist dagegen ein langlaufender Prozess mit Ereignisschleife (Ratchet). Vergleich 13 misst daher die praktische Entscheidung, vor der ein PHP-Team steht, und nicht das Protokoll allein (H10). Bei Node.js nutzen beide Transporte dieselbe Ereignisschleife; Vergleich 12 kommt einem reinen Protokollvergleich am nächsten (H9).

Einschränkung: SSE wird mit der Erweiterung xk6-sse, WebSocket mit dem WebSocket-Modul von k6 gemessen. Beide laufen im selben k6-Prozess auf dem Lastgenerator, und beide Zeitstempel stammen von dort. Unterschiede in der clientseitigen Verarbeitung der beiden Module können dennoch in die Latenz eingehen. Die Arbeit nennt das als Bedrohung der Konstruktvalidität.

Aufwand: zwei Vergleiche mehr je Block, also sechs Kampagnen. Bei den Beispiel-Wiederholungszahlen (80, 60 und 40 Läufe zuzüglich Warm-up) sind das rund 17 Stunden je Block. Die Holm-Korrektur wird geringfügig strenger (kleinste Schwelle α/39 statt α/33).

### 5.16 Messprotokoll und Telemetrie — ENTSCHIEDEN, umgesetzt

Vorgabe vom 2026-10-16: Telemetriedaten als Datei speichern (Dauer, übertragene Bytes, Bytes pro Sekunde u. a.); die Tests sollen ein aussagekräftiges Log im JSON-Format erzeugen.

Ablage pro Kampagne unter `results/<zeitstempel>_<name>/`:

| Datei | Inhalt |
|---|---|
| `campaign.json` | verwendete Kampagnendefinition |
| `campaign.log.jsonl` | fortlaufendes Ereignisprotokoll: Start, gestoppte und gestartete Dienste, Kontext, jeder Lauf mit Kurzergebnis, Zwischenauswertungen, Abbruch |
| `runs/<laststufe>_<konfiguration>_runNNNN.json` | vollständiges Protokoll eines Laufs |
| `aggregate.json` | Kampagnenauswertung: deskriptive Kennzahlen, Vergleiche mit unkorrigierten p-Werten, Zwischenstände, ggf. Skalierung oder Sättigung |

`tools/orchestrate/schedule.js` schreibt zusätzlich ein Protokoll je Zeitplan (`results/<zeitstempel>_schedule_<name>.jsonl`), `tools/orchestrate/evaluate.js` die Gesamtauswertung über alle Hauptkampagnen (`results/<zeitstempel>_evaluation/`, JSON und Markdown-Tabellen).

Inhalt eines Lauf-Protokolls:

- **Lauf:** Konfiguration, Zelle, Laststufe, Phase, Block, Laufnummer, Warm-up, Gültigkeit mit Grund, Start- und Endzeit.
- **Last:** Clients, Einschwing- und Haltezeit, eingestellte Event-Rate, Ereignisquelle, Skript, Messgröße, Modus des Front-Nginx.
- **Latenz (Messfenster):** Mittelwert, Minimum, Median, p90, p95, p99, Maximum.
- **Verbindung:** Dauer des Verbindungsaufbaus (Mittel, Median, p95, Maximum), bis zum Ende der Einschwingzeit verbundene Clients, im Messfenster bediente Clients (mindestens ein Event erhalten) und die zugehörigen Anteile.
- **Zustellung** (5.17): empfangene, eindeutige, erwartete, verlorene und doppelte Events, Zustellquote, zugestellte Events pro Sekunde, gemessene Senderate.
- **Netz:** empfangene und gesendete Bytes sowie Bytes pro Sekunde (k6 `data_received` und `data_sent`; für SSE und WebSockets geprüft am 2026-10-16).
- **Ressourcen** von Zelle, Redis und beiden zusammen sowie je Container:
  - CPU-Zeit als Differenz des cgroup-Zählers `usage_usec` zwischen Beginn und Ende des Laufs (exakt) sowie mittlere CPU-Auslastung in Kernen;
  - Speicher (`memory.current` und Working Set = `memory.current` − `inactive_file`, wie bei `docker stats`) als Mittel und Spitze, alle 250 ms abgetastet; die Spitze von Zelle und Redis zusammen wird aus der Summe je Abtastung gebildet.
- **Lastgenerator:** CPU-Auslastung des Hosts (Mittel und höchster Wert je Sekunde).
- **Host des Testservers:** Temperatur zu Beginn, am Ende und als Maximum; Drosselstatus zu Beginn und am Ende.
- **Container:** Status, OOM-Kennzeichen, Image.
- **Kontext:**
  - Code-Stand (Git-Commit beider Seiten, Anzahl nicht committeter Änderungen);
  - k6- und Erweiterungsversion;
  - Host (Modell, Kernel, Kerne, RAM, Swap, cgroup-Controller, Governor);
  - je Container: wirksame Limits, Image, Betriebsmodus (`NODE_ENV`, `APP_ENV`, `APP_DEBUG`, geladene `php.ini`).
- **Rohdaten:** vollständige k6-Zusammenfassung.

Von zusätzlichen Umgebungsvariablen (z. B. dem Reverb-App-Key) werden nur die Namen protokolliert, nie die Werte. Liegt eine Kampagnendatei außerhalb des Repositorys, wird nur ihr Dateiname protokolliert.

Ressourcenmessung: `tools/resource-sampler` liest die cgroup-v2-Dateien direkt. Er ersetzt `docker stats`, das pro Abfrage ein bis drei Sekunden benötigt, selbst CPU auf dem gemessenen Rechner verbraucht und nicht an einzelne Läufe gekoppelt war. Das frühere Protokollwerkzeug für `docker stats` (`tools/monitor`) wurde am 2026-10-17 entfernt.

Offen ist, ob die Betreuerantwort zu Frage 8 den Werkzeugvergleich (5.3, 5.13) ersetzt oder ergänzt (Abschnitt 6).

### 5.17 Durchsatz und Zustellung — ENTSCHIEDEN, umgesetzt

Durchsatz ist als Messgröße angekündigt („wie viele Events pro Sekunde zugestellt werden"). Bei fester Event-Rate ist die Zahl der zugestellten Events pro Sekunde jedoch durch die Last vorgegeben (Clients × Rate) und unterscheidet die Zellen nicht, solange keine Events verloren gehen. Durchsatz wird daher in zwei Stufen erfasst:

1. **Zustellung bei fester Rate** (alle Kampagnen):
   - Jedes Event trägt eine laufende Nummer `seq`. k6 zählt pro Verbindung im Messfenster erwartete Events (alle Nummern zwischen dem ersten und dem letzten empfangenen Event) sowie eindeutige, verlorene und doppelte Events (`k6/lib/delivery.js`). Daraus ergibt sich die Zustellquote.
   - Die Zustellquote bezieht sich nur auf bediente Clients. Clients, die gar nicht bedient werden (z. B. jenseits der 550 FPM-Worker), erfasst der Anteil bedienter Clients (5.16); ohne ihn sähe die Zustellquote in diesem Fall fälschlich vollständig aus.
   - Die tatsächliche Senderate wird aus den Zeitstempeln der Events bestimmt, nicht aus der eingestellten Rate.
   - Einschränkung: Verluste nach dem letzten empfangenen Event einer Verbindung sind nicht erkennbar. Bei Haltezeiten weit über dem Event-Intervall ist das vernachlässigbar.
2. **Sättigungstest** (eigene Kampagnen, `phase: saturation`):
   - Feste Clientzahl, stufenweise steigende Event-Rate, wenige Wiederholungen pro Stufe, rein beschreibende Auswertung.
   - Ergebnis pro Zelle ist die höchste nachhaltige Rate: die höchste Stufe, bis zu der auf jeder Stufe im Median mindestens 99 % der Events zugestellt werden und die p95-Latenz im Median höchstens 1 000 ms beträgt.
   - Die Latenzgrenze orientiert sich an der Grenze von etwa einer Sekunde, bis zu der Verzögerungen den Gedankenfluss von Nutzern nicht unterbrechen (Nielsen 1993).
   - Clientzahl und Ratenstufen werden nach dem Pilot festgelegt.

Die Ereignisquellen takten nach absolutem Zeitplan (Start + seq · Intervall) statt „senden, dann volles Intervall warten". Letzteres hätte die Rate systematisch um die Dauer jedes Sendevorgangs gesenkt. Lokal hielt der Event-Simulator 500 Events/s auf 0,1 Events/s genau ein (2026-10-16).

### 5.18 Hypothesen — ENTSCHIEDEN (vor der Datenerhebung festgelegt am 2026-10-16)

Die Hypothesen sind aus der Architektur der Stacks abgeleitet und vor der Datenerhebung festgelegt (`plan.json`). Das schützt vor dem nachträglichen Anpassen von Erwartungen an die Ergebnisse (HARKing; Kerr 1998). Die Signifikanztests bleiben zweiseitig; die Hypothesen strukturieren die Diskussion. Jede Hypothese wird in der Arbeit als bestätigt, nicht bestätigt oder unentschieden bewertet.

| Nr. | Hypothese | Begründung |
|---|---|---|
| H1 | Für SSE benötigt PHP-FPM bei 500 Clients ein Vielfaches des Speichers von Node.js. | Ein Prozess pro Verbindung gegenüber einem Objekt pro Verbindung. |
| H2 | Bei 10 Clients sind die Latenzunterschiede höchstens klein (\|δ\| < 0,33). | Bei geringer Last ist keine Architektur ausgelastet. |
| H3 | Von 10 zu 500 Clients wachsen die Latenzunterschiede zwischen PHP und Node.js; die Richtung ist offen. | Gegenläufige Mechanismen: Bei PHP-FPM läuft die Verteilung parallel in vielen Prozessen und teils in Redis; Node.js verteilt in einem Thread nacheinander, aber ohne Prozesswechsel. |
| H4 | In der Skalierungsreihe erreicht PHP-FPM/SSE als erste Variante eine harte Grenze; Node.js und die PHP-WebSocket-Server werden allmählich langsamer. | Fest 550 Worker gegenüber Event Loop. |
| H5 | Der Framework-Effekt ist bei der Event-Latenz klein, beim Verbindungsaufbau und beim Speicher aber bei Laravel deutlich größer als bei Express. | Nach dem Verbindungsaufbau führen beide Frameworks pro Event kaum eigenen Code aus; Laravel startet pro SSE-Verbindung das Framework. |
| H6 | php-laravel/WS hat durchgehend höhere Latenz als node-express/WS. | Jedes Event durchläuft einen zusätzlichen internen HTTP-Aufruf (Listener → Reverb). |
| H7 | Die Queue erhöht die Latenz in beiden Stacks, bei Laravel stärker als bei BullMQ. | Job-Serialisierung und ein schwergewichtigerer Worker bei Laravel. |
| H8 | Bei PHP/SSE trägt Redis einen wesentlichen Teil der Gesamt-CPU, bei allen anderen Zellen nur einen geringen. | Verteilung an N Abonnenten (5.6.2). |
| H9 | Bei Node.js, wo beide Transporte dasselbe Laufzeitmodell nutzen, verursacht SSE weniger Overhead als WebSockets: weniger CPU-Zeit und ein kleineres Working Set bei gleicher Last (Vergleich 12). | Erwartung aus dem Exposé. SSE ist reines HTTP ohne Protokollwechsel und ohne Rahmenformat; jedes Event ist eine Textzeile in einer offenen Antwort. |
| H10 | Bei PHP bestimmt das Laufzeitmodell den Transportvergleich: PHP-FPM/SSE benötigt bei 500 Clients ein Vielfaches des Speichers des Ratchet-WebSocket-Servers (Vergleich 13, Stress). | Ein PHP-Prozess je SSE-Verbindung gegenüber einer Ereignisschleife für alle WebSocket-Verbindungen (5.5, 5.15). |
| H11 | Bei hohen Event-Raten erreichen die WebSocket-Varianten eine höhere nachhaltige Rate als die SSE-Varianten derselben Sprache und Variante (Sättigungstest, beschreibend). | Erwartung aus dem Exposé. WebSocket-Rahmen sind kompakter als SSE-Textzeilen; bei PHP/SSE verteilen zudem viele Prozesse jedes Event einzeln. |

H9 und H11 übernehmen die Erwartungen des Exposés zum Transportvergleich, H10 ergänzt die Besonderheit von PHP (5.23). Sie wurden am 2026-10-16 vor der Datenerhebung festgelegt, wie H1 bis H8.

Transparenz: Lokale Funktionsprüfungen vor der Festlegung zeigten bei H6 bereits diese Richtung (2,2 ms gegenüber 1,1 ms bei 10 Clients, n = 3, nicht auf der Zielhardware). H6 wurde aus der Architektur abgeleitet, nicht aus diesen Werten. Gleiches gilt für Hinweise zu H4, H5 und H8 aus den Funktionsprüfungen (`results/2026-10-16_verification-2/`); die Arbeit nennt das offen.

### 5.19 Queue-Achse — ENTSCHIEDEN (beschlossen am 2026-10-16)

Das Exposé fragt, wie ein ereignisgesteuertes Benachrichtigungssystem „mit SSE und Queues" in PHP und Node.js entworfen und umgesetzt werden kann. Die acht Hauptzellen enthalten bewusst keine Queue (5.7). Die Queue wird deshalb als eigene Achse gemessen, beschränkt auf die Framework-Varianten mit SSE:

| Zelle | Ereignisquelle | Weg |
|---|---|---|
| node-express-sse-queue | Event-Simulator, Modus `queue` (BullMQ-Jobs) | BullMQ-Queue → BullMQ-Worker → Redis Pub/Sub `notifications` → Express-SSE |
| php-laravel-sse-queue | `scan:produce` (Laravel-Jobs; nur Laravel kann sein Job-Format erzeugen) | Laravel-Queue → `queue:work` → Redis Pub/Sub `notifications` → Laravel-SSE (PHP-FPM) |

- Der Worker gehört zur Zelle und zum gemeinsamen Ressourcenbudget (5.6.2).
- Der SSE-Endpunkt ist derselbe Code wie in der Zelle ohne Queue; er abonniert lediglich `notifications` statt `scan-events`.
- Beschränkung auf SSE: Die Queue sitzt vor der Verteilung an die Clients; ihr Effekt sollte unabhängig von der Transportart sein. Diese Annahme wird in der Arbeit offen genannt.
- Laravels Worker wartet mit `block_for` blockierend auf Jobs, statt bei leerer Queue 3 s zu schlafen (5.20). Ohne diese Einstellung würde bei 1 Event/s vor allem die Schlafpause gemessen.
- Neue Vergleiche 9–11 (5.15); die Testfamilien wuchsen damit auf 33 Tests, mit den Transportvergleichen 12 und 13 auf 39 (5.8, 5.15).

### 5.20 Abweichungen von der Standardkonfiguration — ENTSCHIEDEN

Jede Einstellung, die vom Auslieferungszustand der Komponenten abweicht, mit Begründung. Zweck: Nachvollziehbarkeit im Methodikteil.

| Komponente | Einstellung | Standard | Begründung |
|---|---|---|---|
| PHP-FPM | `pm = static`, `pm.max_children = 550` | `pm = dynamic`, 5 Worker | ein Worker pro SSE-Verbindung; Zielzahl 500 Clients (5.5) |
| PHP-FPM | `ping.path = /healthz` | aus | Erreichbarkeitsprüfung durch den Front-Nginx (5.6.1) |
| Laravel Queue | `block_for = 5` | `null` (Polling mit 3 s Schlafpause) | sonst misst die Queue-Achse die Schlafpause (5.19); dokumentierte Laravel-Einstellung |
| Nginx | `proxy_buffering off`, `fastcgi_buffering off` | an | Pufferung würde Events zurückhalten (5.6.1) |
| Nginx | `proxy_read_timeout`/`fastcgi_read_timeout` 3600 s | 60 s | SSE-Verbindungen bleiben offen |
| Nginx | `worker_connections 4096`, `worker_rlimit_nofile 8192` | 1024 bzw. Systemwert | 500 und mehr gleichzeitige Verbindungen |
| Container | `ulimits.nofile` 8192 | Systemwert (oft 1024) | wie oben |
| Container | `memswap_limit` gleich `mem_limit` | Swap bis zum Doppelten des Limits | keine ausgelagerten Seiten in der Messung |
| SSE-Endpunkte | SSE-Kommentar `: connected` beim Verbindungsaufbau | — | Verbindungsaufbau messbar (5.9) |

Der Produktionsbetrieb nach offizieller Dokumentation (5.5) gilt nicht als Abweichung, sondern als Bezugszustand.

### 5.21 Testlast und ihre Grenzen — ENTSCHIEDEN

Die Testlast bildet Lokato an zentralen Stellen nach und vereinfacht an anderen. Die Vereinfachungen werden in der Arbeit als Grenzen der externen Validität genannt (Entscheidung vom 2026-10-16, keine zusätzlichen Messreihen):

| Merkmal | Testlast | Bewertung |
|---|---|---|
| Nachrichtenformat | Originalformat eines Lokato-Scans plus Messfelder `seq` und `ts`, ca. 140 Byte | realistisch; echte Lokato-Events sind ähnlich klein |
| Empfänger | jedes Event an alle Clients (Broadcast) | entspricht einem Dashboard; gezielte Zustellung an einzelne Nutzer wäre eine eigene Architekturfrage |
| Zeitmuster | gleichmäßige Rate (1 Event/s; Sättigungstest höher) | stoßweise Last (viele Scans gleichzeitig an einem Tor) nicht abgebildet |
| Anmeldung | keine (öffentlicher Kanal) | in Produktion üblich; zusätzlicher Aufwand beim Verbindungsaufbau nicht erfasst |
| Verbindungsabbrüche | keine | Wiederverbindung (SSE: `Last-Event-ID`, WS: eigene Logik) nicht erfasst |

### 5.22 Komplexität und Wartbarkeit — ENTSCHIEDEN (beschlossen am 2026-10-16)

Das Exposé fragt nach Komplexität und Wartbarkeit der Umsetzungen. Für Wartbarkeit gibt es kein einzelnes anerkanntes Maß. Die Arbeit beantwortet die Frage deshalb aus zwei Richtungen, beide ohne zusätzliche Messzeit:

1. **Statische Code- und Betriebskennzahlen je Zelle** (`tools/code-metrics`): eigener Anwendungscode (Dateien, Codezeilen ohne Leer- und Kommentarzeilen), Betriebskonfiguration (Dockerfile, FPM-Pool, Startskript), Zahl der Container, direkt genutzte Abhängigkeiten und alle davon abhängigen Pakete laut Lock-Datei, Systemerweiterungen außerhalb des Paketmanagers. Je Prototyp zusätzlich der Projektumfang ohne Abhängigkeiten und die Zahl installierter Produktionspakete. Welche Dateien zu einer Zelle gehören, legt `tools/code-metrics/variants.json` ausdrücklich fest.
2. **Qualitativer Debugging- und Monitoring-Vergleich** (5.13): Werkzeuge, Correlation-ID über die Queue-Grenze, Sichtbarkeit von Fehlern im Worker.

Die Kennzahlen zeigen einen Zielkonflikt, der ohne Gewichtung berichtet wird: Ein Framework verringert den eigenen Code (Laravel erledigt Routing, Broadcasting und Queue-Verarbeitung), erhöht aber die Zahl der Abhängigkeiten und den Projektumfang (vom Framework erzeugtes Gerüst). Codezeilen und Paketzahlen sind grobe Näherungen; sie erfassen weder Verständlichkeit noch Qualität der Dokumentation. Eine Gesamtnote wird daher nicht gebildet. Die Auswertung läuft auf dem Commit, mit dem gemessen wird.

### 5.23 Abweichungen vom Exposé — ENTSCHIEDEN (Bestätigung durch den Betreuer ausstehend)

Das Exposé beschreibt den Plan zu Beginn der Arbeit. Während der Umsetzung, der Abstimmung mit dem Betreuer am 2026-10-16 und zwei Überprüfungen des Messaufbaus (Abschnitt 8) haben sich Abweichungen ergeben. Jede ist hier mit Begründung festgehalten. Das Methodikkapitel der Arbeit nennt sie in einer Tabelle, damit die Gutachter den Weg vom Exposé zur Umsetzung nachvollziehen können.

| Nr. | Punkt | Exposé | Umsetzung |
|---|---|---|---|
| 1 | Titel | „Design and Implementation of an Event-Driven Notification System in PHP Using SSE and Queues: A Comparative Study with Node.js/Express" | Arbeitstitel „Event-driven Notification Systems: PHP vs. Node.js with Server-Sent Events and WebSockets"; endgültiger Titel mit dem Betreuer abzustimmen |
| 2 | Forschungsfragen | eine Hauptfrage (Entwurf, Umsetzung, messbare Unterschiede) mit sechs Unterfragen | drei messbare Forschungsfragen und ein praktisches Ziel; Entwurf und Umsetzung als konstruktiver Teil |
| 3 | SSE und WebSocket | direkter Vergleich mit Erwartung | Vergleiche 12 und 13 (gepaart), Skalierung und Sättigung (beschreibend), H9 bis H11 |
| 4 | Symfony | EventDispatcher als zweite Referenz | nicht umgesetzt |
| 5 | Komplexität und Wartbarkeit | Unterfrage | Code-Kennzahlen und Debugging-Vergleich (5.13, 5.22) |
| 6 | Latenzmaß | p50, p95, p99 | Mittelwert pro Lauf als Testgröße, Perzentile beschreibend |
| 7 | Durchsatz | Events pro Sekunde bei steigender Last | Zustellquote je Lauf und Sättigungstest |
| 8 | Skalierung | 10, 50, 100 und 500 Clients | Laststufen 10, 50, 500; Skalierungsreihe 10 bis 1 000 |
| 9 | Laravel-Version | 13.x | 13.34.0 (zwischenzeitlich 12.61.1) |
| 10 | Literatur | zehn Quellen, u. a. Fielding, Fowler, Laigner et al., Lazzari & Farias, Tzialla et al., Woodside | neun übernommen (drei standen bereits in LITERATUR.md), zwei Angaben korrigiert, Tzialla et al. nicht übernommen (LITERATUR.md) |
| 11 | Grundlage der Prototypen | PHP-Prototyp erweitert das bestehende Lokato-Backend (Laravel, relationale Datenbank) | eigenständige Prototypen mit dem Ereignisformat von Lokato, ohne Datenbank |
| 12 | Queue in den Varianten | Laravel-Queue und Event-Dispatcher als Teil der vollständigen Umsetzungen | Queue als eigene Achse in zwei Varianten (5.19) |
| 13 | Erwartung zur Latenz | Node.js mit geringerer Latenz und höherem Durchsatz unter hoher Last | H3 mit offener Richtung |

**1. Titel.** Die Studie ist symmetrischer geworden als geplant. Beide Sprachen werden jeweils ohne und mit Framework umgesetzt, beide Transporte gemessen, und die Queue ist eine von vier Achsen (Sprache, Framework, Transport, Queue). Ein Titel, der PHP mit SSE und Queues in den Mittelpunkt stellt und Node.js/Express nur als Vergleichsgröße nennt, beschreibt die Arbeit daher nicht mehr genau. Der Arbeitstitel ist ein Vorschlag. Ein Kompromiss, der die Formulierung des Exposés erhält, wäre „Design and Implementation of Event-Driven Notification Systems in PHP and Node.js: A Comparative Study of Server-Sent Events, WebSockets and Queues".

**2. Forschungsfragen.** Die Hauptfrage des Exposés verbindet eine konstruktive Frage (wie lässt sich ein solches System entwerfen und umsetzen) mit einer empirischen (welche messbaren Unterschiede gibt es). Die konstruktive Frage beantwortet die Arbeit durch den Entwurf und die zehn Umsetzungen (Kapitel zu Entwurf und Umsetzung). Die empirische Frage ist in messbare Forschungsfragen zerlegt, weil nur sie sich vor der Datenerhebung mit Messgrößen, Tests und Hypothesen festlegen lassen (5.8, 5.18):

- RQ1: Wie groß sind die Unterschiede in Latenz, Verbindungsaufbau, Ressourcenverbrauch und Zustellung zwischen den Sprachen, den Transporten, mit und ohne Framework, mit und ohne Queue?
- RQ2: Wo liegen die Grenzen der einzelnen Varianten bei steigender Clientzahl und Event-Rate unter gleichem Ressourcenbudget?
- RQ3: Wie unterscheiden sich die Varianten in Umsetzungsaufwand und Betreibbarkeit (Code, Abhängigkeiten, Debugging und Monitoring)?
- Praktisches Ziel: eine begründete Entscheidungshilfe, welche Kombination sich für welches Szenario eignet.

Die Unterfragen des Exposés gehen darin auf: Latenz, Durchsatz und Skalierung in RQ1 und RQ2, der Transportvergleich in RQ1 und RQ2 (Punkt 3), Komplexität und Wartbarkeit in RQ3 (Punkt 5), die Frage nach Laravel und Symfony in der Framework-Achse (Punkt 4).

**3. SSE und WebSocket.** Das Exposé vergleicht beide Transporte ausdrücklich und erwartet für SSE weniger Overhead, für WebSocket Vorteile bei hoher Ereignisfrequenz. Der Messaufbau behandelte den Transport bis zum 2026-10-16 nur als Kontext. Begründet war das damit, dass sich in den Framework-Varianten mit dem Transport auch Protokoll und Prozessaufbau ändern (Reverb, 5.15). Diese Begründung trägt für die Framework-Varianten weiterhin, nicht aber für die Minimalvarianten. Da der Transport im Titel des Exposés und der Arbeit steht und eine zentrale Erwartung des Exposés betrifft, wird er jetzt gemessen: gepaart in den Minimalvarianten, beschreibend für alle Varianten über Skalierung und Sättigung, mit den vorab festgelegten Hypothesen H9 bis H11 (5.15, 5.18). Der Zeitpunkt vor dem Pilot ist dafür der letzte, an dem die Erweiterung ohne Nachteil für die Vorabfestlegung möglich ist. Die Kosten sind gering: rund 17 Stunden Messzeit je Block und eine etwas strengere Holm-Korrektur.

**4. Symfony.** Eine Symfony-Variante wird nicht umgesetzt:

- Die Framework-Frage ist bereits durch den Vergleich von Laravel mit der Minimalvariante beantwortet (Vergleiche 7 und 8), auf Node.js-Seite durch Express (5 und 6). Ein zweites PHP-Framework würde die Frage „Laravel oder Symfony" beantworten, die nicht zu den Kernfragen der Arbeit gehört.
- Für Push-Nachrichten setzt Symfony auf Mercure. Die dauerhaften SSE-Verbindungen hält dabei ein eigener Hub-Server, der als Go-Programm bzw. Caddy-Modul ausgeliefert wird (LITERATUR.md). Eine Symfony-Variante würde den Push-Pfad also nicht in PHP messen und wäre mit den übrigen Zellen nicht vergleichbar. Der EventDispatcher allein ist ein Ereignismechanismus innerhalb eines Prozesses und kein Transport zum Client.
- Zwei bis drei zusätzliche Zellen mit mindestens vier Vergleichen hätten die Messzeit um rund ein Drittel und die Zahl der Tests deutlich erhöht.

Die Arbeit nennt Symfony in der Abgrenzung und im Ausblick.

**5. Komplexität und Wartbarkeit.** Wartbarkeit lässt sich nicht mit einer einzelnen Messgröße erfassen. Die Arbeit kombiniert objektive statische Kennzahlen mit dem qualitativen Debugging- und Monitoring-Vergleich und bildet keine Gesamtnote (5.22). Das ist belastbarer als eine subjektive Einschätzung und vermeidet eine scheinbare Genauigkeit.

**6. Latenzmaß.** p50, p95 und p99 werden für jeden Lauf berichtet. Als Testgröße dient aber der Mittelwert pro Lauf. Die Zeitstempel haben eine Auflösung von 1 ms, daher ist der Median eines Laufs fast immer eine ganze Zahl. Im ersten lokalen Probelauf hatten deshalb alle Paare die Differenz 0 und fielen aus dem Wilcoxon-Test. Der Mittelwert ist dagegen fein aufgelöst und unverzerrt (Widrow & Kollár 2008). Perzentile über alle Events mehrerer Läufe zu bilden, wäre Pseudoreplikation (Hurlbert 1984). Begründung im Detail: 5.8.

**7. Durchsatz.** Bei fester Senderate ist die Zahl empfangener Events pro Sekunde gleich Senderate mal Clientzahl, solange nichts verloren geht. Als Messgröße wäre sie daher wenig aussagekräftig. Aussagekräftig ist, ab welcher Rate die Zustellung zusammenbricht. Das misst der Sättigungstest (höchste nachhaltige Event-Rate), ergänzt um die Zustellquote je Lauf (5.17).

**8. Skalierung.** Die Laststufen der Hauptmessung bleiben bei 10, 50 und 500 Clients. Die zusätzliche Skalierungsreihe bis 1 000 Clients ist eine Erweiterung: Die Grenze von PHP-FPM/SSE liegt bei der Zahl der Worker (550, 5.5). Ohne Stufen oberhalb von 500 Clients ließe sich RQ2 für diese Variante nicht beantworten (H4).

**9. Laravel-Version.** Das Exposé nennt Laravel 13.x. Umgesetzt war zunächst Laravel 12.61.1. Am 2026-10-16 wurde vor dem Pilot auf Laravel 13.34.0 aktualisiert, mit Reverb 1.12.0 (unterstützt Laravel 13). Gründe:

- Übereinstimmung mit dem Exposé.
- Laravel 12 erhält seit dem 2026-08-13 keine Fehlerbehebungen mehr, nur noch Sicherheitsupdates bis 2027-02-24. Laravel 13 erhält Fehlerbehebungen bis Q3 2027 und Sicherheitsupdates bis 2028-03-17 (Laravel Release Notes, LITERATUR.md). Die Messung erfolgt damit mit einer Version, die aktiv gepflegt wird.
- Gewählt wurde die neueste Version, die zum Zeitpunkt des Upgrades mindestens zwei Wochen alt war, um nicht eine gerade erschienene Version zu messen.
- Nach dem Pilot ist ein Versionswechsel nicht mehr möglich, ohne die Vergleichbarkeit der Blöcke zu gefährden.

Ein lokaler Prüflauf im Produktionsbetrieb mit allen drei Laravel-Zellen (10 und 500 Clients) verlief ohne ungültige Läufe (`results/2026-10-16_verification-3/`).

**10. Literatur.** Die zehn Quellen des Exposés wurden einzeln geprüft (LITERATUR.md, Abschnitt zur ereignisgesteuerten Architektur). Übernommen sind alle, die eine Aussage der Arbeit stützen. Zwei Angaben sind korrigiert: Laigner et al. ist nicht bei SIGMOD 2024, sondern 2026 in ACM TOSEM erschienen, und von Lazzari & Farias wird statt der arXiv-Vorabfassung die begutachtete Zeitschriftenfassung (Farias & Lazzari 2023) zitiert. Tzialla et al. (2024) wird nicht übernommen. „Auditing" bezeichnet dort die Prüfung, ob ein Server eine Anwendung unverfälscht ausgeführt hat, und berührt keine Aussage dieser Arbeit; für Herausforderungen bei Überwachung und Fehlersuche steht Laigner et al. zur Verfügung.

**11. Grundlage der Prototypen.** Laut Exposé sollte der PHP-Prototyp das bestehende Lokato-Backend erweitern, das Scan-Ereignisse in einer relationalen Datenbank speichert. Umgesetzt sind eigenständige Prototypen, die das Ereignisformat von Lokato übernehmen (5.21), aber keine Datenbank und keine weitere Anwendungslogik enthalten. Gründe:

- Gleiche Ausgangslage: Ein Node.js-Gegenstück zum gewachsenen Lokato-Backend hätte erst nachgebaut werden müssen. Die PHP-Seite hätte sonst Code, Middleware und Datenbankzugriffe mitgebracht, die auf der Node.js-Seite fehlen, und der Vergleich hätte die beiden Code-Basen statt der Technologien gemessen.
- Kein Störfaktor durch die Datenbank: Ein Schreibzugriff pro Ereignis hätte die Latenz um die Datenbank verlängert und deren eigene Schwankung in jede Messung getragen. Die Zustellung eines Ereignisses ist die untersuchte Frage, nicht seine Speicherung.
- Lesbarkeit: Die Prototypen dienen in der Arbeit als Codebeispiele und bleiben deshalb so knapp wie möglich (Abschnitt 1).

Der Bezug zu Lokato bleibt über das Ereignisformat, die Ereignisquelle und das Szenario (Broadcast an Dashboards) erhalten.

**12. Queue in den Varianten.** Das Exposé sieht die Queue als Bestandteil der vollständigen Umsetzungen in allen vier Konfigurationen vor. Umgesetzt ist sie als eigene Achse in je einer Variante pro Sprache (5.19). So bleibt der Effekt der Queue messbar, statt sich mit dem Framework-Effekt zu vermischen; Begründung im Detail: 5.7 und 5.19.

**13. Erwartung zur Latenz.** Das Exposé erwartet, dass Node.js unter hoher Last eine geringere Latenz und einen höheren Durchsatz erreicht. H3 lässt die Richtung offen, weil zwei Mechanismen gegeneinander wirken: PHP-FPM verteilt ein Ereignis parallel in vielen Prozessen, Node.js nacheinander in einem Thread (5.18). Die Erwartung des Exposés wird in der Diskussion den Ergebnissen gegenübergestellt; die Tests sind ohnehin zweiseitig. Die Erwartung zum Ressourcenverbrauch je Verbindung bei PHP ist in H1 und H10 enthalten.

### 5.24 Schwerpunkte der schriftlichen Arbeit und Reihenfolge von Kürzungen — ENTSCHIEDEN (vor der Datenerhebung festgelegt am 2026-10-17)

Zehn Varianten, dreizehn Vergleiche, elf Hypothesen, Replikation, Skalierung, Sättigung und Code-Kennzahlen erzeugen mehr Material, als sich in einer Bachelorarbeit gleich ausführlich darstellen lässt. Die Arbeit legt deshalb vor der Messung fest, welche Themen ausführlich und welche knapp behandelt werden. Vorrangiger Zweck ist eine fokussierte, kürzere schriftliche Arbeit. Erst in zweiter Linie regelt der Abschnitt, was bei Zeitmangel an Messzeit eingespart wird.

**Schwerpunkte im Text.** Maßgeblich ist das Abstract des Exposés, das den Einfluss des Technologie-Stacks und des Transportprotokolls als Kern der Untersuchung nennt.

| Stufe | Inhalt | Darstellung |
|---|---|---|
| Kern | Sprache und Laufzeitmodell unter Last: Vergleiche 1–4, H1, H3, H4, Skalierungsreihe | ausführlich, mit eigenen Abbildungen, zentral in der Diskussion |
| Kern | Transport: Vergleiche 12 und 13, H9–H11, SSE gegen WebSocket im Sättigungstest | ausführlich, mit eigenen Abbildungen, zentral in der Diskussion |
| Ergänzung | Kosten der Architektur: Framework (Vergleiche 5–8, H5, H6), Queue (Vergleiche 9–11, H7), Anteil von Redis (H8) | ein Abschnitt, je Achse eine Tabelle und wenige Absätze |
| Ergänzung | Komplexität und Wartbarkeit (RQ3, 5.13, 5.22) | ein Abschnitt mit einer Tabelle der Kennzahlen und dem qualitativen Vergleich |
| Ergänzung | Messbetrieb, Zustellung, Replikation | knapp, Zusammenfassung im Text |
| Anhang | vollständige Tabellen aller 39 Tests je Messgröße, rangbiseriale Korrelation, Replikation je Vergleich, Stufen von Skalierung und Sättigung je Variante, Verlauf von Pilot und Kontrollmessung | nur Tabellen, im Text verwiesen |

Regeln:

- Alle vorab festgelegten Tests werden gemessen, ausgewertet und berichtet, mindestens im Anhang. Die Schwerpunkte bestimmen nur die Ausführlichkeit, nicht, was berichtet wird.
- Die Zuordnung steht vor der Datenerhebung fest und wird nicht an Ergebnisse angepasst. Ein signifikantes Ergebnis in einem Ergänzungsthema rückt dadurch nicht in den Kern, ein fehlender Unterschied im Kern wird ebenso ausführlich berichtet wie ein vorhandener. Andernfalls entstünde selektives Berichten.
- Die Holm-Korrektur gilt unverändert über alle 39 Tests je Messgröße (5.8).
- Jede Hypothese erhält in der Hypothesentabelle eine Bewertung.
- Als Effektmaß wird im Text Cliff's Delta berichtet; die rangbiseriale Korrelation steht nur in den Anhangstabellen (5.8).

**Reihenfolge von Kürzungen bei Zeitmangel.** Reicht die Messzeit nicht, wird in dieser Reihenfolge gekürzt, und nur so weit wie nötig:

1. Block 2 (Replikation) nur für die Kernvergleiche 1–4, 12 und 13 statt für alle dreizehn. Bei den Beispiel-Wiederholungszahlen spart das rund 2,5 Tage. Umsetzung: `plan-campaigns.js main --block 2 --comparisons 1,2,3,4,12,13`.
2. Wiederholungszahlen je Laststufe auf das kleinste Maß senken, das der Pilot noch trägt, mindestens 20 gültige Paare (5.9).
3. Block 2 ganz entfallen lassen. Die Arbeit berichtet dann die fehlende Replikation als Grenze.

Nicht gekürzt werden Belastungstest, Pilot, Block 1 mit allen dreizehn Vergleichen, Kontrollmessung, Skalierungsreihe und Sättigungstest. Die beiden Reihen kosten zusammen weniger als einen Tag und tragen RQ2, H4 und H11. Jede Kürzung wird mit Umfang und Grund in der Arbeit genannt.

## 6. Offene Punkte

| Punkt | Stand | Klärung durch |
|---|---|---|
| Abweichungen vom Exposé | Titel, Forschungsfragen, Transportvergleich, Symfony, Laravel-Version, eigenständige Prototypen ohne Lokato-Backend (5.23); Bestätigung ausstehend | Betreuer |
| Fehlersichtbarkeit der Laravel-Queue unter Laravel 13 | Befund aus 5.13 (Laravel 12) erneut prüfen | vor dem Schreiben des Abschnitts zu Komplexität und Wartbarkeit |
| Code-Kennzahlen | auf dem Commit der Messung erheben (5.22) | vor Block 1 |
| Hardware beschaffen | Bedarf an den Betreuer gemeldet (5.14); Bereitstellung durch die FH oder Eigenbeschaffung offen | Betreuer, Autorin |
| Auslegung „gleiches Budget pro Container" | als „pro Zelle" umgesetzt (5.6.2), Bestätigung ausstehend | Betreuer |
| Frage 8: Telemetrie statt oder zusätzlich zum Werkzeugvergleich | beides umgesetzt (5.13, 5.16) | Betreuer |
| Erprobung des Zwei-Rechner-Aufbaus | implementiert, nicht auf Pi-Hardware getestet (5.14) | nach Verfügbarkeit des Pi |
| Belastungstest, Pilot, Wiederholungszahlen, Ratenstufen | Verfahren festgelegt (5.9, 5.17) | auf dem Pi |
| Endwerte der Ressourcenlimits | Arbeitswerte 2 CPUs / 2 GiB (5.10); Speicherspitze von Laravel auf dem Pi prüfen | nach Festlegung des Pi-Modells |
| Docker-Images auf Digests pinnen | damit alle Kampagnen mit identischen Images laufen | vor Block 1 |
| Literaturangaben mit Prüfvermerk | DOIs bzw. Verlagsangaben einzelner Quellen bestätigen (LITERATUR.md) | vor Abgabe |
| Forschungslücke | in IEEE Xplore, ACM Digital Library und Google Scholar bestätigen (LITERATUR.md, Verwandte Arbeiten) | vor dem Schreiben des Kapitels |

## 7. Konventionen

- Prototypen enthalten minimalen Vergleichscode (Abschnitt 1).
- Konfiguration ausschließlich über `.env`. Geheimnisse (z. B. `prototypes/php-laravel/.env`) werden nie versioniert und nie in Images übernommen.
- Ergebnisdateien werden nie überschrieben (Zeitstempel im Verzeichnisnamen).
- Commit-Nachrichten auf Englisch im Format `<typ>: <zusammenfassung>` mit den Typen `feat`, `fix`, `infra`, `docs`, `test`.

## 8. Änderungsverlauf

| Datum | Änderung |
|---|---|
| 2026-07-26 | Abschnitte 1–4: Repository, Laufzeitumgebung, Machbarkeit von xk6-sse, Portabilität |
| 2026-08-25 | Debugging- und Monitoring-Vergleich durchgeführt (5.13); statistische Methodik erstmals festgelegt (5.8) |
| 2026-10-16 | Abstimmung mit dem Betreuer: Nginx (5.1), HTTP/1.1 (5.2), Redis (5.4), PHP-FPM (5.5), gleiches Budget (5.6), Raspberry Pi (5.14), deskriptive Kennzahlen (5.8), JSON-Protokoll (5.16). Gepaarter Wilcoxon-Test ersetzt Mann-Whitney-U, Holm ersetzt Bonferroni. Ratchet-WebSocket-Server für php-minimal ergänzt. |
| 2026-10-16 | Erste Überprüfung des Messaufbaus (zwölf Befunde): Skript und Messgröße pro Zelle (5.9), Reverb hinter dem Front-Nginx (5.6.1), Speicherlimit 2 GiB (5.10), paarweise Kampagnen (5.6.3), Paarbildung über die Laufnummer und Mittelwert pro Lauf (5.8), Durchsatz und Zustellung (5.17), Budget pro Zelle (5.6.2), Messprotokoll mit Ressourcenmessung (5.16), Pi mit separatem Lastgenerator (5.14), Holm je Messgröße, Pilot vor den Hauptkampagnen (5.8, 5.9). Frühere Prüfberichte: REVIEW.md, METHODOLOGY-REVIEW.md (historisch). |
| 2026-10-16 | Zweite Überprüfung (Bewertung als Bachelorarbeit, neun Befunde): Produktionsbetrieb (5.5), Einschwingzeit und Verbindungsaufbau (5.9), Redis im Ressourcenvergleich (5.6.2, 5.8), Messphasen mit Replikation, Skalierungsreihe und Kontrollmessung (5.9), Queue-Achse mit Vergleichen 9–11 (5.15, 5.19), Hypothesen (5.18), verwandte Arbeiten (LITERATUR.md), ein Nginx pro Zelle ohne Brücke (5.6.1), Grenzen der Testlast (5.21), Abweichungen von der Standardkonfiguration (5.20). |
| 2026-10-16 | Betrieb: Pilot-Kampagnen und Namenspräfix für Probeläufe in `plan-campaigns.js` (5.9), Statusbericht und Benachrichtigung für den Dauerbetrieb, Einrichtungsskript für den Pi (5.14). |
| 2026-10-16 | Abgleich mit dem Exposé (5.23): Transportvergleiche 12 und 13 und Hypothesen H9 bis H11 (5.15, 5.18), Testfamilien mit 39 Tests (5.8), beschreibender Transportvergleich über Skalierung und Sättigung (`series.js`), Code-Kennzahlen zu Komplexität und Wartbarkeit (5.22), Upgrade auf Laravel 13.34.0 (5.23), Quellen zu Spezifikationen und eingesetzten Technologien (LITERATUR.md), Ergebnistabellen mit Dezimalpunkt. |
| 2026-10-17 | Quellen des Exposés geprüft und übernommen, zwei Angaben korrigiert, eine verworfen (LITERATUR.md); weitere Abweichungen vom Exposé ergänzt: eigenständige Prototypen, Queue als Achse, Erwartung zur Latenz (5.23). |
| 2026-10-17 | Schwerpunkte der schriftlichen Arbeit und Reihenfolge von Kürzungen festgelegt (5.24), Cliff's Delta als einziges Effektmaß im Text (5.8). Aufgeräumt: `tools/monitor` und `tools/redis-baseline` entfernt, frühere Prüfberichte nach `docs/archive/` verschoben. |
