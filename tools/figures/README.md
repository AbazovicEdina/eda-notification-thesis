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
| `box-<messgröße>-framework.pdf`, `-queue.pdf`, `-language-queue.pdf` | dasselbe für die Vergleiche 5–8, 9–10 und 11 (Ergänzung bzw. Anhang, in Graustufen) |
| `scaling-served.pdf`, `scaling-latency.pdf`, `scaling-memory.pdf` | Skalierungsreihe: bediente Clients, Latenz und Working Set über die Clientzahl, je Sprache und Framework-Wahl ein Feld |
| `saturation.pdf` | höchste nachhaltige Event-Rate je Variante; „≥" kennzeichnet das Erreichen der höchsten getesteten Stufe |

`<messgröße>` steht für `latency-mean-ms`, `cpu-seconds-total`, `working-set-peak-bytes-total` und `connect-mean-ms`.

## Gestaltung

- Breite der Textspalte der HagenbergThesis-Vorlage; in LaTeX mit `\includegraphics[width=\textwidth]{<datei ohne .pdf>}` einbinden.
- Schrift Computer Modern, passend zur Latin Modern der Vorlage, als TrueType eingebettet.
- Farben aus einer auf Farbfehlsichtigkeit geprüften Palette: Node.js blau und PHP orange, SSE violett und WebSocket grün. Jede Farbe hat in allen Abbildungen nur eine Bedeutung. Schraffur, Linienart und Markierung halten die Abbildungen im Schwarzweißdruck lesbar; die Anhangsabbildungen sind ganz in Graustufen.
- Beschriftungen auf Englisch, Bildunterschriften entstehen in LaTeX.
- Die PDFs enthalten kein Erstellungsdatum; dieselben Eingaben ergeben dieselben Dateien.

## Abhängigkeiten

Python mit matplotlib 3.11.2 und numpy 2.5.3 (`requirements.txt`) in einem eigenen Container, Basis-Image per Digest gepinnt. Lokal ist keine Python-Installation nötig.
