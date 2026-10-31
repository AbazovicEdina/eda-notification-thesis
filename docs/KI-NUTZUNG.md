# Nutzung von KI im praktischen Teil

Diese Seite beschreibt, wie im praktischen Teil der Bachelorarbeit KI eingesetzt wurde, wie die Arbeit zwischen Autorin und KI aufgeteilt war und wie die Ergebnisse geprüft wurden. Die schriftliche Arbeit dokumentiert ihre KI-Nutzung zusätzlich in der Kurzform der FH-Vorlage. Der Betreuer hat die KI-Nutzung einschließlich Programmierunterstützung und Textentwürfen am 2026-10-19 bestätigt (DECISIONS.md, Änderungsverlauf).

Die Commits tragen bewusst keinen KI-Vermerk. Die KI-Nutzung betrifft nahezu alle Dateien des Repositorys, und ein Vermerk je Commit gibt keine Auskunft darüber, wie gearbeitet und geprüft wurde. Deshalb ist sie an dieser Stelle vollständig beschrieben.

## Werkzeuge

- **Claude Code (Anthropic)** mit verschiedenen Claude-Modellen, für den gesamten praktischen Teil. Dazu gehören Recherche, Vorbereitung von Entscheidungen, Code, Einrichtung der Hardware, Fehlersuche, Auswertung und Dokumentation.
- **Ein Claude-Projekt auf claude.ai,** eingerichtet als Unterstützung für die schriftliche Arbeit. Es prüfte am 2026-10-17 den Messaufbau aus Sicht der Arbeit, die Befunde wurden über Claude Code umgesetzt.

Weitere KI-Werkzeuge kamen nicht zum Einsatz.

## Vorgehen

1. **Überblick und erste Entscheidungen (ab Juli 2026, in den Semesterferien).** Ausgehend vom Exposé sammelte die Autorin mit Claude Code die Entscheidungen, die für einen fairen Vergleich zu treffen waren, und verschaffte sich einen Überblick über das Thema. Die Optionen recherchierte sie anschließend selbst und ließ auf dieser Grundlage erste Prototypen umsetzen, darunter die Machbarkeitsprüfung von xk6-sse (DECISIONS.md, Abschnitt 3). Was sich vor der Rückmeldung des Betreuers entscheiden ließ, wurde in dieser Zeit festgelegt (DECISIONS.md, Abschnitte 1 bis 4). Prüfberichte zum Grundaufbau (Juli) und zur Methodik (August) liegen in `docs/archive/`.
2. **Abstimmung und Ausbau (Oktober 2026).** Nach der Abstimmung mit dem Betreuer am 2026-10-16 entstanden die zehn Prototypen in ihrer heutigen Form, der Orchestrator, die Ressourcenmessung und die statistische Auswertung. Zwei Überprüfungen des Messaufbaus mit zwölf und neun Befunden gingen in die Methodik ein.
3. **Hardware und Probeläufe (ab 2026-10-22).** Die Autorin baute Raspberry Pi und Lastgenerator auf, führte alle Befehle selbst aus und gab die Ausgaben zur Auswertung zurück. Auffälligkeiten analysierte sie mit Claude Code und passte die Methode vor Beginn des Pilots an (Verlauf unten).

## Arbeitsteilung

| Bereich | Beitrag der KI | Beitrag der Autorin |
|---|---|---|
| Fragestellung, Vergleiche, Hypothesen | Überblick, Optionen mit Begründung, Gegenargumente | Auswahl und Festlegung, Abstimmung mit dem Betreuer |
| Methodik und Fairness | Vorschläge und Bewertung von Möglichkeiten | Entscheidung nach Rückfragen und eigener Recherche, Prüffragen zur Fairness |
| Code (Prototypen, Orchestrator, Ressourcenmessung, Statistik, Abbildungen) | nahezu vollständig erstellt | Anforderungen, Beobachtungen und Änderungswünsche, Abnahme nach den unten beschriebenen Prüfungen |
| Einrichtung von Pi und Lastgenerator | Anleitungen, Befehle, Diagnose | Aufbau der Hardware, Ausführung aller Befehle, Rückmeldung der Ausgaben |
| Messbetrieb | Auswertungsbefehle, Analyse der Rohdaten | Durchführung und Überwachung, Weitergabe der Rohdaten |
| Dokumentation | erstellt | Inhalte und Stilregeln vorgegeben, gelesen und korrigiert |
| Literatur | Suche, Prüfung der bibliografischen Angaben | Prüfung des Inhalts im Original, Auswahl |

**Warum die Autorin den Code nicht selbst geschrieben hat.** Eigene Codeänderungen hat die Autorin bewusst kaum vorgenommen. Beobachtungen, Fragen und Änderungswünsche brachte sie über den Chat ein, statt Dateien direkt zu bearbeiten. So ist jede Änderung mit ihrem Anlass festgehalten, die Dokumentation bleibt vollständig, und bei der Breite des Themas geht keine Information verloren. Die zugrunde liegenden Konzepte, etwa ein Prozess pro Verbindung gegenüber einer Event Loop oder Push über SSE, waren ihr aus der Informatik-Ausbildung an der HTL, aus Lehrveranstaltungen des Bachelorstudiums an der FH Oberösterreich und aus dem Semesterprojekt Lokato vertraut.

## Wie die Ergebnisse geprüft wurden

- **Entscheidungen.** Jede Entscheidung steht mit Datum, Begründung und verworfenen Alternativen in DECISIONS.md. Entscheidungen, die von der Autorin zu treffen waren, traf sie erst, wenn sie die Begründung nachvollziehen konnte. Andernfalls fragte sie nach und prüfte die Aussage, soweit möglich, mit eigener Recherche.
- **Statistik.** Tests vergleichen die Verfahren mit von Hand gerechneten Werten (`tools/orchestrate/test/`).
- **Änderungen am Code.** Nach jeder größeren Änderung lief eine lokale Prüfkampagne mit dokumentiertem Ergebnis, etwa in `results/2026-10-27_version-update/` und `results/2026-10-29_orchestrator-check/`.
- **Zielhardware.** Belastungstest, Probeläufe und ein Test der Festplatte unter Last liefen vor Beginn des Pilots auf dem Pi (DECISIONS.md 5.14).
- **Gültigkeitsregeln.** Fehlerhafte Läufe werden automatisch als ungültig markiert, mit dem Grund im Protokoll (DECISIONS.md 5.9). Der erste, vollständig fehlerhafte Probelauf fiel dadurch sofort auf.
- **Quellen.** Bibliografische Angaben sind über Crossref, arXiv und Open Library geprüft. Neue Quellen darf die KI nur vorschlagen, zitiert werden sie erst nach Prüfung im Original (LITERATUR.md).

## Hinterfragt und korrigiert

Beispiele, in denen die Autorin Ergebnisse der KI nicht ungeprüft übernommen hat:

- **Versionen.** Sie fragte nach, ob die dokumentierten Versionen den tatsächlich installierten entsprechen und aktuell sind. Node.js lag zwei Hauptversionen zurück. Daraus entstand eine Versionsregel, die für beide Sprachen gleich gilt (DECISIONS.md 5.26).
- **Zu wenig Arbeitsspeicher.** Eine Begründung, die sich vor allem auf geänderte Hypothesen stützte, wies sie als nicht ausreichend zurück. Sie verlangte außerdem, dass der Verbleib beim vorhandenen Pi nicht der einzige Grund für die Lösung sein darf. Daraus entstand die Bewertung von fünf Möglichkeiten nach methodischen Kriterien (DECISIONS.md 5.10).
- **Umfang.** Sie fragte, ob der Aufbau für einen fairen Vergleich im Rahmen einer Bachelorarbeit zu umfangreich wird. Seitdem gilt, dass alles gemessen wird, die schriftliche Arbeit aber kompakt bleibt. Wie ausführlich jedes Thema behandelt wird, ist vorab festgelegt.
- **Verständnis vor Zustimmung.** Bei Vorschlägen, die sie nicht unmittelbar nachvollziehen konnte, verlangte sie eine verständliche Erklärung, bevor sie zustimmte, etwa beim Vorlauf und beim Neustart vor jedem Ansturm-Lauf.
- **Rohdaten.** Sie gab die vollständigen Ergebnisse vom Lastgenerator zur Prüfung weiter. Daraus ergaben sich drei Korrekturen am Messverfahren vor Beginn des Pilots (Verlauf unten).
- **Statische Prüfung vor der Hauptmessung.** Vor Block 1 ließ sie den Messaufbau mit einer vollständigen Liste von Prüfpunkten zu Fairness, Messung und Statistik gegen DECISIONS.md prüfen, ohne Messung. Den Prüfauftrag hatte sie im Claude-Projekt der schriftlichen Arbeit formuliert. Dabei fielen ein kritischer und zwei mittlere Befunde auf (Verlauf unten).

Fehler der KI, die dabei aufgefallen sind:

- Der ursprüngliche Ablauf berücksichtigte nicht, dass ein statischer FPM-Pool seinen Speicher erst nach und nach belegt. Der Speicher wuchs dadurch von Lauf zu Lauf (DECISIONS.md 5.9).
- Das SSE-Messskript zählte Fehlerseiten als Verbindung. Kein bis dahin gültiger Lauf war davon betroffen (DECISIONS.md 5.9).
- Ein Prüfbefehl korrigierte eine Datei, bevor er sie anzeigte, und erschwerte so die Fehlersuche im ersten Probelauf.
- Einige Befehle enthielten Zeichen, die beim Kopieren verloren gingen. Seitdem sind Befehle ohne diese Zeichen formuliert.
- Beide Queue-Worker veröffentlichten auf demselben Redis-Kanal. In Vergleich 11, in dem beide Queue-Varianten gleichzeitig laufen, hätte jede Variante die Events beider Wege erhalten. Gemessen war dieser Vergleich noch nicht (DECISIONS.md 5.19).
- Die Ereignisquelle ließ BullMQ alle erledigten Jobs in Redis behalten, obwohl Redis mit jeder Variante mitgemessen wird (DECISIONS.md 5.20).
- Nach der Übersetzung der Code-Kommentare meldete die KI, es sei nur noch eine deutsche Zeile übrig. Tatsächlich waren es noch zehn Stellen, weil ihr Suchfilter zu eng war. Aufgefallen ist das bei der statischen Prüfung.
- Der Healthcheck von Redis startete alle 2 s ein Programm im gemessenen Redis-Container. Dessen CPU-Zeit zählte zu Redis und machte rund 85 % der festen Grundlast aus, die im Pilot auffiel. Die zuerst genannte Ursache, die Module von Redis 8, war eine ungeprüfte Vermutung der KI. Erst eine getrennte Messung des Redis-Prozesses und des ganzen Containers zeigte die tatsächliche Ursache (DECISIONS.md 5.18).

## Gelernt und selbst überprüft

Die Grundlagen waren aus der HTL, aus Lehrveranstaltungen an der FH Oberösterreich und aus Lokato bekannt. Neu war vor allem, was der Aufbau eines solchen Messsystems im Einzelnen erfordert. Überprüft hat die Autorin das Gelernte durch Rückfragen, die Dokumentation in diesem Repository, eigene Beobachtungen auf der Hardware und, soweit möglich, eigene Recherche.

| Thema | Was neu war | Überprüft durch |
|---|---|---|
| Ein Prozess pro Verbindung gegenüber einer Event Loop | Speicherverhalten eines statischen FPM-Pools | Beobachtung im Probelauf auf dem Pi |
| SSE und WebSocket | gleichzeitige Wiederverbindung aller Browser nach einem Neustart des Servers | Spezifikation (WHATWG), Ansturm auf dem Pi |
| Speicherlimits, cgroups und OOM-Killer | Limits je Container und je Variante, Verhalten bei Überschreitung | Abstürze und Messwerte auf dem Pi |
| Einrichtung von Linux und Raspberry Pi | Anforderungen an einen unbeaufsichtigten Messbetrieb, etwa Drosselung, Taktsteuerung, Swap, Systemprotokoll, feste Adressen und Statusmeldungen | eigene Einrichtung von Pi und Lastgenerator |
| Docker Compose | Ressourcenlimits je Variante, Pinning per Digest, Betrieb auf zwei Rechnern | eigene Einrichtung, Prüfläufe |
| Messmethodik | Warm-up, Einschwingzeit, alternierende Läufe, Pilot, Replikation | Rückfragen, Literatur (LITERATUR.md) |
| Statistik | Wilcoxon-Test, Cliff's Delta, Holm-Korrektur, Bootstrap | Rückfragen, Literatur |
| Laravel Broadcasting, Reverb und Queues | Weg eines Events durch Listener, Reverb und Worker | Rückfragen, Code der Prototypen |

## Protokoll

Seit 2026-10-19 schreibt ein Hook jeden Prompt im Wortlaut und den Antworttext in eine Markdown-Datei. Claude Code speichert die Verläufe zusätzlich vollständig. Dieses Protokoll liegt außerhalb des Repositorys, weil es persönliche Inhalte enthält, etwa Nachrichten an den Betreuer und einmal eingegebene Zugangsdaten. Dem Betreuer kann es auf Anfrage vorgelegt werden. Für die Zeit davor zeichnen der Änderungsverlauf in DECISIONS.md und die Git-Historie den Ablauf nach. Die wichtigsten Stationen fasst der folgende Verlauf zusammen.

## Verlauf

| Datum | Anlass | Ergebnis |
|---|---|---|
| 2026-07-26 | Exposé als Ausgangspunkt, Überblick über die nötigen Entscheidungen | Repository, Docker Compose als Laufzeitumgebung, Machbarkeit von xk6-sse geprüft (DECISIONS.md 1–4) |
| 2026-08-25 | Wartbarkeit als Thema des Exposés | Debugging- und Monitoring-Vergleich, erste statistische Methodik (5.13, 5.8) |
| 2026-10-16 | Abstimmung mit dem Betreuer | Nginx, HTTP/1.1, Redis, PHP-FPM, gleiches Budget und Raspberry Pi festgelegt |
| 2026-10-16 | zwei Überprüfungen des Messaufbaus | 21 Befunde umgesetzt, darunter Produktionsbetrieb, Einschwingzeit und Redis im Ressourcenvergleich |
| 2026-10-16 | Abgleich mit dem Exposé | Transportvergleiche 12 und 13, Hypothesen H9 bis H11 |
| 2026-10-17 | Prüfung durch das Claude-Projekt der schriftlichen Arbeit | Entscheidungsregeln der Hypothesen, Verbindungsaufbau als eigene Testfamilie |
| 2026-10-17 | Quellen des Exposés | geprüft, zwei Angaben korrigiert, eine verworfen |
| 2026-10-19 | Antwort des Betreuers | Messaufbau, Abweichungen vom Exposé und KI-Nutzung bestätigt, KI-Protokoll eingerichtet |
| 2026-10-22 | Hardware erhalten, Pi mit 4 statt 8 GB | Einrichtung, Budget 1,5 GiB je Variante, Drosselstatus per `vcgencmd` |
| 2026-10-23 | Belastungstest | 24 Stunden Volllast ohne Drosselung |
| 2026-10-27 | Lastgenerator ohne Docker und Administratorrechte | Einrichtung mit dem Betreuer, eigenes Messnetz |
| 2026-10-27 | erster Probelauf vollständig ungültig | Ursache war ein Schrägstrich am Ende der Adresse, der jetzt automatisch entfernt wird |
| 2026-10-27 | Nachfrage der Autorin zu den Versionen | einheitliche Versionsregel, alle gemessenen Komponenten aktualisiert |
| 2026-10-27 | Speicher reicht bei gleichzeitigem Verbindungsaufbau nicht | fünf Möglichkeiten bewertet, verteilter Verbindungsaufbau, Ansturm als eigene Phase |
| 2026-10-27 | Neustart des Pi ohne Protokoll | Systemprotokoll wird dauerhaft gespeichert |
| 2026-10-29 | vollständiger Probelauf und Festplatte unter Last | 59 Messläufe gültig, Test der Festplatte bestanden |
| 2026-10-29 | Prüfung der Rohdaten | Vorlauf vor jeder Kampagne, Neustart vor jedem Ansturm-Lauf, Verbindung nur mit Status 200 |
| 2026-10-29 | Ansturm mit Neustart vor jedem Lauf | acht Varianten in allen Läufen fehlerfrei, beide Laravel-Varianten mit SSE am Speicherlimit (DECISIONS.md 5.14) |
| 2026-10-31 | Pilot abgeschlossen, Bedingung der Autorin war eine nachvollziehbare Begründung | Auswertung mit `tools/orchestrate/pilot.js` nach dem vorab festgelegten Kriterium, 90 Läufe je Laststufe für Block 1 und 2 (DECISIONS.md 5.9) |
| 2026-10-31 | statische Prüfung vor Block 1 nach einem Prüfauftrag der Autorin | eigener Redis-Kanal je Queue-Variante, BullMQ löscht erledigte Jobs, doppelte Events machen Läufe ungültig, Grundlast von Redis bei H8 dokumentiert (DECISIONS.md 5.18 bis 5.20) |
| 2026-10-31 | lokale Prüfung der Korrekturen, Ursache der Grundlast von Redis gesucht statt angenommen | Healthcheck als Ursache gemessen, prüft nur noch beim Start, Regel von H8 unverändert (DECISIONS.md 5.18) |
