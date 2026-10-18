# figures

Erzeugt die Abbildungen der Ergebniskapitel als Vektor-PDF (DECISIONS.md 5.25). Eingabe sind die Gesamtauswertung der Hauptmessung (`evaluation.json` aus `tools/orchestrate/evaluate.js`) und die Auswertung von Skalierung und Sättigung (`series.json` aus `tools/orchestrate/series.js`).

## Aufruf

```bash
docker compose --profile tools build figures
docker compose --profile tools run --rm figures --evaluation results/<zeitstempel>_evaluation --series results/<zeitstempel>_series
```

Unter Git Bash auf Windows ist `MSYS_NO_PATHCONV=1` voranzustellen, damit die Pfade nicht umgeschrieben werden. Einer der beiden Parameter genügt, dann entstehen nur die zugehörigen Abbildungen.

Ergebnis: `results/<zeitstempel>_figures/` mit den PDFs und `figures.md`, das jede Datei beschreibt, ihre Stufe nach DECISIONS.md 5.24 nennt (Kern, Ergänzung, Anhang) und fehlende Werte ausweist.

## Abbildungen

| Datei | Inhalt |
| --- | --- |
| `box-<messgröße>-language.pdf` | Boxplots der Lauf-Werte für die Sprachvergleiche 1–4, je Laststufe ein Feld (Kern) |
| `box-<messgröße>-transport.pdf` | dasselbe für die Transportvergleiche 12 und 13 (Kern) |
| `box-<messgröße>-framework.pdf`, `-queue.pdf`, `-language-queue.pdf` | dasselbe für die Vergleiche 5–8, 9–10 und 11 (Ergänzung bzw. Anhang) |
| `scaling-served.pdf`, `scaling-latency.pdf`, `scaling-memory.pdf` | Skalierungsreihe: bediente Clients, Latenz und Working Set über die Clientzahl, je Sprache und Framework-Wahl ein Feld |
| `saturation.pdf` | höchste nachhaltige Event-Rate je Variante als Punktdiagramm auf den getesteten Stufen; ein Pfeil nach oben kennzeichnet das Erreichen der höchsten Stufe |

`<messgröße>` steht für `latency-mean-ms`, `cpu-seconds-total`, `working-set-peak-bytes-total` und `connect-mean-ms`.

## Gestaltung

- Breite der Textspalte der HagenbergThesis-Vorlage; in LaTeX mit `\includegraphics[width=\textwidth]{<datei ohne .pdf>}` einbinden.
- Gestaltung wie die TikZ-Diagramme der Arbeit (`images/diagram-styles.tex` im Overleaf-Projekt, Palette A): Farbe kodiert die Sprache (PHP lavendel, Node.js salbeigrün) oder die Queue (apricot), Grau die gemeinsame Infrastruktur, die Linienart den Transport (durchgezogen SSE, gestrichelt WebSocket). Füllung, Linie und Text jeder Rolle haben dieselben Farbwerte wie in den Diagrammen.
- Schraffur und Markierung unterscheiden zusätzlich, was Farbe und Linienart im Schwarzweißdruck nicht trennen, etwa PHP von Node.js oder die Framework- von der Minimalvariante.
- Schrift Latin Modern Roman wie in der Vorlage (`lmodern`, 11 pt): Beschriftungen in der Größe von `\small` (10 pt), Achsenwerte und Anmerkungen in der Größe von `\scriptsize` (8 pt), jeweils in der optischen Größe, die LaTeX dafür verwendet. Die Schriften werden beim Bau des Images nach TrueType umgewandelt (`otf2ttf.py`), damit Schrifttyp und eingebettete Daten in den PDFs übereinstimmen (PDF/A-Prüfung mit veraPDF).
- Boxplots: Box Interquartilsabstand, Linie Median, Antennen höchstens das 1,5-Fache des Interquartilsabstands, dazu jeder Lauf als Punkt, damit Verteilung und Stichprobengröße sichtbar sind. Über jedem Paar steht Cliff's Delta (linke gegenüber rechter Variante), mit Stern, wenn der Vergleich nach der Holm-Korrektur signifikant ist. Die y-Achse beginnt bei null, weil alle Messgrößen verhältnisskaliert sind und Unterschiede sonst überzeichnet würden.
- Skalierungsreihe: Median je Stufe, Fehlerbalken vom kleinsten bis zum größten Lauf der Stufe. Die y-Achse ist logarithmisch, wenn die Werte einen Faktor 20 übersteigen, sonst linear ab null. Jede Stufe hat einen Teilstrich, 750 bleibt ohne Zahl.
- Sättigungstest: Punktdiagramm statt Balken, weil das Ergebnis die höchste bestandene Stufe ist und kein stetiger Messwert. Die Teilstriche liegen genau auf den getesteten Raten.
- Die Legende erklärt jede Farbe, Linienart, Schraffur und jedes Symbol. Was sich nicht in die Legende fassen lässt (Boxplot-Definition, Zahl der Läufe, Cliff's Delta, Kriterien), steht in `figures.md` in der Spalte „Für die Bildunterschrift“ und gehört in die Bildunterschrift.
- Beschriftungen auf Englisch, Bildunterschriften entstehen in LaTeX.
- Die PDFs enthalten kein Erstellungsdatum; dieselben Eingaben ergeben dieselben Dateien.

## Abhängigkeiten

Python mit matplotlib 3.11.2 und numpy 2.5.3 (`requirements.txt`) in einem eigenen Container, Basis-Image per Digest gepinnt, Latin Modern aus dem Debian-Paket `fonts-lmodern` in Version 2.005-1. Lokal ist keine Python-Installation nötig.
