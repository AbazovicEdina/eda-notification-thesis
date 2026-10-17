# Prüfbericht vom 2026-07-26 (historisch)

> **Historisches Dokument.** Stand 2026-07-26, nach Abschluss der Machbarkeitsprüfung und des Grundaufbaus. Die Befunde sind inhaltlich unverändert wiedergegeben. Ihren heutigen Stand zeigt die folgende Tabelle; maßgeblich ist [DECISIONS.md](../../DECISIONS.md).

## Verbleib der Befunde (Stand 2026-10-16)

| Befund | Stand | Fundstelle |
|---|---|---|
| 1.1 PHP-Laufzeitmodell nicht festgelegt | entschieden und gebaut: PHP-FPM für SSE, Reverb bzw. Ratchet für WebSockets | DECISIONS.md 5.5 |
| 1.2 asymmetrische Proxy-Topologie | umgesetzt: ein Front-Nginx vor allen acht Zellen, einschließlich Reverb-Pfad `/app/` | 5.6.1 |
| 1.3 Ressourcen-Symmetrie | umgesetzt als gemeinsames Budget pro Zelle | 5.6.2, 5.10 |
| 1.4 Messpunkt der Latenz | umgesetzt: `ts` beim Publish; beide Zeitstempel stammen vom Lastgenerator | 5.4, 5.14 |
| 1.5 Redis-Subscription pro Prozess | umgesetzt | 5.4 |
| 1.6 Werkzeugasymmetrie SSE/WS, Keepalive | als Limitation der Arbeit; `TCP_NODELAY` nicht gesondert untersucht | — |
| 2.1 PHP-Speicher bei 500 Clients | gemessen: ca. 1 390 MiB (php-laravel/SSE, Produktionsbetrieb) statt geschätzter 15–30 GB | 5.5, 5.10 |
| 2.2 500 VUs ungetestet | lokal mit 500 SSE-Clients geprüft; auf dem Pi ausstehend | `results/2026-10-16_verification/` |
| 2.3 Gesamtlaufzeit | Wiederholungszahl aus einem Pilot, Kampagnen unbeaufsichtigt lauffähig | 5.9 |
| 2.4 Nginx- und OS-Limits | umgesetzt | README.md, Dateideskriptor-Limits |
| 2.5 Platzierung des Lastgenerators | entschieden: separater Lastgenerator | 5.14 |
| 3.1, 3.2 Versionskonflikt, ungepinnter Builder | gepinnt; Prüfung der Erweiterung vor jedem Lauf | Abschnitt 3 |
| 3.3 überschriebene Ergebnisdatei | Ergebnisverzeichnisse mit Zeitstempel | 5.16 |
| 3.4 `ws-skeleton.js` ungetestet | gegen node-minimal, node-express und php-minimal geprüft | — |
| 4 Digest-Pinning der Images | offen, vor den Hauptkampagnen | Abschnitt 6 |

---

Kritische Durchsicht des Repository-Stands und von DECISIONS.md nach Abschluss der Machbarkeitsprüfung.

Zusammenfassung: Die Grundentscheidungen (Monorepo, Docker, xk6-sse) halten der Durchsicht stand. Die Durchsicht ergab jedoch eine große inhaltliche Lücke: Das PHP-Laufzeitmodell für langlebige Verbindungen war nicht adressiert, und für PHP/WS gibt es mit PHP-FPM keinen Weg. Hinzu kamen mehrere Fairness-Faktoren, die vor den Messungen festzulegen sind. DECISIONS.md wurde entsprechend ergänzt (Abschnitte 5.5, 5.6, Erweiterungen in 5.4 und 6). Was eine Entscheidung von Autorin oder Betreuer erfordert, steht in Abschnitt 6 dieses Berichts.

## 1. Übersehene Einflussfaktoren

### 1.1 PHP-Laufzeitmodell

DECISIONS.md sah nur vor, dass alle Konfigurationen `/sse`- bzw. `/ws`-Endpunkte bereitstellen. Klassisches PHP-FPM kann langlebige Verbindungen jedoch nur teuer (SSE: ein Worker pro Verbindung) oder gar nicht (WebSockets) bedienen. Für PHP/WS ist ein langlaufender Prozess nötig (Laravel Reverb, Ratchet/ReactPHP o. Ä.). Die Wahl dieses Laufzeitmodells beeinflusst die Ergebnisse vermutlich stärker als jeder andere Faktor. Ohne Festlegung würde die Arbeit eine Deployment-Wahl messen statt PHP gegenüber Node.js. Festgelegt als Annahme 5.5: FPM für SSE, Reverb bzw. Ratchet für WS, Speicher pro Verbindung als Messgröße. Bestätigung durch den Betreuer erforderlich, da die Interpretation der Forschungsfrage betroffen ist.

### 1.2 Asymmetrische Proxy-Topologie

„Nginx als Standard" (5.1) war mehrdeutig: PHP benötigt Nginx (FPM), Node.js liefe naheliegenderweise direkt. Die PHP-Seite hätte dann einen zusätzlichen Hop mit eigenen Puffern und Timeouts, ein systematischer Unterschied außerhalb der Forschungsfrage. Entschieden (5.6): alle Konfigurationen hinter demselben Nginx mit identischer, dokumentierter Konfiguration. Dazu gehören Details, die Ergebnisse sonst unbemerkt verfälschen: `proxy_buffering off` für SSE, kein gzip auf `text/event-stream`, WS-Upgrade-Header, `proxy_read_timeout` deutlich über dem Event-Intervall (Standard 60 s), `worker_connections` explizit hoch (Standard 1024 wäre bei 500 Clients knapp).

### 1.3 Ressourcen-Symmetrie

Ohne CPU- und Speicherlimits misst der Vergleich auch, wie viele Ressourcen sich jeder Stack standardmäßig nimmt (PHP-FPM: N Prozesse auf N Kernen; Node.js: eine Event Loop auf einem Kern). Beide Varianten („Auslieferungszustand" oder „gleiches Budget") sind vertretbar, müssen aber bewusst entschieden werden. Festlegung in 5.6: identische Limits pro SUT-Container, Werte nach Kenntnis der Hardware; während einer Messung läuft nur die getestete Konfiguration.

### 1.4 Messpunkt der Latenz

Offen war, ob der Event-Generator den Zeitstempel setzt (Messung der ganzen Strecke Redis → Backend → Client) oder das Backend beim Senden (nur Transport). Für eine Arbeit über ereignisgesteuerte Systeme ist Ersteres die relevante Größe, und nur so sind die Backends fair vergleichbar; ein langsam konsumierendes Backend könnte sonst die eigene Verzögerung aus der Messung herausdefinieren. Festgelegt: `ts` setzt der Generator beim Publish; das Backend kann `sut_ts` ergänzen, um die Strecke zu zerlegen. Gemeinsame Docker-Umgebung, damit gemeinsame Uhr.

### 1.5 Redis-Anbindung der Backends

Nicht spezifiziert war, ob eine Redis-Subscription pro Prozess (prozessinterne Verteilung an alle Clients) oder eine pro Client-Verbindung besteht. Letzteres würde Redis zum Engpass machen und die Stacks unterschiedlich stark verzerren. Festgelegt: eine Subscription pro Prozess.

### 1.6 Kleinere, nur dokumentierte Punkte

- **Asymmetrie der Messwerkzeuge:** SSE wird über eine Community-Erweiterung gemessen, WS mit nativem k6; ein geringfügig unterschiedlicher Client-Overhead ist möglich. Die Latenzberechnung ist identisch (`Date.now()` beim Empfang). Als Limitation zu nennen; ohne Werkzeugwechsel nicht behebbar.
- **TCP-Details:** Standardwerte für `TCP_NODELAY` können sich zwischen direktem Node.js und Nginx-Proxy-Pfaden unterscheiden. Bei 1 Event/s kaum relevant, bei hohen Raten zu prüfen.
- **Keepalive und Reconnect:** SSE (EventSource-Retry) und WS (Ping/Pong) haben unterschiedliche Leerlaufmechanismen. Bei Events im Sekundentakt unkritisch; bei seltenen Events auf Timeouts achten (1.2).

## 2. Technische Risiken für die Messphase

1. **PHP-Speicher bei 500 SSE-Clients.** Das FPM-Modell bedeutet 500 gleichzeitige Worker. Bei Laravel können das je nach Bootstrapping 30–60 MB pro Worker sein, grob 15–30 GB nur für PHP. Ob die Zielhardware das hergibt, ist unbekannt. Gegenmaßnahmen in 5.5: OPcache, schlankes Bootstrapping, notfalls eine geringere Clientzahl für Laravel/SSE mit transparenter Dokumentation.
2. **500 VUs sind ungetestet.** Die Machbarkeit wurde bis 200 VUs ohne Verlust gezeigt; 500 sind plausibel, aber extrapoliert. Ebenso ungetestet sind höhere Event-Raten pro Verbindung (bisher 1/s). Vor der Messphase ist ein Test mit Zielparametern nötig.
3. **Gesamtlaufzeit der Messkampagne.** 4 Konfigurationen × 100–1000 Wiederholungen × mindestens 60 s ergeben im besten Fall etwa 7 Stunden, im ungünstigsten mehrere Tage. Das Orchestrierungsskript muss daher unbeaufsichtigt laufen, nach Abbruch fortsetzbar sein, eindeutige Ergebnisdateien schreiben (3.3) und Zwischenstände anzeigen.
4. **Nginx- und OS-Limits.** `worker_connections`, Dateideskriptor-Limits und Proxy-Timeouts müssen explizit gesetzt sein; sonst greifen bei etwa 500 parallelen Streams zuerst die Standardwerte der Infrastruktur, für beide Stacks gleich aussehend und schwer zu diagnostizieren. Verankert in 5.6 als Pflichtkonfiguration.
5. **CPU-Last von k6.** 500 Verbindungen mit `JSON.parse` pro Event kosten bei hohen Raten merklich CPU. Läuft der Lastgenerator auf demselben Rechner wie das gemessene System, verzerrt seine Last die Messung. Offene Frage (Abschnitt 6): ein Rechner mit Limits bzw. CPU-Pinning (gemeinsame Uhr, aber Konkurrenz) oder zwei Rechner (saubere Trennung, aber Uhrensynchronisation für Einweg-Latenzen). Empfehlung zu diesem Zeitpunkt: ein Rechner mit CPU-Pinning.

## 3. Auffälligkeiten beim Aufbau

1. **Der Versionskonflikt zwischen xk6 und k6 v2 war gefährlicher, als ein erfolgreicher Build vermuten lässt.** `xk6 build` endete mit Exit-Code 0, das Binary startete, `k6 version` zeigte lediglich keine Erweiterung; der Fehler wurde erst zur Laufzeit sichtbar. Dokumentiert in DECISIONS.md, Abschnitt 3; eine Vorabprüfung im Orchestrierungsskript ist die strukturelle Gegenmaßnahme.
2. **Der Builder war ungepinnt.** `grafana/xk6:latest` hat genau die Art Update, die den Konflikt verursacht hat. Behoben: Builder auf `grafana/xk6:1.4.7` gepinnt (Version des Machbarkeitsnachweises).
3. **Eine Ergebnisdatei wurde überschrieben.** Der fehlgeschlagene erste 50-VU-Lauf und der erfolgreiche zweite schrieben in dieselbe Datei (`Tee-Object` mit festem Namen). Hier folgenlos, da der Fehllauf keine Messdaten enthielt, als Muster für die Messphase aber nicht tragbar. Konsequenz: Ergebnisdateien mit Zeitstempel und Konfigurationskennung, nie überschreiben.
4. **`ws-skeleton.js` ist ungetestet**, da noch kein WebSocket-Server existiert. Im Dateikopf vermerkt.
5. Der Machbarkeits-Server ist ein Node.js-Server. Für die Machbarkeitsfrage (funktioniert xk6-sse als Client?) ist das unerheblich; als Performance-Baseline ist er nicht geeignet und wird dafür nicht verwendet.

## 4. Rückblick

- **Builder-Image von Anfang an pinnen** (nachgeholt, 3.2). Allgemein gilt: Jedes `:latest` ist ein möglicher unbemerkter Wechsel der Messbedingungen. `redis:7-alpine` und `node:22-alpine` sind auf Minor-Versionen gepinnt, was für die Entwicklung genügt; vor der Messphase sind exakte Digests festzuhalten.
- **Messpunkt der Latenz (1.4) und PHP-Laufzeitmodell (1.1) gehören in die ursprüngliche DECISIONS.md.** Beides sind Methodenfragen, keine Implementierungsfragen.
- Die Kernentscheidungen (Monorepo, Docker Compose, xk6-sse mit Versions-Pin) bleiben unverändert; die Machbarkeitsprüfung hat die riskanteste Annahme bestätigt.

## 5. In DECISIONS.md ergänzt

- **Neu 5.5:** PHP-Laufzeitmodell (FPM für SSE, Reverb/Ratchet für WS, Speicher als Messgröße), als Annahme markiert.
- **Neu 5.6:** Fairness-Regeln (einheitlicher Nginx mit Pflicht-Direktiven, Ressourcenlimits, eine Konfiguration pro Messung), als Annahme markiert.
- **5.4 präzisiert:** `ts` setzt der Event-Generator beim Publish; eine Redis-Subscription pro Prozess.
- **6 ergänzt:** Test mit Zielparametern vor der Messkampagne, Namenskonvention für Ergebnisse, Digest-Pinning vor der Messphase, Hinweis auf das ungetestete `ws-skeleton.js`.

## 6. Nächste Schritte zum damaligen Zeitpunkt

Bereits umgesetzt:

1. `grafana/xk6` auf 1.4.7 gepinnt, Neubau geprüft.
2. `ws-skeleton.js` als ungetestet gekennzeichnet.
3. Ergänzungen in DECISIONS.md (Abschnitt 5 dieses Berichts).

Rückmeldung von Autorin bzw. Betreuer erforderlich:

1. **PHP-Laufzeitmodell bestätigen (5.5):** FPM mit Reverb (ökosystemtypisch, empfohlen) oder durchgehend asynchrones PHP (Octane/Swoole, näher an Node.js, aber weiter entfernt von Lokato und üblichem PHP-Betrieb).
2. **Fairness-Modell bestätigen (5.6):** gleiches Ressourcenbudget (empfohlen) oder Auslieferungszustand.
3. **Platzierung des Lastgenerators (2.5):** ein Rechner mit CPU-Pinning oder zwei Rechner.
4. **Eckdaten der Zielhardware** (RAM, Kerne), ohne die weder das Ziel von 500 Clients für Laravel/SSE (2.1) noch ein konkretes Ressourcenlimit festgelegt werden kann.
