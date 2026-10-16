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

PHP, Node.js, Redis, Nginx und k6 laufen ausschließlich als Container. Ausgenommen sind die Steuerwerkzeuge `tools/orchestrate` und `tools/monitor`: Sie rufen selbst Docker auf und laufen deshalb direkt mit Node.js auf dem steuernden Rechner.

Begründung:

- Identisches Verhalten unter Windows, macOS und Linux ohne manuelle Anpassung; native Installationen driften (Versionen, Pfade).
- k6 benötigt für SSE einen eigenen Build mit der Erweiterung xk6-sse (Abschnitt 3). Der Go-Build läuft im Container (Multi-Stage, `k6/Dockerfile`), eine lokale Go-Installation entfällt.
- Der Wechsel auf die Zielumgebung (5.14) erfordert nur Docker und Compose v2.

Lokale Messwerte dienen ausschließlich der Funktions- und Plausibilitätsprüfung. Die Ergebnisse der Arbeit entstehen auf dem Raspberry-Pi-Testserver (5.14).

Mechanik:

- `docker-compose.yml`: portable Basis ohne umgebungsspezifische Einstellungen.
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

### 5.1 Webserver: Nginx für alle acht Zellen — ENTSCHIEDEN (abgestimmt am 2026-10-16)

Vorgabe: Alle Vergleiche laufen mit demselben Webserver. Welcher Webserver (Nginx oder Apache) schneller wäre, wird in der Arbeit literaturgestützt diskutiert, nicht gemessen.

Gewählt ist Nginx. Begründung:

- Nginx ist vor allen acht Zellen gebaut und geprüft (`infra/nginx/`). Ein Wechsel auf Apache erforderte `mod_proxy_fcgi` für PHP-FPM und `mod_proxy_wstunnel` für WebSockets, ohne Erkenntnisgewinn gegenüber der Literaturdiskussion.
- Nginx arbeitet wie Node.js ereignisbasiert mit einer asynchronen Verarbeitungsschleife, Apache je nach MPM mit einem Prozess oder Thread pro Verbindung. Dieser Unterschied fügt sich in die Diskussion von PHP-FPM (Worker pro Verbindung) gegenüber Node.js (Event Loop) ein.

Die PHP-Prototypen nutzen zusätzlich eine Nginx-Brücke (`nginx-bridge.conf`), die HTTP in FastCGI übersetzt. Ein Apache-Messaufbau ist nicht vorgesehen (5.11).

### 5.2 HTTP-Version: HTTP/1.1 — ENTSCHIEDEN (abgestimmt am 2026-10-16)

Alle Messungen laufen über HTTP/1.1. SSE funktioniert über HTTP/1.1 uneingeschränkt (Abschnitt 3). Ein HTTP/2-Messlauf ist nicht vorgesehen; die Arbeit erläutert den Unterschied zwischen HTTP/1.1 und HTTP/2 für SSE. Der mögliche Vorteil von HTTP/2 betrifft SSE: Multiplexing über eine Verbindung umgeht das Limit von sechs gleichzeitigen Verbindungen pro Origin, das Browser unter HTTP/1.1 einhalten. Dieser Effekt betrifft Browser-Clients und wird von k6 nicht abgebildet. Bei WebSockets ist nach dem Upgrade das WebSocket-Protokoll maßgeblich, die HTTP-Version spielt danach kaum eine Rolle.

### 5.3 Debugging- und Monitoring-Vergleich: Kriterien — ENTSCHIEDEN, durchgeführt (5.13)

Die Entwicklungswerkzeuge beider Stacks werden anhand von drei Kriterien verglichen:

1. Verfügbares Tooling (Debugger, Profiler, Log-Integration).
2. Nachvollziehbarkeit eines Events über Queue-Grenzen hinweg per Correlation-ID.
3. Sichtbarkeit von Fehlern in Queue-Workern.

Die Betreuerantwort zu Frage 8 des Abstimmungstermins betrifft das Telemetrie-Logging der Testläufe (5.16). Ob sie den Werkzeugvergleich ersetzt oder ergänzt, ist offen (Abschnitt 6).

### 5.4 Event-Backbone: Redis Pub/Sub — ENTSCHIEDEN (abgestimmt am 2026-10-16)

Alle Prototypen beziehen die Events aus Redis Pub/Sub. Den MQTT-Eingang des Ausgangsprojekts Lokato ersetzt ein Event-Simulator (`tools/event-simulator`), der direkt nach Redis publiziert. Gemessen wird die Strecke Redis → Backend → Client, nicht der MQTT-Eingang.

Auch die Minimalvariante nutzt Redis Pub/Sub; sie verzichtet nur auf Framework und Queue-Worker. Eine Variante ganz ohne Broker würde nur die Verbindungskosten pro Client messen, nicht den Zustellweg eines Events, und ist für die Fragestellung nicht ergiebig. Damit ist eine missverständliche Formulierung („Minimalvariante ohne Broker") in den Unterlagen zum Abstimmungstermin aufgelöst.

Festlegungen:

- Der Event-Simulator setzt den Zeitstempel `ts` beim Publish. Die gemessene Latenz ist damit Ende-zu-Ende einschließlich der Verarbeitung im Backend. Ein Backend kann zusätzlich `sut_ts` (eigene Sendezeit) setzen; ausgewertet wird `ts`.
- Event-Format: `{"seq":n,"ts":<ms-epoch>}`. `seq` dient der Verlustzählung (5.17).
- Jedes Backend hält **eine** Redis-Subscription pro Prozess und verteilt die Events prozessintern an alle Clients. Eine Subscription pro Verbindung würde Redis zum Engpass machen und die Stacks unterschiedlich stark verzerren.

### 5.5 PHP-Laufzeitmodell — ENTSCHIEDEN (abgestimmt am 2026-10-16)

SSE läuft über PHP-FPM, WebSockets über einen separaten, langlaufenden Prozess. Durchgehend asynchrones PHP (Octane/Swoole) ist nicht vorgesehen. Gründe, warum PHP-FPM den höheren Vergleichswert hat:

1. **Konstruktvalidität.** PHP-FPM mit einem Worker pro Verbindung ist die in der Praxis dominante Betriebsart. Ein Ergebnis mit Octane/Swoole wäre eine Aussage über asynchrones PHP, nicht über PHP in üblicher Betriebsweise.
2. **Sichtbarer Architekturunterschied.** Worker pro Verbindung (PHP-FPM) gegenüber Event Loop (Node.js) ist der Kern des Vergleichs. Beide Seiten asynchron zu bauen, würde genau diesen Unterschied einebnen.
3. **Nähe zum Ausgangsprojekt.** Lokato läuft unter klassischem PHP-FPM.

Umsetzung:

- **PHP/SSE:** PHP-FPM mit `pm = static` und `pm.max_children = 550` (über der Zielzahl von 500 Clients), für `php-minimal` und `php-laravel`.
- **PHP/WS:** Laravel Reverb (`php-laravel`) bzw. Ratchet auf ReactPHP mit asynchronem Redis-Client (`php-minimal`, `ws.php`).
- **Speicher pro Verbindung ist eine Messgröße**, kein Störfaktor. Lokale Messung mit 500 SSE-Clients am 2026-10-16: Die Spitze des Working Sets betrug bei php-laravel/SSE ca. 1 035 MiB, bei php-minimal/SSE ca. 397 MiB (Konsequenz für die Limits: 5.10).

### 5.6 Fairness-Regeln — ENTSCHIEDEN (abgestimmt am 2026-10-16; Präzisierung in 5.6.2 offen)

**Node.js läuft als einzelner Prozess** ohne `cluster`-Modul. Wie PHP-FPM ist das der ökosystemtypische Standardbetrieb ohne gezielte Zusatzoptimierung. Eine Konsequenz ist in der Arbeit zu berichten: Ein Node-Prozess führt JavaScript auf einem Kern aus und kann ein Budget von zwei Kernen strukturell nicht ausschöpfen, PHP-FPM mit mehreren Worker-Prozessen dagegen schon. Gleiches Budget bedeutet gleiche Zuteilung, nicht gleiche Ausschöpfbarkeit. Die tatsächlich genutzte CPU-Zeit wird pro Lauf gemessen (5.16) und macht den Effekt sichtbar.

#### 5.6.1 Einheitliche Topologie

Alle Zellen laufen hinter demselben Front-Nginx (`infra/nginx/`), auch die Node-Varianten. Andernfalls hätte nur PHP einen zusätzlichen Hop mit eigenen Puffern und Timeouts. Pflicht-Direktiven:

- `proxy_buffering off` für SSE,
- kein gzip,
- Upgrade-Header für WebSockets (Pfade `/ws` und `/app/` für Reverb),
- `proxy_read_timeout` weit über dem Event-Intervall,
- `worker_connections` und Dateideskriptor-Limits mindestens doppelt so hoch wie die Zielzahl der Clients.

#### 5.6.2 Gleiches Ressourcenbudget pro Zelle

Jede Zelle erhält dasselbe CPU- und Speicherbudget (Werte: 5.10). Vergleichseinheit ist die **Zelle**, nicht der Container. Die PHP-Zellen bestehen teils aus zwei Containern, die jedes Event durchläuft (FPM und Nginx-Brücke bzw. Reverb und Listener). Ein Limit pro Container würde PHP insgesamt mehr Ressourcen zugestehen als Node.js. Eine lokale Messung am 2026-10-16 zeigt, wie groß dieser Anteil sein kann: Bei php-laravel/WS entfiel in einem Lauf mit 50 Clients der größere Teil der CPU-Zeit auf den Listener (0,064 s gegenüber 0,020 s für Reverb). Ohne gemeinsames Budget liefe dieser Teil unbegrenzt.

Umsetzung:

- Auf dem Pi liegen alle Container einer Zelle in einer gemeinsamen systemd-Slice (`eda_<zelle>.slice`) mit `CPUQuota` und `MemoryMax` (`docker-compose.pi.yml`, `infra/pi/setup-slices.sh`).
- Zusätzlich gilt pro gemessenem Container dasselbe Limit (`x-sut-resources` in `docker-compose.yml`). Lokal ist das die einzige Begrenzung; lokale Werte dienen nur der Funktionsprüfung.
- SUT-Container nutzen keinen Swap (`memswap_limit` gleich `mem_limit`, auf dem Pi zusätzlich `MemorySwapMax=0`).

Offen: Die Betreuervorgabe lautete „gleiches Budget pro Container". Sie wird als „gleiches Budget pro verglichenem System" ausgelegt, da sie vermutlich von einem Container pro Zelle ausging. Die Bestätigung steht aus (Abschnitt 6).

#### 5.6.3 Nur die Zellen der laufenden Kampagne sind gestartet

Während einer Kampagne laufen ausschließlich die Container der verglichenen Zellen sowie Redis, Front-Nginx, Event-Simulator und `resource-sampler`. Nicht gemessene Zellen sind nicht untätig: Sie halten Redis-Subscriptions, verarbeiten jedes Event mit und belegen Speicher (statische FPM-Pools). Der Orchestrator stoppt deshalb vor Kampagnenbeginn alle übrigen Dienste und startet die benötigten.

Das alternierende Design (5.9) benötigt beide Zellen eines Vergleichs gleichzeitig. Gemessen wird daher **paarweise**: eine Kampagne pro geplantem Vergleich (5.15). Die gegenseitige Störung innerhalb eines Paares ist symmetrisch. Da jede Zelle in zwei Vergleichen vorkommt, wird sie in zwei Kampagnen gemessen.

### 5.7 Messumfang: Minimal- und Framework-Variante — ENTSCHIEDEN

Gemessen werden beide Varianten pro Sprache:

- **Framework-Variante** (`php-laravel`, `node-express`): Hauptvergleich PHP gegenüber Node.js, nahe am realistischen Einsatz in Lokato.
- **Minimalvariante** (`php-minimal`, `node-minimal`): Baseline ohne Framework. Sie zeigt, ob ein Unterschied von Sprache und Laufzeit kommt oder vom Framework.

Daraus ergeben sich acht Zellen (2 Sprachen × 2 Transportarten × 2 Varianten). Die Queue-Grundgerüste (BullMQ, `ProcessScanEvent`) sind bewusst nicht Teil des gemessenen SSE/WS-Pfads. Der Vergleich Minimal- gegenüber Framework-Variante zeigt damit Framework-Overhead, nicht zusätzlich Queue-Overhead.

### 5.8 Statistische Auswertung — ENTSCHIEDEN (vor der Datenerhebung festgelegt)

Alle Festlegungen dieses Abschnitts sind vor der Hauptmessung getroffen und in `tools/orchestrate/plan.json` maschinenlesbar fixiert. Testverfahren, Schwellenwerte und Testfamilien werden nicht nachträglich an Ergebnisse angepasst. Quellen: LITERATUR.md.

**Analyseeinheit: der k6-Lauf.** Events innerhalb eines Laufs teilen Prozesszustand und Host-Auslastung und sind nicht unabhängig. Sie als Stichprobe zu behandeln, wäre Pseudoreplikation (Hurlbert 1984). Jeder Lauf liefert pro Messgröße einen Wert, verglichen werden diese Werte über die Läufe hinweg.

**Kennzahl pro Lauf: Mittelwert der Latenz.** Die Zeitstempel haben eine Auflösung von 1 ms (Abschnitt 3). Jede einzelne Latenz ist daher ganzzahlig, und auch der Median eines Laufs ist fast immer eine ganze Zahl. Bei niedriger Last liegen beide Zellen eines Vergleichs oft auf demselben Median. Solche Paare haben die Differenz 0 und fallen aus dem Wilcoxon-Test heraus; im ersten lokalen Probelauf betraf das alle Paare. Der Rundungsfehler pro Event ist dagegen gleichverteilt und im Mittel null, weil Senden und Empfangen nicht im Millisekundentakt erfolgen. Über viele Events mittelt er sich heraus, sodass der Mittelwert pro Lauf fein aufgelöst und unverzerrt ist (Quantisierungsrauschen; Widrow & Kollár 2008). Der Mittelwert reagiert stärker auf Ausreißer als der Median. Das ist vertretbar, weil Ausreißer reale Nutzererfahrung abbilden und die Robustheit des Vergleichs aus dem nichtparametrischen Test über die Läufe hinweg kommt. Median, p95, p99 und Maximum werden zusätzlich beschreibend berichtet, da Tail-Latenzen für Nutzer oft wichtiger sind als der Durchschnitt (Dean & Barroso 2013).

**Deskriptive Kennzahlen** (Vorgabe vom 2026-10-16): Für jede Messgröße und Zelle werden über die Läufe Mittelwert, Minimum, Maximum, Median, p95, p99, Standardabweichung und Varianz ausgegeben.

**Signifikanztest: Wilcoxon-Vorzeichen-Rang-Test** (gepaart, zweiseitig, α = 0,05; Wilcoxon 1945).

- Ein Paar besteht aus den beiden Läufen derselben Laufnummer, die im alternierenden Design (5.9) direkt nacheinander stattfanden. Es zählt nur, wenn beide Läufe gültig sind. Die Paare werden über die Laufnummer gebildet, nicht über die Position in einer Liste; ein ausgefallener Lauf verschiebt daher keine nachfolgenden Paare.
- Differenzen von exakt 0 werden verworfen (Verfahren nach Wilcoxon).
- Bis 50 Paare ohne Bindungen gilt der exakte p-Wert aus der Nullverteilung, darüber die Normalapproximation mit Stetigkeits- und Bindungskorrektur der Varianz.
- Bleiben weniger als 10 verwertbare Paare, wird der Vergleich als nicht aussagekräftig markiert.
- Ein nichtparametrischer Test ist gewählt, weil Latenzverteilungen rechtsschief und Performance-Messdaten typischerweise nicht normalverteilt sind (Georges et al. 2007; Kalibera & Jones 2013). Eine auf der Normalverteilung beruhende Signifikanzprüfung (Vorschlag vom 2026-10-16) wird deshalb bewusst nicht verwendet; die Arbeit begründet diese Abweichung. Gegenüber dem ungepaarten Mann-Whitney-U-Test nutzt der gepaarte Test die Paarstruktur des Designs und ist dadurch trennschärfer.

**Effektstärke.** Signifikanz allein sagt nichts über die praktische Größe eines Unterschieds; bei vielen Wiederholungen wird nahezu jeder Unterschied signifikant (Arcuri & Briand 2014).

- **Cliff's Delta** (Cliff 1993) ist das eingeordnete Effektmaß. Die Schwellen nach Romano et al. (2006) sind vorab festgelegt:

  | \|δ\| | Einordnung |
  | --- | --- |
  | < 0,147 | vernachlässigbar |
  | 0,147 – < 0,33 | klein |
  | 0,33 – < 0,474 | mittel |
  | ≥ 0,474 | groß |

- Zusätzlich wird die **rangbiseriale Korrelation für gepaarte Daten** ausgegeben: r = (W⁺ − W⁻) / (W⁺ + W⁻) (Kerby 2014). Sie ist das zum Wilcoxon-Test passende Effektmaß, da Cliff's Delta die Paarung nicht berücksichtigt.

**Konfidenzintervall:** Das 95-%-Intervall für den Median der gepaarten Differenzen wird per nichtparametrischem Bootstrap bestimmt (Perzentil-Methode, 10 000 Resamples; Efron & Tibshirani 1993). Der Zufallsgenerator startet mit einem festen, im Ergebnis protokollierten Startwert; jede Neuauswertung liefert dasselbe Intervall.

**Mehrfachtests: Holm-Korrektur je Testfamilie** (Holm 1979). Bei vielen Tests steigt die Wahrscheinlichkeit, dass mindestens einer zufällig signifikant wird (familienweise Fehlerrate). Die Holm-Korrektur kontrolliert diese Rate bei beliebiger Abhängigkeit zwischen den Tests und ist trennschärfer als die Bonferroni-Korrektur. Die Familien sind vorab festgelegt (`plan.json`):

| Familie | Rolle | Tests |
|---|---|---|
| Latenz (Mittelwert pro Lauf) | primär | 8 Vergleiche × 3 Laststufen = 24 |
| CPU-Zeit der Zelle pro Lauf | sekundär | 24 |
| Spitze des Speicher-Working-Sets der Zelle pro Lauf | sekundär | 24 |

Getrennte Familien für Haupt- und Nebenmessgrößen sind üblich, sofern sie vorab festgelegt sind. Die Korrektur erfolgt über alle Kampagnen hinweg in `tools/orchestrate/evaluate.js`. Geplante, aber nicht gemessene Tests gehen mit p = 1 ein, damit Weglassen die Korrektur nicht abschwächt. Der Sättigungstest (5.17) wird nur beschreibend ausgewertet.

Implementierung: `tools/orchestrate/stats.js` und `pairing.js`. Die Tests in `tools/orchestrate/test/stats.test.js` prüfen sie gegen von Hand gerechnete Werte, u. a. die exakte Nullverteilung für n = 5 und n = 6, die Bindungskorrektur und die Holm-Schwellen.

Validitätsrahmen der Gesamtmethodik: Wohlin et al. (2024).

### 5.9 Versuchsablauf und Stichprobengröße — ENTSCHIEDEN (Wiederholungszahlen nach dem Pilot)

**Ablauf einer Kampagne** (`tools/orchestrate/run.js`):

- Alternierendes Design A, B, A, B statt Blöcken. Es schützt vor Zeit-Drift (z. B. steigende Temperatur oder Hintergrundlast), die sonst nur eine Konfiguration träfe.
- Warm-up: Die ersten 5 Läufe pro Konfiguration und Laststufe gehen nicht in die Auswertung ein (Aufwärmen von JIT und OPcache, Verbindungsaufbau, Dateisystem-Cache; Georges et al. 2007).
- Zufällige Pause von 100–500 ms zwischen den Läufen.
- Laststufen: Baseline (10 Clients), Medium (50) und Stress (500), Haltezeit je Lauf 60 s, 1 Event/s.
- Skript, Messgröße und zusätzliche Umgebungsvariablen sind pro Zelle festgelegt (`tools/orchestrate/cells.json`) und pro Kampagne überschreibbar. Damit kann eine Kampagne Zellen mit unterschiedlichen k6-Skripten vergleichen (z. B. `ws-skeleton.js` gegen `ws-reverb.js` in Vergleich 4).
- Ungültige Läufe werden gezählt und ausgewiesen: k6-Fehler, keine Events empfangen, Container abgestürzt oder per OOM beendet, fehlgeschlagene Ressourcenmessung, Drosselung des Pi. Übersteigt ihr Anteil 5 % der gemessenen Läufe einer Konfiguration, bricht die Kampagne ab, da die Ergebnisse dann nicht belastbar sind.
- Pro Lauf entsteht ein vollständiges Messprotokoll (5.16).

**Stichprobengröße: Pilot vor den Hauptkampagnen.** Ohne Daten von der Zielhardware lässt sich die nötige Zahl an Wiederholungen nicht verlässlich vorab bestimmen. Der Betreuer bat zudem darum, auszuweisen, ab wie vielen Wiederholungen sich Unterschiede zeigen (2026-10-16). Ablauf:

1. **Pilot** auf dem Pi (Kampagnen mit `phase: pilot`): Zwischenauswertungen alle N Läufe zeigen, ab welcher Wiederholungszahl sich Median-Differenz, Konfidenzintervall und Einordnung von Cliff's Delta stabilisieren. Kriterium: Vorzeichen und Effektklasse ändern sich nicht mehr, und die Breite des Konfidenzintervalls nimmt je weiteren N Läufen um weniger als 10 % ab.
2. **Festlegung** der Wiederholungszahl pro Laststufe für die Hauptkampagnen.
3. **Hauptkampagnen** (`phase: main`) mit fester Wiederholungszahl. Zwischenauswertungen dienen dort nur der Kontrolle, nicht als Abbruchkriterium: Wiederholtes Testen auf anwachsenden Daten mit Abbruch bei Signifikanz erhöht die Fehlerrate erheblich (Armitage, McPherson & Rowe 1969). Pilotdaten gehen nicht in die konfirmatorische Auswertung ein.

Die Frage, ab wie vielen Wiederholungen sich ein Unterschied zeigt, beantworten damit die Pilotdaten.

Als Ausgangsrahmen bis zum Pilot dienen die Werte aus den Unterlagen zum Abstimmungstermin (nicht für Pi-Hardware durchgerechnet): Baseline 800–1 000, Medium 300–500, Stress 100–150 Läufe pro Konfiguration. Durch die paarweisen Kampagnen (5.6.3) wird jede Zelle zweimal gemessen; das Zeitbudget ist nach dem Pilot zu prüfen.

### 5.10 Ressourcenlimits — ENTSCHIEDEN (Endwerte nach Festlegung des Pi-Modells)

Arbeitswerte: **2 CPUs und 2 GiB Speicher pro Zelle** (`SUT_CPU_LIMIT`, `SUT_MEM_LIMIT` in `.env`), kein Swap.

Der Speicher ist bewusst großzügig bemessen, weil RAM eine gemessene Größe ist und keine Obergrenze, die einzelne Zellen per OOM-Kill aus dem Vergleich entfernt. Das frühere Limit von 512 MiB hätte php-laravel/SSE bei 500 Clients abgebrochen (gemessene Spitze ca. 1 035 MiB, 5.5). Unter 2 GiB lief der Stresstest lokal ohne OOM, ohne verlorene Events und ohne Verbindungsfehler (2026-10-16). Der Orchestrator wertet jeden Lauf als ungültig, in dem ein Container der Zelle per OOM beendet wurde.

Die Endwerte hängen vom Pi-Modell ab. Ein Pi 5 hat vier Kerne. Bei paarweisen Kampagnen laufen zwei Zellen gleichzeitig; mit 2 GiB je Zelle sind 8 GB RAM erforderlich.

### 5.11 Apache-Vergleich — ENTFÄLLT (5.1)

Kein Apache-Messaufbau; die Arbeit diskutiert den Vergleich literaturgestützt. Für eine spätere empirische Prüfung wäre Apache mit `mod_proxy_fcgi` vor demselben PHP-FPM-Backend zu betreiben, sodass ausschließlich der Webserver variiert.

### 5.12 HTTP/2-Messung — ENTFÄLLT (5.2)

Kein zweiter Nginx-Server-Block mit TLS und HTTP/2; die Arbeit diskutiert den Unterschied. Ob k6 und xk6-sse HTTP/2 aushandeln würden, ist ungeprüft.

### 5.13 Debugging- und Monitoring-Vergleich: Ergebnisse — DURCHGEFÜHRT (2026-08-25)

Die Kriterien aus 5.3 wurden gegen den bestehenden Code geprüft. Der Experimentcode lag nur temporär vor; die Prototypen sind unverändert.

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
- *Laravel Queue:* `queue:work` zeigt in der Konsole nur `... FAIL`, ohne Fehlermeldung oder ID. Das Standard-Fehlerprotokoll (Tabelle `failed_jobs`, `DatabaseUuidFailedJobProvider`) ist im verwendeten Laravel-12-Starter-Kit nicht sofort funktionsfähig: Die Migration für `failed_jobs` gehört nicht zu den Standard-Migrationen, und in der gewählten Konfiguration existiert keine SQLite-Datenbankdatei (`CACHE_STORE=file` und `SESSION_DRIVER=cookie` vermeiden SQLite bewusst im SSE-Pfad). Der Versuch, den fehlgeschlagenen Job zu protokollieren, scheitert daher mit einer zweiten Exception (`SQLiteDatabaseDoesNotExistException`), die die eigentliche Fehlermeldung verdeckt. Die Correlation-ID erscheint nur als Nebeneffekt im serialisierten Datenblock in `storage/logs/laravel.log`. Abhilfe: `php artisan queue:failed-table` mit funktionierender Datenbank (Betriebsschritt) oder eine `failed()`-Methode in der Job-Klasse (Laravels vorgesehener Hook, ca. drei Zeilen mit `Log::error(...)` und `$this->payload`).

Einordnung: BullMQ bietet Fehlersichtbarkeit ohne zusätzliche Infrastruktur (Redis-natives Failed-Set). Laravels Standardmechanismus setzt eine eingerichtete Datenbank voraus, die in einem schlanken, datenbankfreien Aufbau nicht automatisch vorhanden ist. Das ist ein Unterschied im Betriebsaufwand, kein Fehler in Laravel.

### 5.14 Testumgebung: Raspberry Pi mit separatem Lastgenerator — ENTSCHIEDEN (Modell offen)

Vorgabe vom 2026-10-16: Die Messungen laufen auf einem selbst aufgesetzten Raspberry Pi; erwogen wurden auch mehrere Pis für unterschiedliche Vergleiche.

**Aufbau:** Ein Pi ist reiner Testserver (Redis, Front-Nginx, die Zellen der laufenden Kampagne, `resource-sampler`). k6, Event-Simulator und Orchestrator laufen auf einem separaten Lastgenerator, der per Kabel verbunden ist. Die Einrichtung beschreibt `infra/pi/README.md`.

Begründung:

- **Kein Engpass durch das Lastwerkzeug.** Ein Pi hat vier Kerne, das Budget einer Zelle beträgt zwei. Auf den übrigen Kernen müssten k6 (bei 500 Clients rechenintensiv), Event-Simulator, Redis und Nginx laufen. Bei der Stress-Stufe würde dann die Grenze des Werkzeugs gemessen statt die des Systems.
- **Eine Uhr für beide Zeitstempel.** Sendezeitstempel (Event-Simulator) und Empfangszeitpunkt (k6) stammen beide vom Lastgenerator, eine Synchronisation zwischen Geräten ist nicht nötig. NTP erreicht typischerweise nur Genauigkeiten im Millisekundenbereich (RFC 5905), was bei Latenzen im einstelligen Millisekundenbereich nicht ausreichen würde. Die Netzwerkstrecke ist in jeder Latenz enthalten, für alle Zellen gleich und verzerrt den Vergleich nicht.
- **Identische Hardware für alle Zellen.** Alle Kampagnen laufen nacheinander auf demselben Pi.

Mehrere Pis parallel (je ein Vergleichspaar pro Gerät) wurden verworfen. Zwei Geräte desselben Modells unterscheiden sich in Fertigungsstreuung, Kühlung und Speichermedium. Gepaarte Vergleiche auf demselben Gerät blieben zwar gültig, Gegenüberstellungen über Geräte hinweg (z. B. Skalierungsverläufe aller acht Zellen) enthielten aber den Hardwareunterschied.

Bekannte Risiken auf dem Pi und ihre Behandlung:

| Risiko | Behandlung |
|---|---|
| memory-cgroup unter Raspberry Pi OS ggf. deaktiviert, Speicherlimits dann wirkungslos | Boot-Parameter (`infra/pi/README.md`); die Vorabprüfung bricht ab, wenn der Controller fehlt |
| thermische Drosselung bei Dauerlast | aktive Kühlung; Temperatur und Drosselstatus pro Lauf protokolliert; gedrosselte Läufe sind ungültig |
| Taktanpassung (CPU-Governor) erzeugt Rauschen | Governor fest auf `performance` (`infra/pi/cpu-performance.service`), Vorabprüfung |
| Swap verzerrt Speicher- und Latenzmessung | Swap abgeschaltet, Vorabprüfung |
| ARM64-Kompatibilität | alle Basis-Images multi-arch, geprüft am 2026-10-16 |

Stand: Der Zwei-Rechner-Aufbau ist implementiert, aber noch nicht auf Pi-Hardware erprobt. Offen sind das Pi-Modell (empfohlen: Pi 5 mit 8 GB) und das Gerät für den Lastgenerator (Abschnitt 6).

### 5.15 Geplante Vergleiche — ENTSCHIEDEN

Aus den acht Zellen ergeben sich acht geplante Vergleiche, nicht alle 28 möglichen Paare. Ausgewählt sind nur jene, die eine der beiden Forschungsfragen (Sprache, Framework-Overhead) direkt beantworten. Das beantwortet die Betreuerfrage, was am Ende sinnvoll miteinander verglichen werden soll:

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

Jeder Vergleich wird in einer eigenen Kampagne über die drei Laststufen gemessen (5.6.3). Die Signifikanztests werden je Messgröße über alle 24 Tests (8 Vergleiche × 3 Laststufen) mit Holm korrigiert (5.8). SSE und WebSockets werden nicht gegeneinander getestet; die Transportart ist Kontext, keine Vergleichsachse.

### 5.16 Messprotokoll und Telemetrie — ENTSCHIEDEN, umgesetzt

Vorgabe vom 2026-10-16: Telemetriedaten als Datei speichern (Dauer, übertragene Bytes, Bytes pro Sekunde u. a.); die Tests sollen ein aussagekräftiges Log im JSON-Format erzeugen.

Ablage pro Kampagne unter `results/<zeitstempel>_<name>/`:

| Datei | Inhalt |
|---|---|
| `campaign.json` | verwendete Kampagnendefinition |
| `campaign.log.jsonl` | fortlaufendes Ereignisprotokoll: Start, gestoppte und gestartete Dienste, Kontext, jeder Lauf mit Kurzergebnis, Zwischenauswertungen, Abbruch |
| `runs/<laststufe>_<konfiguration>_runNNNN.json` | vollständiges Protokoll eines Laufs |
| `aggregate.json` | Kampagnenauswertung: deskriptive Kennzahlen, Vergleiche mit unkorrigierten p-Werten, Zwischenstände, ggf. Sättigung |

`tools/orchestrate/evaluate.js` erzeugt die Gesamtauswertung über alle Hauptkampagnen (`results/<zeitstempel>_evaluation/`, JSON und Markdown-Tabellen).

Inhalt eines Lauf-Protokolls:

- **Lauf:** Konfiguration, Zelle, Laststufe, Laufnummer, Warm-up, Gültigkeit mit Grund, Start- und Endzeit.
- **Last:** Clients, Haltezeit, eingestellte Event-Rate, Skript, Messgröße.
- **Latenz:** Mittelwert, Minimum, Median, p90, p95, p99, Maximum.
- **Zustellung** (5.17): empfangene, eindeutige, erwartete, verlorene und doppelte Events, Zustellquote, zugestellte Events pro Sekunde, gemessene Senderate.
- **Netz:** empfangene und gesendete Bytes sowie Bytes pro Sekunde (k6 `data_received` und `data_sent`; für SSE und WebSockets geprüft am 2026-10-16), mittlere Verbindungsdauer.
- **Ressourcen der Zelle und jedes ihrer Container:**
  - CPU-Zeit als Differenz des cgroup-Zählers `usage_usec` zwischen Beginn und Ende des Laufs (exakt) sowie mittlere CPU-Auslastung in Kernen;
  - Speicher (`memory.current` und Working Set = `memory.current` − `inactive_file`, wie bei `docker stats`) als Mittel und Spitze, alle 250 ms abgetastet.
- **Host:** Temperatur zu Beginn, am Ende und als Maximum; Drosselstatus zu Beginn und am Ende.
- **Container:** Status, OOM-Kennzeichen, Image.
- **Kontext:**
  - Code-Stand (Git-Commit beider Seiten, Anzahl nicht committeter Änderungen);
  - k6- und Erweiterungsversion;
  - Host (Modell, Kernel, Kerne, RAM, Swap, cgroup-Controller, Governor);
  - wirksame Limits und Images aller Container der Zellen.
- **Rohdaten:** vollständige k6-Zusammenfassung.

Von zusätzlichen Umgebungsvariablen (z. B. dem Reverb-App-Key) werden nur die Namen protokolliert, nie die Werte.

Ressourcenmessung: `tools/resource-sampler` liest die cgroup-v2-Dateien direkt. Er ersetzt für die Messungen `docker stats` (`tools/monitor`), das pro Abfrage ein bis drei Sekunden benötigt, selbst CPU auf dem gemessenen Rechner verbraucht und nicht an einzelne Läufe gekoppelt war. `tools/monitor` bleibt für manuelle Beobachtungen erhalten.

Offen ist, ob die Betreuerantwort zu Frage 8 den Werkzeugvergleich (5.3, 5.13) ersetzt oder ergänzt (Abschnitt 6).

### 5.17 Durchsatz und Zustellung — ENTSCHIEDEN, umgesetzt

Durchsatz ist als Messgröße angekündigt („wie viele Events pro Sekunde zugestellt werden"). Bei fester Event-Rate ist die Zahl der zugestellten Events pro Sekunde jedoch durch die Last vorgegeben (Clients × Rate) und unterscheidet die Zellen nicht, solange keine Events verloren gehen. Durchsatz wird daher in zwei Stufen erfasst:

1. **Zustellung bei fester Rate** (alle Kampagnen):
   - Jedes Event trägt eine laufende Nummer `seq`. k6 zählt pro Verbindung erwartete Events (alle Nummern zwischen dem ersten und dem letzten empfangenen Event) sowie eindeutige, verlorene und doppelte Events (`k6/lib/delivery.js`). Daraus ergibt sich die Zustellquote.
   - Die tatsächliche Senderate wird aus den Zeitstempeln der Events bestimmt, nicht aus der eingestellten Rate.
   - Einschränkung: Verluste nach dem letzten empfangenen Event einer Verbindung sind nicht erkennbar. Bei Haltezeiten weit über dem Event-Intervall ist das vernachlässigbar.
2. **Sättigungstest** (eigene Kampagnen, `phase: saturation`):
   - Feste Clientzahl, stufenweise steigende Event-Rate, wenige Wiederholungen pro Stufe, rein beschreibende Auswertung.
   - Ergebnis pro Zelle ist die höchste nachhaltige Rate: die höchste Stufe, bis zu der auf jeder Stufe im Median mindestens 99 % der Events zugestellt werden und die p95-Latenz im Median höchstens 1 000 ms beträgt.
   - Die Latenzgrenze orientiert sich an der Grenze von etwa einer Sekunde, bis zu der Verzögerungen den Gedankenfluss von Nutzern nicht unterbrechen (Nielsen 1993).
   - Clientzahl und Ratenstufen werden nach dem Pilot festgelegt.

Der Event-Simulator taktet nach absolutem Zeitplan (Start + seq · Intervall) statt „senden, dann volles Intervall warten". Letzteres hätte die Rate systematisch um die Dauer jedes Publish-Vorgangs gesenkt. Lokal hielt der Simulator 500 Events/s auf 0,1 Events/s genau ein (2026-10-16).

## 6. Offene Punkte

| Punkt | Stand | Klärung durch |
|---|---|---|
| Pi-Modell und RAM | Empfehlung Pi 5 mit 8 GB (5.10, 5.14) | Autorin, Betreuer |
| Gerät für den Lastgenerator | Linux-Rechner mit mindestens vier Kernen empfohlen (5.14) | Autorin |
| Auslegung „gleiches Budget pro Container" | als „pro Zelle" umgesetzt (5.6.2), Bestätigung ausstehend | Betreuer |
| Frage 8: Telemetrie statt oder zusätzlich zum Werkzeugvergleich | beides umgesetzt (5.13, 5.16) | Betreuer |
| Erprobung des Zwei-Rechner-Aufbaus | implementiert, nicht auf Pi-Hardware getestet (5.14) | nach Verfügbarkeit des Pi |
| Pilot: Wiederholungszahlen und Ratenstufen des Sättigungstests | Verfahren festgelegt (5.9, 5.17) | Pilot auf dem Pi |
| Endwerte der Ressourcenlimits | Arbeitswerte 2 CPUs / 2 GiB (5.10) | nach Festlegung des Pi-Modells |
| Docker-Images auf Digests pinnen | damit alle Kampagnen mit identischen Images laufen | vor den Hauptkampagnen |

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
| 2026-10-16 | Überprüfung des Messaufbaus mit zwölf Befunden: Skript und Messgröße pro Zelle (5.9), Reverb hinter dem Front-Nginx (5.6.1), Speicherlimit 2 GiB (5.10), paarweise Kampagnen (5.6.3), Paarbildung über die Laufnummer und Mittelwert pro Lauf (5.8), Durchsatz und Zustellung (5.17), Budget pro Zelle (5.6.2), Messprotokoll mit Ressourcenmessung (5.16), Pi mit separatem Lastgenerator (5.14), Holm je Messgröße, Pilot vor den Hauptkampagnen (5.8, 5.9), Aktualisierung der Dokumentation. Frühere Prüfberichte: REVIEW.md, METHODOLOGY-REVIEW.md (historisch). |
