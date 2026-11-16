# Zeitliche Abhängigkeit der gepaarten Läufe, Nachrechnungen und Simulationen

Grundlage der Festlegung in `DECISIONS.md` 5.8, Abschnitt „Zeitliche Abhängigkeit der gepaarten Läufe“, vom 2026-11-09.

**Einordnung.** Die Nachrechnungen beruhen ausschließlich auf den 39 Kampagnen von Block 1. Sie sind keine unabhängige externe Validierung. Die Python-Nachrechnung ist eine getrennte Implementierung derselben Festlegung vom selben Bearbeitungsstand. Die Simulationen nutzen vereinfachte Modelle und ersetzen keinen Nachweis für die echten Reihen. Daten von Block 2 werden nicht gelesen, alle Skripte filtern auf Verzeichnisse mit dem Namen `…_b1-c<Vergleich>-<Laststufe>`.

**Bootstrap in diesen Skripten.** Die Block-Bootstrap-Rechnungen dokumentieren die geprüfte und verworfene Variante. Sie gehören nicht zur Auswertung in `tools/orchestrate/evaluate.js`, und ihre Intervalle bestätigen keine Testentscheidung.

## Inhalt

| Datei | Zweck | Ergebnis |
|---|---|---|
| `01-analyse-block1.mjs` | Autokorrelation, Trend, Blockintervalle, Streuung zwischen Kampagnen und Prozesslaufzeiten | `01-analyse-block1.txt`, `block1-je-test.json` |
| `02-simulation-stationaer-und-nachbildung.mjs` | Simulation bei unabhängigen und autokorrelierten Reihen mit und ohne linearen Trend, Nachbildung der Replikation innerhalb von Block 1 | `02-simulation-stationaer-und-nachbildung.txt` |
| `03-simulation-verlaeufe-und-blocklaengen.mjs` | Simulation mit linearen und nichtlinearen Verläufen, Fehlalarme der Diagnose, Blocklängen 5, 13 und 20 beim Working Set, Einordnung je Hypothese | `03-simulation-verlaeufe-und-blocklaengen.txt` |
| `04-einordnung-block1.mjs` | Einordnung der 128 nach Holm signifikanten Tests, Blocklängen aus Block 1 | `04-einordnung-block1.txt` |
| `05-verlauf-working-set.py` | Verlauf des Working Sets einzelner Zellen über die Läufe 1 bis 90 | `05-verlauf-working-set.txt` |
| `06-vergleich-auswertungen.mjs` | Vergleich der neuen mit der bisherigen Auswertung von Block 1 | `06-vergleich-auswertungen.txt` |
| `07-nachrechnung-diagnose.py` | getrennte Nachrechnung der Diagnose aus den Laufdateien | `07-nachrechnung-diagnose.txt` |

## Parameter und Startwerte

| Skript | Parameter | Startwerte |
|---|---|---|
| 01 | Bootstrap mit 10 000 Resamples, auf dem Niveau 1 − 0,05/39 mit 40 000, Blocklängen 1, 3, 5, 8, 10, 15, 20 und 30 | 20261109 + 1000 · Vergleich + 10 · Index der Laststufe + Index der Messgröße |
| 02 | 90 Paare, 1 200 Wiederholungen, 799 Resamples, Nachbildung mit 1 500 Resamples | Simulation 4711 + 100 · Autokorrelation + 10 · Trendanteil, gerundet. Nachbildung ab 100 fortlaufend |
| 03 | 90 Paare, 1 200 Wiederholungen, 799 Resamples, Zielgröße aus 20 000 Simulationen, Fehlalarme aus 40 000 Simulationen, Blocklängen beim Working Set 5, 13 und 20 mit 10 000 Resamples | Simulation 1234 + 100 · Autokorrelation, Fehlalarme 77, Block 1 wie bei 01 mit Messgrößenindex 2 plus Blocklänge |
| 04 | Residuen-Bootstrap mit 10 000 und 40 000 Resamples, Blocklängen aus dem 75-%-Quantil | wie bei 01, beim strengen Niveau plus 1 |

Zufallsgenerator ist `createRng` aus `tools/orchestrate/stats.js`. Gleiche Startwerte ergeben dieselben Werte.

Festgelegte Parameter der Diagnose sind die Grenze 2/√n mit der tatsächlichen Zahl gültiger Paare, mindestens 20 gültige Paare, mindestens 19 Nachbarpaare, die Trennung der Hälften nach Lauf 50 und mindestens 10 Beobachtungen je Hälfte.

## Ausführung

Alle Befehle laufen im Wurzelverzeichnis des Repositorys und schreiben außer den hier genannten Dateien nichts. Der Schritt 02 und der Schritt 03 dauern jeweils mehrere Minuten.

```bash
D=results/2026-11-09_temporal-dependence-check
```

```bash
node $D/01-analyse-block1.mjs . $D/block1-je-test.json > $D/01-analyse-block1.txt
```

```bash
node $D/02-simulation-stationaer-und-nachbildung.mjs . > $D/02-simulation-stationaer-und-nachbildung.txt
```

```bash
node $D/03-simulation-verlaeufe-und-blocklaengen.mjs . $D/block1-je-test.json > $D/03-simulation-verlaeufe-und-blocklaengen.txt
```

```bash
node $D/04-einordnung-block1.mjs . $D/block1-je-test.json results/2026-11-09T00-26-22-566Z_evaluation/evaluation.json > $D/04-einordnung-block1.txt
```

```bash
python -I -X utf8 $D/05-verlauf-working-set.py results > $D/05-verlauf-working-set.txt
```

```bash
node $D/06-vergleich-auswertungen.mjs results/2026-11-08T14-31-16-334Z_evaluation results/2026-11-09T00-26-22-566Z_evaluation > $D/06-vergleich-auswertungen.txt
```

```bash
python -I -X utf8 $D/07-nachrechnung-diagnose.py results results/2026-11-09T00-26-22-566Z_evaluation/evaluation.json tools/orchestrate/plan.json > $D/07-nachrechnung-diagnose.txt
```

## Wichtigste Ergebnisse

| Größe | Wert |
|---|---|
| Autokorrelation erster Ordnung beim Working Set, Median über 39 Tests | 0,81 roh, 0,45 nach Entfernen eines linearen Trends |
| Diagnosen in Block 1 | 156, davon 119 ohne Befund, 9 nur linearer Trend, 28 Reststruktur, 0 nicht bestimmbar |
| Diagnosen bei zwei Blöcken | 312 geplant, Block 2 ist noch nicht ausgewertet |
| Nach Holm signifikante Tests in Block 1 | 128 unverändert, davon 91 ohne Befund, 9 nur linearer Trend, 28 Reststruktur. Nur eine Zählung, keine Bestätigung |
| Wilcoxon-Test in der Simulation bei Autokorrelation 0,45 | 23,9 % statt 5 %, auf dem Niveau 0,05/39 rund 4,6 % statt 0,13 % |
| Erwartete Fehlalarme der Diagnose | rund 2 bis 3 je 156 Tests, rund 4 bis 5 je 312 Tests |
| Kampagnen mit weiterlaufendem Prozess in Block 1 | 8 von 39 |
| Neue Auswertung von Block 1 | außer Erzeugungszeit und Feld `temporal_dependence` identisch mit `results/2026-11-08T14-31-16-334Z_evaluation/` |

Die Werte der Nachbildung der Replikation stehen in `02-simulation-stationaer-und-nachbildung.txt`, die der nichtlinearen Verläufe in `03-simulation-verlaeufe-und-blocklaengen.txt`.
