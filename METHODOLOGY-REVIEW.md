# Methodische Prüfung der Entscheidungen, 2026-08 (historisch)

> **Historisches Dokument.** Stand August 2026, vor der Abstimmung mit dem Betreuer am 2026-10-16. Die Befunde sind inhaltlich unverändert wiedergegeben. Ihren heutigen Stand zeigt die folgende Tabelle; maßgeblich ist [DECISIONS.md](DECISIONS.md).

## Verbleib der Befunde (Stand 2026-10-16)

| Befund | Bewertung damals | Stand | Fundstelle |
|---|---|---|---|
| Docker als symmetrischer Einflussfaktor | Einschränkung | als Limitation der externen Validität zu nennen | LITERATUR.md (Felter et al. 2015) |
| xk6-sse nur bis 200 Verbindungen geprüft | Einschränkung | lokal mit 500 SSE-Clients geprüft; auf dem Pi ausstehend | `results/2026-10-16_verification/` |
| 5.1 Apache-Ausführungsmodell nicht festgelegt | Lücke | entfällt: kein Apache-Messaufbau | DECISIONS.md 5.1, 5.11 |
| 5.2 keine Infrastruktur für HTTP/2 | Lücke | entfällt: kein HTTP/2-Messlauf | 5.2, 5.12 |
| 5.3 keine Bewertungsskala | Lücke | operationalisiert und durchgeführt | 5.13 |
| 5.4 gemeinsame Uhr bei getrennten Rechnern | Lücke | gelöst: Sende- und Empfangszeitstempel vom selben Gerät | 5.14 |
| 5.5 Geltungsbereich „PHP-FPM" statt „PHP" | Einschränkung | weiterhin gültig, in der Arbeit zu formulieren | 5.5 |
| 5.6 Ressourcenlimits nicht im Code | Lücke | umgesetzt als Budget pro Zelle | 5.6.2, 5.10 |
| 5.7 inaktiver Queue-Code in den Framework-Varianten | Einschränkung | weiterhin gültig, Fußnote zur Speichermessung | 5.7 |
| Statistische Methodik fehlt | Lücke | festgelegt: Wilcoxon, Cliff's Delta, Bootstrap, Holm, Versuchsplan | 5.8, 5.9, 5.15 |

---

Methodische Prüfung der Entscheidungen in DECISIONS.md: Sind sie aus Sicht der empirischen Softwaretechnik begründet, und was bedeuten sie für die Validität der Ergebnisse? REVIEW.md prüft Umsetzungsrisiken, dieses Dokument die wissenschaftliche Aussagekraft.

Rahmen sind die vier Validitätsarten der empirischen Softwaretechnik (Wohlin et al., *Experimentation in Software Engineering*):

- **Konstruktvalidität:** Wird gemessen, was gemessen werden soll (z. B. „PHP" oder „Zustell-Latenz")?
- **Interne Validität:** Gibt es Störvariablen, die einen beobachteten Effekt statt der unabhängigen Variable (Sprache, Framework, Transportart) erklären?
- **Externe Validität:** Wie weit lassen sich die Ergebnisse über den konkreten Aufbau hinaus verallgemeinern?
- **Statistische Schlussfolgerungsvalidität:** Ist die Auswertung (Stichprobengröße, Aggregation, Signifikanz) tragfähig?

Bewertungsstufen:

- **[solide]** methodisch tragfähig; ggf. im Methodik-Kapitel erwähnen.
- **[Einschränkung]** im Methodik- oder Diskussionskapitel als Limitation zu nennen; kein Hindernis.
- **[Lücke]** vor der Hauptmessung zu schließen.

## 1–4: Repository, Docker, xk6-sse, Portabilität

Keine primär methodischen Entscheidungen; zwei Punkte sind dennoch relevant für die Validität.

**[solide] Docker auch lokal.** Stärkt interne Validität und Reproduzierbarkeit durch eine identische Umgebung für alle acht Zellen. Docker bringt Virtualisierungs-Overhead mit sich. Dieser betrifft PHP und Node.js gleichermaßen und verzerrt den Vergleich daher nicht, schränkt aber die externe Validität absoluter Zahlen ein: Die Ergebnisse gelten für PHP und Node.js unter Docker, nicht ohne Weiteres für Bare-Metal-Betrieb. DECISIONS.md trennt lokale Plausibilitätsprüfungen und Ergebnisse der Zielumgebung; in der Arbeit ist die Einschränkung explizit als Limitation der externen Validität zu benennen.

**[solide] Machbarkeitsprüfung von xk6-sse vor der Festlegung.** Eine riskante methodische Annahme wurde empirisch geprüft, bevor darauf aufgebaut wurde. **[Einschränkung]** Geprüft wurde bis 200 gleichzeitige Verbindungen, Ziel sind 500; die Verlässlichkeit bei Ziellast ist eine Extrapolation. Ein Test mit Zielparametern ist vorgesehen, aber noch nicht durchgeführt.

## 5.1 Nginx als Standard, Apache nur als Teilvergleich für PHP

**[Einschränkung] externe Validität.** Apache wird nur für PHP getestet, nie für Node.js. Ein Interaktionseffekt zwischen Webserver und Sprache lässt sich damit nicht ausschließen: Stünde PHP unter Apache relativ zu Node.js günstiger da als unter Nginx, bliebe das unsichtbar. Für eine Bachelorarbeit ist diese Eingrenzung vertretbar, sollte aber im Abschnitt zu den Limitationen ausdrücklich genannt werden.

**[Lücke]** Das PHP-Ausführungsmodell unter Apache ist nicht festgelegt (`mod_php` oder Apache als Proxy vor PHP-FPM analog zu Nginx). Ohne Festlegung ist unklar, was mit „Apache" verglichen wird (Konstruktvalidität). Weder Festlegung noch Infrastruktur existieren.

## 5.2 HTTP/1.1 als Standard, HTTP/2 nur als Sensitivitätsprüfung

**[solide]** Nachvollziehbar begründet (Werkzeuggrenzen von k6/xk6-sse, Vergleichbarkeit mit dem WS-Upgrade). **[Lücke]** Für die HTTP/2-Prüfung existiert keine Infrastruktur (kein HTTP/2-fähiger Nginx-Zweig, kein k6-Skript), nur eine Absicht.

## 5.3 Debugging- und Monitoring-Vergleich anhand dreier Kriterien

**[Einschränkung]** Es handelt sich um einen qualitativen Vergleich, kein Lasttest-Ergebnis. Im Methodik-Kapitel ist er von den quantitativen Latenz- und Ressourcenmessungen abzugrenzen, damit sich Ergebnisse unterschiedlicher Evidenzstärke nicht vermischen.

**[Lücke] Konstruktvalidität.** Für keines der drei Kriterien existiert eine operationalisierte Bewertungsskala. Insbesondere Kriterium 2 (Nachvollziehbarkeit eines Events über Queue-Grenzen per Correlation-ID) braucht ein festes Vorgehen, etwa eine Checkliste: Sind Correlation-IDs standardmäßig im Log? Müssen sie manuell verdrahtet werden? Wie viele Codezeilen erfordert die Instrumentierung? Andernfalls ist das Ergebnis nicht reproduzierbar und wirkt anekdotisch.

## 5.4 Redis Pub/Sub, Semantik des Zeitstempels

**[solide]** Methodisch der stärkste Teil von DECISIONS.md: eine eindeutige Definition der abhängigen Variable (Latenz = Empfangszeit − Publish-Zeitstempel, gesetzt an fester Stelle) sichert die Konstruktvalidität der Latenzmessung. Die Regel „eine Subscription pro Prozess" verhindert zusätzlich einen Redis-Engpass als Störvariable.

**[Lücke]** Die Methode setzt voraus, dass Event-Generator und Messpunkt dieselbe Uhr teilen (derzeit: dieselbe Docker-Umgebung). Läuft k6 auf der Zielumgebung auf einem anderen Rechner als die SUT-Container, wird die Uhrensynchronisation zur Bedrohung der internen Validität: Auch per NTP synchronisierte Uhren weichen um wenige Millisekunden ab, und die Arbeit misst teils im einstelligen Millisekundenbereich. Die Frage ist an die offene Platzierung des Lastgenerators gekoppelt und mit ihr gemeinsam zu klären.

## 5.5 PHP-Laufzeitmodell (FPM und Reverb)

**[solide]** Inzwischen empirisch untermauert (README, PHP-FPM-Dimensionierung); die Kapazitätsaussage beruht nun auf einer Messung statt auf einer Schätzung.

**[Einschränkung] Geltungsbereich.** „PHP" bedeutet in dieser Arbeit PHP-FPM im synchronen Worker-Modell, nicht PHP allgemein; asynchrones PHP (Octane/Swoole) ist ausgeschlossen. Das sollte in der Arbeit als Einschränkung der Schlussfolgerungen deutlich formuliert werden: „Node.js ist schneller als PHP-FPM" ist eine engere Aussage als „Node.js ist schneller als PHP".

## 5.6 Fairness-Regeln

**[solide]** Einheitlicher Front-Proxy und „nur eine SUT läuft gleichzeitig" sind die richtigen Kontrollen gegen Infrastruktur- und Ressourcenkonkurrenz als Störvariablen.

**[Lücke] Abweichung zwischen Entscheidung und Code.** Identische Ressourcenlimits sind entschieden, in `docker-compose.yml` aber nicht umgesetzt; kein Prototyp-Container hat ein CPU- oder Speicherlimit. Bis dahin könnte ein gemessener Unterschied daher rühren, dass sich ein Stack mehr Ressourcen nimmt, nicht dass er sie effizienter nutzt; ein direkter Störfaktor für die interne Validität.

## 5.7 Messumfang: Minimal- und Framework-Variante

**[solide]** Die Minimalvariante isoliert als Baseline den Framework-Overhead als eigenen, interpretierbaren Faktor, vergleichbar einer Kontrollgruppe.

**[Einschränkung] Konstruktvalidität.** `node-express` und `php-laravel` enthalten zusätzlich ungenutzten Queue-Code (BullMQ bzw. Laravel Queue). Er wird im SSE/WS-Pfad nicht ausgeführt, trägt aber zu Speicher und Startaufwand bei. Der gemessene Framework-Overhead umfasst damit genau genommen auch die vorhandene, inaktive Queue-Fähigkeit; für die Latenz vernachlässigbar, für die Speichermessung eine Fußnote wert.

## Statistische Methodik

**[Lücke] Die größte offene methodische Lücke.** `tools/orchestrate` berechnet nur deskriptive Kennzahlen (Median, p99, Maximum) pro Konfiguration. Für die Kernaussage (ist X schneller als Y) fehlen:

1. **Ein Signifikanztest.** Latenzverteilungen sind rechtsschief (lange Tails durch Garbage Collection und Scheduling), ein t-Test ist unpassend. Für zwei unabhängige Stichproben ohne Normalverteilungsannahme eignet sich z. B. der Mann-Whitney-U-Test.
2. **Eine Effektstärke** (z. B. Cliff's Delta, üblich bei schiefen Latenzdaten), die einordnet, wie groß ein Unterschied praktisch ist.
3. **Konfidenzintervalle** für die berichteten Kennzahlen.
4. **Eine Begründung der Stichprobengröße** (100–1000 Läufe), etwa durch eine Poweranalyse.
5. **Ein schriftlicher Versuchsplan:** Welche der acht Zellen werden in welchen Kampagnen paarweise verglichen?

Die Rohdaten pro Lauf liegen vor; es fehlt der Auswertungsschritt. Empfehlung: Test und Effektstärke vor der Hauptkampagne festlegen und `tools/orchestrate` oder ein separates Auswertungsskript entsprechend ergänzen.

## Gesamteinschätzung

Die Entscheidungen sind für eine Bachelorarbeit überdurchschnittlich sorgfältig; insbesondere 5.4 (Zeitstempel) und 5.6 (Fairness) zeigen Bewusstsein für Störvariablen, und die Machbarkeitsprüfung belegt ein hypothesengeleitetes Vorgehen. Die Schwächen liegen nicht in falschen Entscheidungen, sondern in unvollständig umgesetzten oder nicht spezifizierten Teilen: fehlende Ressourcenlimits im Code (5.6), fehlende Infrastruktur für zwei Sensitivitätsprüfungen (Apache, HTTP/2), keine Bewertungsskala für den qualitativen Vergleich (5.3) und vor allem keine festgelegte Methodik für Signifikanz und Effektstärke. Letztere hat Priorität: Ohne sie entsteht eine Menge sauber gemessener Zahlen, aber keine abgesicherte Aussage darüber, ob ein beobachteter Unterschied real oder Zufallsrauschen ist.
