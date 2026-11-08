# figures

Erzeugt die Abbildungen der Ergebniskapitel als Vektor-PDF (DECISIONS.md 5.25). Eingabe sind die Gesamtauswertung der Hauptmessung (`evaluation.json` aus `tools/orchestrate/evaluate.js`) und die Auswertung von Skalierung und Sättigung (`series.json` aus `tools/orchestrate/series.js`).

## Aufruf

```bash
docker compose --profile tools build figures
docker compose --profile tools run --rm figures --evaluation results/<zeitstempel>_evaluation --series results/<zeitstempel>_series
```

Unter Git Bash auf Windows ist `MSYS_NO_PATHCONV=1` voranzustellen, damit die Pfade nicht umgeschrieben werden. Einer der beiden Parameter genügt, dann entstehen nur die zugehörigen Abbildungen. `--note <datei>=<text>` ergänzt in `figures.md` einen Hinweis für die Bildunterschrift einer Abbildung und darf mehrfach stehen.

**Ergebnis.** `results/<zeitstempel>_figures/` mit den PDFs und `figures.md`, das jede Datei beschreibt, ihre Stufe nach DECISIONS.md 5.24 nennt (Kern, Ergänzung, Anhang) und fehlende Werte ausweist.

## Abbildungen

| Datei | Inhalt |
| --- | --- |
| `box-<messgröße>-language.pdf` | Boxplots der Lauf-Werte für die Sprachvergleiche 1–4, je Vergleich eine Zeile und je Laststufe eine Spalte (Kern) |
| `box-<messgröße>-transport.pdf` | dasselbe für die Transportvergleiche 12 und 13 (Kern) |
| `box-<messgröße>-framework.pdf`, `-queue.pdf`, `-language-queue.pdf` | dasselbe für die Vergleiche 5–8, 9–10 und 11 (Ergänzung bzw. Anhang) |
| `scaling-served.pdf`, `scaling-latency.pdf`, `scaling-memory.pdf` | **Skalierungsreihe.** Bediente Clients, Latenz und Working Set über die Clientzahl, je Sprache und Framework-Wahl ein Feld |
| `saturation.pdf` | höchste nachhaltige Event-Rate je Variante als Punktdiagramm auf den getesteten Stufen. Ein Pfeil nach oben kennzeichnet das Erreichen der höchsten Stufe |

`<messgröße>` steht für `latency-mean-ms`, `cpu-seconds-total`, `working-set-peak-bytes-total` und `connect-mean-ms`.

## Gestaltung

- Breite der Textspalte der HagenbergThesis-Vorlage (146 mm). In LaTeX mit `\includegraphics[width=\textwidth]{<datei ohne .pdf>}` einbinden, sonst stimmen die Schriftgrößen nicht. Die Boxplots mit vier Vergleichen sind 200 mm hoch und brauchen eine eigene Gleitseite (`\begin{figure}[p]`).
- Farben aus `images/diagram-styles.tex` im Overleaf-Projekt (Palette A, Version 2). `PALETTE` in `figures.py` enthält dieselben Werte. Wer eine Farbe ändert, ändert sie in beiden Dateien.
- **Farben in den Boxplots.** Die Füllung zeigt die Sprache (Node.js grün, PHP violett). Umrandung, Antennen und Punkte zeigen, was der Vergleich ändert. Vergleicht er die beiden Sprachen, tragen sie die Farbe der Sprache. Vergleicht er zwei Varianten derselben Sprache, behält Variante A die Farbe ihrer Sprache und Variante B trägt die Farbe der geänderten Eigenschaft (WebSocket petrol, Framework bronze, Queue apricot). Die Linienart zeigt den Transport (durchgezogen SSE, gestrichelt WebSocket). Varianten mit Queue haben zusätzlich ein Punktmuster in der Füllung, weil Apricot und Grün bei einer Rot-Grün-Sehschwäche kaum zu unterscheiden sind.
- **Aufbau der Boxplots.** Jede Zeile ist ein Vergleich in der Reihenfolge von `plan.json`, jede Spalte eine Laststufe (10, 50, 500 Clients von links nach rechts). Über der ersten Zeile stehen die Laststufen, über jeder Zeile der Vergleich. In jedem Feld steht Variante A links und Variante B rechts, unter jeder Box ihr Name. Jedes Feld hat eine eigene y-Achse ab null, weil eine gemeinsame Achse je Spalte die kleineren Paare zu Strichen gestaucht hätte.
- **Legende.** In jeder Abbildung oben und mittig, in zwei Zeilen, die Spalten immer in derselben Reihenfolge: Sprachen, die geänderte Eigenschaft, die Transporte, Einzellauf bzw. Grenzen.
- **Abstände.** Zu jedem Rand bleiben 2,5 mm frei. Die y-Beschriftung steht einmal links und ist mittig zu den Feldern ausgerichtet. Beschriftungen von Teilstrichen, die einander berühren würden, entfallen, die Gitterlinien bleiben.
- **Prüfung beim Erzeugen.** `check_layout` meldet in `figures.md` und auf der Konsole jeden Text, der näher als 2,5 mm an einen Rand kommt, jedes abgeschnittene Symbol der Legende und jede Überlappung zweier Texte. Ohne Meldung ist keine gefunden.
- Cliff's δ steht kursiv wie eine Variable, so wie `$\delta$` im Text der Arbeit. Die Beschriftung „δ = +0.40*“ kommt ganz aus Latin Modern Math, weil matplotlib das kursive δ (U+1D6FF) im Formelsatz nicht findet und sonst auf die Schrift STIX ausweicht. ↑ kommt ebenfalls aus Latin Modern Math. In der Textebene der PDFs stehen beide als Unicode-Zeichen.
- Schrift Latin Modern Roman wie in der Vorlage (`lmodern`, 11 pt). Beschriftungen in der Größe von `\small` (10 pt), Namen unter den Boxen und δ in der Größe von `\footnotesize` (9 pt), Achsenwerte in der Größe von `\scriptsize` (8 pt), jeweils in der optischen Größe, die LaTeX dafür verwendet. Die Schriften werden beim Bau des Images nach TrueType umgewandelt (`otf2ttf.py`), damit Schrifttyp und eingebettete Daten in den PDFs übereinstimmen (PDF/A-Prüfung mit veraPDF).
- **Boxplots.** Box Interquartilsabstand, Linie Median, Antennen höchstens das 1,5-Fache des Interquartilsabstands, dazu jeder Lauf als Punkt, damit Verteilung und Stichprobengröße sichtbar sind. Die Füllung liegt unter den Punkten, Umrandung und Median darüber, damit die Striche von WebSocket sichtbar bleiben. Über jedem Paar steht Cliff's Delta (linke gegenüber rechter Variante), mit Stern, wenn der Vergleich nach der Holm-Korrektur signifikant ist. Die y-Achse beginnt bei null, weil alle Messgrößen verhältnisskaliert sind und Unterschiede sonst überzeichnet würden.
- **Skalierungsreihe.** Median je Stufe, Fehlerbalken vom kleinsten bis zum größten Lauf der Stufe. SSE in der Farbe der Sprache, WebSocket petrol und gestrichelt, SSE mit Queue apricot, wie Variante B in den Boxplots. Die y-Achse ist logarithmisch, wenn die Werte einen Faktor 20 übersteigen, sonst linear ab null. Jede Stufe hat einen Teilstrich, 750 bleibt ohne Zahl.
- **Sättigungstest.** Punktdiagramm statt Balken, weil das Ergebnis die höchste bestandene Stufe ist und kein stetiger Messwert. Die Gitterlinien liegen genau auf den getesteten Raten.
- Die Legende erklärt jede Farbe, Linienart, jedes Muster und jedes Symbol. Was sich nicht in die Legende fassen lässt (Boxplot-Definition, Zahl der Läufe, Cliff's Delta, Kriterien), steht in `figures.md` in der Spalte „Für die Bildunterschrift“ und gehört in die Bildunterschrift.
- Beschriftungen auf Englisch, Bildunterschriften entstehen in LaTeX.
- Die PDFs enthalten kein Erstellungsdatum. Dieselben Eingaben ergeben dieselben Dateien.

## Abhängigkeiten

Python mit matplotlib 3.11.2 und numpy 2.5.3 (`requirements.txt`) in einem eigenen Container, Basis-Image per Digest gepinnt, Latin Modern aus dem Debian-Paket `fonts-lmodern` in Version 2.005-1. Lokal ist keine Python-Installation nötig.
