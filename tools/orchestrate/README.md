# orchestrate

Führt Messkampagnen aus und wertet sie aus (DECISIONS.md 5.6–5.9, 5.15–5.17). Das Werkzeug läuft direkt mit Node.js auf dem steuernden Rechner, weil es selbst `docker compose` aufruft: für die SUT-Seite lokal oder per ssh auf dem Raspberry Pi, für k6 und den Event-Simulator lokal.

| Datei | Aufgabe |
| --- | --- |
| `run.js` | führt eine Kampagne aus und schreibt Lauf-Protokolle, Ereignisprotokoll und Kampagnenauswertung |
| `evaluate.js` | Gesamtauswertung über alle Hauptkampagnen mit Holm-Korrektur je Messgröße |
| `stats.js` | Statistikfunktionen (deskriptiv, Wilcoxon, Cliff's Delta, rangbiseriale Korrelation, Bootstrap, Holm) |
| `pairing.js` | Paarbildung über die Laufnummer |
| `cells.json` | die acht Messzellen: Container, Ziel des Front-Nginx, k6-Skript, Messgröße |
| `plan.json` | vorab festgelegter Auswerteplan: Vergleiche, Laststufen, Testfamilien |
| `campaign*.example.json` | Vorlagen für Haupt-, Pi- und Sättigungskampagnen |
| `test/` | Tests der Statistik und Paarbildung |

## Verwendung

```bash
node tools/orchestrate/run.js <kampagne.json>
node tools/orchestrate/evaluate.js results/<kampagne-1> results/<kampagne-2> ...
node --test "tools/orchestrate/test/*.test.js"
```

## Kampagnenformat

```json
{
  "name": "c04-node-express-ws-vs-php-laravel-ws",
  "phase": "main",
  "configs": ["node-express-ws", "php-laravel-ws"],
  "scenarios": [
    { "name": "baseline", "vus": 10, "holdSeconds": 60, "runsPerConfig": 100, "eventRatePerSecond": 1 }
  ],
  "warmupRuns": 5
}
```

| Feld | Standard | Bedeutung |
| --- | --- | --- |
| `name` | `kampagne` | Name, Teil des Ergebnisverzeichnisses |
| `phase` | `main` | `pilot`, `main` oder `saturation` (siehe unten) |
| `configs` | — | mindestens zwei Zellen aus `cells.json`; als Text (`"php-laravel-ws"`) oder als Objekt `{ "cell", "name", "script", "metric", "env" }`, um Skript, Messgröße oder Umgebungsvariablen für diese Konfiguration zu überschreiben |
| `comparisons` | alle Paare | Konfigurationspaare, die statistisch verglichen werden |
| `scenarios` | — | Laststufen mit `name`, `vus`, `holdSeconds`, `runsPerConfig`, optional `eventRatePerSecond` (Standard 1) |
| `script`, `metric` | aus `cells.json` | kampagnenweite Überschreibung; Vorrang: Konfiguration > Kampagne > Zelle |
| `warmupRuns` | 5 | Läufe pro Konfiguration und Laststufe, die nicht ausgewertet werden |
| `pauseMinMs`, `pauseMaxMs` | 100, 500 | zufällige Pause zwischen den Läufen |
| `reportEvery` | 0 | Zwischenauswertung alle N Laufnummern (0 = aus) |
| `maxFailureRate` | 0,05 | Anteil ungültiger Läufe pro Konfiguration, ab dem die Kampagne abbricht (mindestens ein Fehlschlag ist immer erlaubt) |
| `minPairs` | 10 | unter dieser Zahl verwertbarer Paare gilt ein Vergleich als nicht aussagekräftig |
| `bootstrap.seed`, `bootstrap.resamples` | 20261016, 10000 | Startwert und Zahl der Resamples des Bootstraps |
| `resourceSampleIntervalMs` | 250 | Abtastintervall der Speichermessung |
| `saturation.minDeliveryRatio`, `saturation.maxP95LatencyMs` | 0,99, 1000 | Kriterium der höchsten nachhaltigen Rate |
| `sut` | lokal | Zwei-Rechner-Aufbau: `ssh`, `repoDir`, `pi`, `targetBaseUrl`, `redisHost` (`infra/pi/README.md`) |

Zusätzliche Umgebungsvariablen einer Zelle können aus einer Datei gelesen werden (`envFromFile` in `cells.json`); für php-laravel/WS ist das der Reverb-App-Key aus `prototypes/php-laravel/.env`. Eine gleichnamige Umgebungsvariable des steuernden Prozesses hat Vorrang. Protokolliert werden nur die Namen dieser Variablen, nie ihre Werte.

## Phasen

| Phase | Zweck | Auswertung |
| --- | --- | --- |
| `pilot` | Wiederholungszahl bestimmen; `reportEvery` setzen | Zwischenstände (Median-Differenz, Konfidenzintervall, Cliff's Delta) im Log und in `aggregate.json`; nicht Teil der konfirmatorischen Auswertung |
| `main` | Hauptkampagne mit fester Wiederholungszahl, eine pro geplantem Vergleich (`plan.json`) | Vergleiche je Kampagne mit unkorrigierten p-Werten; Holm-Korrektur in `evaluate.js` |
| `saturation` | höchste nachhaltige Event-Rate: gleiche Clientzahl, steigende `eventRatePerSecond` | nur beschreibend, inklusive höchster nachhaltiger Rate je Konfiguration |

Zwischenauswertungen der Hauptkampagnen dienen nur der Kontrolle, nicht als Abbruchkriterium (DECISIONS.md 5.9).

## Ablauf einer Kampagne

1. **Vorbereitung:**
   - Code-Stand prüfen (im Zwei-Rechner-Aufbau müssen beide Seiten denselben Commit haben).
   - k6-Erweiterung prüfen.
   - Alle Dienste außerhalb der Kampagne stoppen; Redis, `resource-sampler`, die Container der Zellen und den Front-Nginx starten.
   - Host prüfen: cgroup v2 mit memory-Controller ist Pflicht. Governor, Swap und Drosselung sind lokal Hinweise, auf dem Pi (`sut.pi`) Abbruchgründe.
2. **Je Laststufe:**
   - Event-Simulator mit der Rate der Stufe neu starten.
   - Läufe alternierend A, B, A, B ausführen. Je Lauf:
     - Front-Nginx auf die Zelle umschalten;
     - k6-Erweiterung prüfen;
     - Ressourcenmessung starten, k6 ausführen, Ressourcenmessung beenden;
     - Container-Status prüfen (Absturz, OOM);
     - Lauf-Protokoll schreiben.
3. **Gültigkeit:** Ein Lauf ist ungültig bei k6-Fehler, fehlender k6-Zusammenfassung, ohne empfangene Events, bei abgestürztem oder per OOM beendetem Container, fehlgeschlagener Ressourcenmessung oder Drosselung des Pi. Überschreitet der Anteil ungültiger Läufe `maxFailureRate`, bricht die Kampagne ab.
4. **Abschluss:** Simulator stoppen, `aggregate.json` schreiben. Bei Abbruch (auch per Strg-C) wird die angefangene Laststufe als `incomplete` gekennzeichnet; `evaluate.js` berücksichtigt sie nicht.

## Ergebnisse

`results/<zeitstempel>_<name>/`:

| Datei | Inhalt |
| --- | --- |
| `campaign.json` | verwendete Kampagnendefinition |
| `campaign.log.jsonl` | Ereignisprotokoll, eine JSON-Zeile pro Ereignis |
| `runs/<laststufe>_<konfiguration>_runNNNN.json` | Lauf-Protokoll: Messwerte (`measures`), Ressourcen je Zelle und Container, Container-Status, Kontext (Git-Stand, Versionen, Host, Limits, Images), vollständige k6-Zusammenfassung |
| `aggregate.json` | deskriptive Kennzahlen je Konfiguration und Laststufe, Vergleiche je Messgröße mit Paaren, Zwischenstände, ggf. Sättigung |

Die Messgrößen eines Laufs (`measures`) und ihre Bedeutung beschreibt DECISIONS.md 5.16. Statistisch verglichen werden je Kampagne `latency_mean_ms`, `cpu_seconds` und `working_set_peak_bytes`. Für jeden Vergleich enthält `aggregate.json`:

- die Paare mit Laufnummern sowie die verworfenen Laufnummern,
- den Wilcoxon-Test (W, W⁺, W⁻, p, Verfahren),
- Cliff's Delta mit Einordnung und die rangbiseriale Korrelation,
- die Median-Differenz mit 95-%-Konfidenzintervall,
- Startwert und Zahl der Resamples des Bootstraps.

`evaluate.js` schreibt `results/<zeitstempel>_evaluation/evaluation.json` und `evaluation.md` (Tabellen je Familie mit Holm-adjustierten p-Werten, Dezimalkomma). Pilot- und Sättigungskampagnen sowie abgebrochene Kampagnen werden mit Hinweis übersprungen; `--include-aborted` bezieht Letztere ein. Ist ein geplanter Vergleich in mehreren Kampagnen gemessen, bricht die Auswertung ab, damit eindeutig festgelegt wird, welche Kampagne zählt.

## Statistik

Verfahren und Begründung: DECISIONS.md 5.8. Kurzfassung:

- **Analyseeinheit:** der Lauf. Testgröße ist der Mittelwert der Latenz pro Lauf.
- **Paare:** gleiche Laufnummer; nur Paare, in denen beide Läufe gültig sind.
- **Test:** Wilcoxon-Vorzeichen-Rang-Test, zweiseitig. Exakt bis 50 Paare ohne Bindungen, sonst Normalapproximation mit Stetigkeits- und Bindungskorrektur.
- **Effektmaße:** Cliff's Delta mit Einordnung nach Romano et al. (2006), zusätzlich die rangbiseriale Korrelation für gepaarte Daten.
- **Konfidenzintervall:** 95-%-Bootstrap-Intervall (Perzentil-Methode) für den Median der gepaarten Differenzen, mit festem Startwert.
- **Mehrfachtests:** Holm-Korrektur je Messgröße über alle 24 geplanten Tests in `evaluate.js`.

Vorzeichenkonvention: Differenzen und Effektmaße beziehen sich auf A − B in der Reihenfolge des Vergleichs. Negative Werte bedeuten, dass A kleinere Werte hat (bei Latenz, CPU und Speicher: besser).
