# orchestrate

Führt Messkampagnen aus, plant und reiht sie und wertet sie aus (DECISIONS.md 5.6–5.9, 5.15–5.19). Die Werkzeuge laufen direkt mit Node.js auf dem steuernden Rechner, weil sie selbst `docker compose` aufrufen: für die SUT-Seite lokal oder per ssh auf dem Raspberry Pi, für k6 und die Ereignisquellen lokal.

| Datei | Aufgabe |
| --- | --- |
| `run.js` | führt eine Kampagne aus und schreibt Lauf-Protokolle, Ereignisprotokoll und Kampagnenauswertung |
| `plan-campaigns.js` | erzeugt die Kampagnen einer Phase (Pilot, Hauptmessung, Skalierung, Sättigung) aus `plan.json` und `cells.json`, dazu eine `schedule.json` |
| `schedule.js` | arbeitet einen Zeitplan unbeaufsichtigt ab: zufällige Reihenfolge, tägliche Kontrollmessung, Fortsetzen nach Abbruch, optionale Benachrichtigung |
| `status.js` | Statusbericht für den Dauerbetrieb: Fortschritt, ungültige Läufe, Temperatur, Drift der Kontrollmessung, Speicherplatz; optional mit Benachrichtigung |
| `notify.js` | Benachrichtigung per HTTP-POST an `NOTIFY_URL` (z. B. ntfy), von `schedule.js` und `status.js` genutzt |
| `evaluate.js` | Gesamtauswertung der Hauptkampagnen: Holm-Korrektur je Messgröße (Block 1), Replikationsabgleich (Block 2), Hypothesen |
| `series.js` | beschreibende Auswertung von Skalierungsreihe und Sättigungstest über alle Zellen, SSE und WebSocket je Variante nebeneinander |
| `stats.js` | Statistikfunktionen (deskriptiv, Wilcoxon, Cliff's Delta, rangbiseriale Korrelation, Bootstrap, Holm) |
| `pairing.js` | Paarbildung über die Laufnummer |
| `cells.json` | die zehn Messzellen: Container, Front-Nginx (Modus, Ziel), Ereignisquelle, k6-Skript, Messgröße |
| `plan.json` | vorab festgelegter Auswerteplan: Vergleiche, Laststufen, Testfamilien, Hypothesen |
| `campaign*.example.json` | Vorlagen für Haupt-, Pi- und Sättigungskampagnen |
| `test/` | Tests der Statistik und Paarbildung |

## Verwendung

```bash
# Phase planen
node tools/orchestrate/plan-campaigns.js pilot --runs baseline=100,medium=60,stress=40 --comparisons 1,4,7,10 --out campaigns/pilot
node tools/orchestrate/plan-campaigns.js main --block 1 --runs baseline=80,medium=60,stress=40 --out campaigns/block1
node tools/orchestrate/plan-campaigns.js scaling --steps 10,50,100,250,500,750,1000 --runs 3 --out campaigns/scaling
node tools/orchestrate/plan-campaigns.js saturation --clients 50 --rates 10,50,100,200,500 --runs 6 --out campaigns/saturation

# Probelauf mit eigenem Namensraum (siehe unten)
node tools/orchestrate/plan-campaigns.js main --block 1 --runs baseline=3,medium=3,stress=3 --hold 10 --warmup 1 --comparisons 1 --prefix smoke- --out campaigns/smoke

# Zeitplan abarbeiten (erneuter Aufruf setzt nach einem Abbruch fort)
node tools/orchestrate/schedule.js campaigns/block1/schedule.json

# Statusbericht während des Dauerbetriebs
node tools/orchestrate/status.js --schedule campaigns/block1/schedule.json --sut sut.pi.json

# einzelne Kampagne
node tools/orchestrate/run.js <kampagne.json>

# Gesamtauswertung der Hauptmessung
node tools/orchestrate/evaluate.js results/<kampagne-1> results/<kampagne-2> ...

# Skalierung und Sättigung über alle Zellen
node tools/orchestrate/series.js results/<kampagne-1> results/<kampagne-2> ...

# Tests
node --test "tools/orchestrate/test/*.test.js"
```

Optionen von `plan-campaigns.js`:

| Option | Phasen | Bedeutung |
| --- | --- | --- |
| `--runs` | alle | Wiederholungen je Konfiguration ohne Warm-up; bei `pilot` und `main` je Laststufe (`baseline=…,medium=…,stress=…`) |
| `--block` | `main` | 1 = konfirmatorisch, 2 = Replikation |
| `--comparisons` | `pilot`, `main` | Auswahl der Vergleiche aus `plan.json` (Standard: alle dreizehn) |
| `--control` | `pilot`, `main` | Zelle der täglichen Kontrollmessung (Standard `node-minimal-sse`) |
| `--report-every` | `pilot` | Zwischenauswertung alle n Läufe (Standard 10) |
| `--cells` | `scaling`, `saturation` | Auswahl der Zellen (Standard: alle zehn) |
| `--steps`, `--clients`, `--rates` | `scaling`, `saturation` | Clientzahlen bzw. feste Clientzahl und Event-Raten |
| `--prefix` | alle | Präfix aller Kampagnennamen, z. B. `smoke-` |
| `--hold`, `--settle`, `--warmup` | alle | Haltezeit (Standard 60 s), Einschwingzeit (Standard 10 s), Warm-up-Läufe (Standard 5 bei `pilot` und `main`, sonst 1) |
| `--sut` | alle | Datei mit dem sut-Block für den Zwei-Rechner-Aufbau (siehe unten) |
| `--seed` | alle | Startwert der zufälligen Reihenfolge in `schedule.js` (Standard 20261016) |

Jede erzeugte Kampagne umfasst genau einen Vergleich und eine Laststufe (bei `scaling` und `saturation` eine Zelle mit allen Stufen). Bei einem Abbruch geht dadurch höchstens eine Laststufe verloren.

**Namensraum von Probeläufen:** `schedule.js` erkennt erledigte Kampagnen am Namen. Ein Probelauf mit denselben Namen wie die echte Phase (z. B. `b1-c01-baseline`) würde diese beim späteren Start als erledigt überspringen lassen. Probeläufe erhalten deshalb ein Präfix (`--prefix smoke-`). Dasselbe gilt für die Kontrollmessung, die als `smoke-control-<zelle>` angelegt wird.

## Überwachung und Benachrichtigung

`status.js` fasst den Zustand des Dauerbetriebs zusammen und endet mit Exit-Code 1, sobald eine Warnung vorliegt:

| Prüfung | Warnung bei |
| --- | --- |
| Fortschritt des Zeitplans (`--schedule`) | mehr als 20 min ohne Aktivität, obwohl Kampagnen offen sind |
| ungültige Läufe im Zeitfenster (`--hours`, Standard 24) | Anteil über 5 % in Pilot-, Haupt- und Kontrollkampagnen; jede Drosselung |
| Temperatur des Testservers (aus den Lauf-Protokollen) | über 75 °C |
| Auslastung des Lastgenerators (Zwei-Rechner-Aufbau) | im Mittel eines Laufs über 80 % |
| Kontrollmessung | Median der Latenz weicht um mehr als 20 % vom ersten Wert ab |
| Speicherplatz des Ergebnisverzeichnisses | weniger als 10 % frei |
| Testserver direkt per ssh (`--sut`) | nicht erreichbar, aktuell gedrosselt, über 75 °C, Docker-Datenträger unter 10 % frei |

Ist `NOTIFY_URL` gesetzt, sendet `schedule.js` eine Nachricht bei jeder abgebrochenen Kampagne oder Kontrollmessung und am Ende des Zeitplans; `status.js --notify` sendet die Warnungen. Gesendet wird ein HTTP-POST mit reinem Text und dem Titel im Header `Title`, passend zum Dienst ntfy (App für Android und iOS, dort das Thema abonnieren).

`NOTIFY_URL` wird in der `.env` des Rechners eingetragen, auf dem `schedule.js` und `status.js` laufen (Vorlage in `.env.example`). Eine gleichnamige Umgebungsvariable hat Vorrang. Damit gilt der Wert auch für cron-Jobs und systemd-Dienste.

```bash
NOTIFY_URL=https://ntfy.sh/<thema>
```

Ein öffentliches ntfy-Thema kann jeder mitlesen, der den Namen kennt. Die Nachrichten enthalten daher nur Kampagnennamen, Zähler und Statusmeldungen, keine Messwerte, Adressen oder Schlüssel. Ein Fehler beim Senden wird gemeldet, unterbricht die Messung aber nicht. Testnachricht:

```bash
node --input-type=module -e "import { notify } from './tools/orchestrate/notify.js'; console.log(await notify('EDA: Testnachricht', 'Benachrichtigung eingerichtet.'))"
```

Stündliche Prüfung per cron auf dem Lastgenerator (`crontab -e`):

```cron
0 * * * * cd /pfad/zum/repo && node tools/orchestrate/status.js --schedule campaigns/block1/schedule.json --sut sut.pi.json --notify >> "$HOME/eda-status.log" 2>&1
```

Das Protokoll liegt bewusst außerhalb von `results/`, damit es nicht versehentlich in das Repository gelangt.

## Phasen

| Phase | Zweck | Konfigurationen | Auswertung |
| --- | --- | --- | --- |
| `pilot` | Wiederholungszahl bestimmen; `reportEvery` setzen | ≥ 2 | Zwischenstände (Median-Differenz, Konfidenzintervall, Cliff's Delta); nicht konfirmatorisch |
| `main` | Hauptmessung mit fester Wiederholungszahl; `block: 1` konfirmatorisch, `block: 2` Replikation | ≥ 2 | Vergleiche mit unkorrigierten p-Werten; Holm und Replikationsabgleich in `evaluate.js` |
| `control` | tägliche Kontrollmessung einer festen Zelle zur Erkennung von Drift | ≥ 1 | beschreibend |
| `scaling` | Clientzahl stufenweise steigern | ≥ 1 | beschreibend, inklusive erster Clientzahl mit weniger als 99 % bedienten Clients |
| `saturation` | Event-Rate stufenweise steigern bei fester Clientzahl | ≥ 1 | beschreibend, inklusive höchster nachhaltiger Rate |

In `pilot`, `main` und `control` müssen alle Zellen im Produktionsbetrieb laufen und alle Clients bis zum Ende der Einschwingzeit verbunden sein. In `scaling` und `saturation` sind ausgefallene Läufe Messergebnisse und kein Abbruchgrund. Zwischenauswertungen der Hauptmessung dienen nur der Kontrolle, nicht als Abbruchkriterium (DECISIONS.md 5.9).

## Kampagnenformat

```json
{
  "name": "b1-c04-baseline",
  "phase": "main",
  "block": 1,
  "configs": ["node-express-ws", "php-laravel-ws"],
  "scenarios": [
    { "name": "baseline", "vus": 10, "holdSeconds": 60, "runsPerConfig": 85, "eventRatePerSecond": 1 }
  ],
  "warmupRuns": 5,
  "settleSeconds": 10
}
```

| Feld | Standard | Bedeutung |
| --- | --- | --- |
| `name` | `kampagne` | Name, Teil des Ergebnisverzeichnisses; `schedule.js` erkennt erledigte Kampagnen daran |
| `phase` | `main` | siehe Phasen |
| `block` | 1 (nur `main`) | 1 = konfirmatorisch, 2 = Replikation |
| `configs` | — | Zellen aus `cells.json`; als Text oder als Objekt `{ "cell", "name", "script", "metric", "env" }` |
| `comparisons` | alle Paare | Konfigurationspaare, die verglichen werden (nur `pilot`, `main`) |
| `scenarios` | — | Laststufen mit `name`, `vus`, `holdSeconds`, `runsPerConfig` (einschließlich Warm-up), optional `eventRatePerSecond` (Standard 1) |
| `script`, `metric` | aus `cells.json` | kampagnenweite Überschreibung; Vorrang: Konfiguration > Kampagne > Zelle |
| `warmupRuns` | 5 | Läufe pro Konfiguration, die nicht ausgewertet werden |
| `settleSeconds` | 10 | Einschwingzeit je Lauf; Events davor werden nicht gewertet |
| `pauseMinMs`, `pauseMaxMs` | 100, 500 | zufällige Pause zwischen den Läufen |
| `reportEvery` | 0 | Zwischenauswertung alle N Laufnummern (0 = aus) |
| `maxFailureRate` | 0,05 (`scaling`, `saturation`: 1) | Anteil ungültiger Läufe pro Konfiguration, ab dem die Kampagne abbricht |
| `minPairs` | 20 | unter dieser Zahl verwertbarer Paare gilt ein Vergleich als nicht aussagekräftig |
| `requireProduction`, `requireAllConnected` | `true` in `pilot`, `main`, `control` | Produktionsbetrieb bzw. vollständiger Verbindungsaufbau als Bedingung |
| `bootstrap.seed`, `bootstrap.resamples` | 20261016, 10000 | Startwert und Zahl der Resamples des Bootstraps |
| `resourceSampleIntervalMs` | 250 | Abtastintervall der Speichermessung |
| `saturation.minDeliveryRatio`, `saturation.maxP95LatencyMs` | 0,99, 1000 | Kriterium der höchsten nachhaltigen Rate |
| `scaling.minServedRatio` | 0,99 | Kriterium der Skalierungsgrenze |
| `sut` | lokal | Zwei-Rechner-Aufbau: `ssh`, `repoDir`, `pi`, `targetBaseUrl`, `redisHost` (`infra/pi/README.md`) |

Zusätzliche Umgebungsvariablen einer Zelle können aus einer Datei gelesen werden (`envFromFile` in `cells.json`); für php-laravel/WS ist das der Reverb-App-Key aus `prototypes/php-laravel/.env`. Eine gleichnamige Umgebungsvariable des steuernden Prozesses hat Vorrang. Protokolliert werden nur die Namen dieser Variablen, nie ihre Werte.

## Ablauf einer Kampagne

1. **Vorbereitung:**
   - Code-Stand prüfen (im Zwei-Rechner-Aufbau müssen beide Seiten denselben Commit haben).
   - k6-Erweiterung prüfen.
   - Alle Dienste außerhalb der Kampagne stoppen; Redis, `resource-sampler` und die Container der Zellen starten; Front-Nginx im Modus der ersten Zelle starten.
   - Host prüfen: cgroup v2 mit memory-Controller ist Pflicht. Governor, Swap und Drosselung sind lokal Hinweise, auf dem Pi (`sut.pi`) Abbruchgründe.
   - Betriebsmodus jedes Containers prüfen (`NODE_ENV`, `APP_ENV`, `APP_DEBUG`, geladene `php.ini`).
2. **Je Laststufe:**
   - Die Ereignisquellen starten, die die Zellen brauchen (Event-Simulator, BullMQ-Quelle, Laravel-Quelle), mit der Rate der Stufe.
   - Läufe alternierend A, B, A, B ausführen. Je Lauf:
     - Front-Nginx auf die Zelle umschalten (Modus `http` oder `fastcgi`) und ihre Erreichbarkeit prüfen;
     - k6-Erweiterung prüfen;
     - Ressourcenmessung von Zelle und Redis sowie die Auslastungsmessung des Lastgenerators starten, k6 ausführen, Messungen beenden;
     - Container-Status prüfen (Absturz, OOM);
     - Lauf-Protokoll schreiben.
3. **Gültigkeit:** Ein Lauf ist ungültig bei k6-Fehler, fehlender k6-Zusammenfassung, ohne empfangene Events, bei abgestürztem oder per OOM beendetem Container, fehlgeschlagener Ressourcenmessung, Drosselung des Pi, in strengen Phasen zusätzlich bei nicht vollständig verbundenen Clients und (Zwei-Rechner-Aufbau) bei einer mittleren Auslastung des Lastgenerators über 80 %. Überschreitet der Anteil ungültiger Läufe `maxFailureRate`, bricht die Kampagne ab.
4. **Abschluss:** Ereignisquellen stoppen, `aggregate.json` schreiben. Bei Abbruch (auch per Strg-C) wird die angefangene Laststufe als `incomplete` gekennzeichnet; `evaluate.js` berücksichtigt sie nicht, `schedule.js` wiederholt die Kampagne beim nächsten Start.

## Ergebnisse

`results/<zeitstempel>_<name>/`:

| Datei | Inhalt |
| --- | --- |
| `campaign.json` | verwendete Kampagnendefinition |
| `campaign.log.jsonl` | Ereignisprotokoll, eine JSON-Zeile pro Ereignis |
| `runs/<laststufe>_<konfiguration>_runNNNN.json` | Lauf-Protokoll: Messwerte (`measures`), Ressourcen von Zelle, Redis und Gesamt sowie je Container, Auslastung des Lastgenerators, Container-Status, Kontext (Git-Stand, Versionen, Host, Limits, Images, Betriebsmodus), vollständige k6-Zusammenfassung |
| `aggregate.json` | deskriptive Kennzahlen je Konfiguration und Laststufe, Vergleiche je Messgröße mit Paaren, Zwischenstände, ggf. Skalierung oder Sättigung |

Die Messgrößen eines Laufs (`measures`) beschreibt DECISIONS.md 5.16. Statistisch verglichen werden `latency_mean_ms`, `cpu_seconds_total`, `working_set_peak_bytes_total` (Zelle und Redis zusammen) und `connect_mean_ms`, je Messgröße eine Testfamilie mit 39 Tests. Für jeden Vergleich enthält `aggregate.json`:

- die Paare mit Laufnummern sowie die verworfenen Laufnummern,
- den Wilcoxon-Test (W, W⁺, W⁻, p, Verfahren),
- Cliff's Delta mit Einordnung und die rangbiseriale Korrelation,
- die Median-Differenz mit 95-%-Konfidenzintervall,
- Startwert und Zahl der Resamples des Bootstraps.

`schedule.js` schreibt ein Protokoll je Zeitplan (`results/<zeitstempel>_schedule_<name>.jsonl`). `evaluate.js` schreibt `results/<zeitstempel>_evaluation/evaluation.json` und `evaluation.md` (Tabellen je Familie mit Holm-adjustierten p-Werten, Replikationsabgleich, Hypothesen; Dezimalpunkt, da die Arbeit auf Englisch verfasst wird). Pilot-, Kontroll-, Skalierungs- und Sättigungskampagnen sowie abgebrochene Kampagnen werden mit Hinweis übersprungen; `--include-aborted` bezieht Letztere ein. Ist ein geplanter Vergleich im selben Block mehrfach gemessen, bricht die Auswertung ab, damit eindeutig festgelegt wird, welche Kampagne zählt.

`series.js` schreibt `results/<zeitstempel>_series/series.json` und `series.md`: je Zelle die Stufen der Skalierungsreihe (bediente Clients, Verbindungsaufbau, Latenz, CPU, Working Set) und des Sättigungstests (Zustellung, p95-Latenz, CPU), die Kapazitätsgrenze und die höchste nachhaltige Rate sowie SSE und WebSocket je Sprache und Variante nebeneinander (Hypothesen H4 und H11). Die Auswertung ist beschreibend, da jede Zelle in einer eigenen Kampagne gemessen wird. Ist eine Zelle in mehreren vollständigen Kampagnen derselben Phase enthalten, bricht sie ab, damit festgelegt wird, welche zählt.

## Statistik

Verfahren und Begründung: DECISIONS.md 5.8. Kurzfassung:

- **Analyseeinheit:** der Lauf. Testgröße ist der Mittelwert der Latenz pro Lauf im Messfenster.
- **Paare:** gleiche Laufnummer; nur Paare, in denen beide Läufe gültig sind.
- **Test:** Wilcoxon-Vorzeichen-Rang-Test, zweiseitig. Exakt bis 50 Paare ohne Bindungen, sonst Normalapproximation mit Stetigkeits- und Bindungskorrektur.
- **Effektmaße:** Cliff's Delta mit Einordnung nach Romano et al. (2006), zusätzlich die rangbiseriale Korrelation für gepaarte Daten.
- **Konfidenzintervall:** 95-%-Bootstrap-Intervall (Perzentil-Methode) für den Median der gepaarten Differenzen, mit festem Startwert.
- **Mehrfachtests:** Holm-Korrektur je Messgröße über alle 39 geplanten Tests in `evaluate.js` (Block 1); Block 2 wird beschreibend abgeglichen.

Vorzeichenkonvention: Differenzen und Effektmaße beziehen sich auf A − B in der Reihenfolge des Vergleichs. Negative Werte bedeuten, dass A kleinere Werte hat (bei Latenz, CPU und Speicher: besser).
