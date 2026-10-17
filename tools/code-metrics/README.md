# code-metrics

Statische Code- und Betriebskennzahlen je Zelle (DECISIONS.md 5.22). Sie beantworten zusammen mit dem Debugging- und Monitoring-Vergleich (DECISIONS.md 5.13) die Frage nach Komplexität und Wartbarkeit der Varianten. Es handelt sich um eine Auswertung des Repository-Stands, nicht um eine Laufzeitmessung.

## Aufruf

```bash
node tools/code-metrics/metrics.js
```

Ergebnis: `results/<zeitstempel>_code-metrics/metrics.json` und `metrics.md`. Das Werkzeug benötigt nur Node.js und liest die Lock-Dateien der Prototypen. Die Auswertung wird auf dem Commit ausgeführt, mit dem gemessen wird. `metrics.md` vermerkt, ob `prototypes/` lokale Änderungen enthielt.

## Kennzahlen

| Kennzahl | Ebene | Definition |
| --- | --- | --- |
| eigener Code (Dateien, Zeilen) | Zelle | Anwendungscode, der für die Zelle geschrieben wurde und in ihren Containern läuft; Zeilen ohne Leer- und Kommentarzeilen |
| Betriebskonfiguration (Zeilen) | Zelle | Dockerfile, FPM-Pool und Startskript der Zelle, ohne Leer- und Kommentarzeilen |
| Container | Zelle | Zahl der Container der Zelle laut `tools/orchestrate/cells.json` |
| direkte Abhängigkeiten | Zelle | von der Zelle genutzte Pakete aus `composer.json` bzw. `package.json` |
| Pakete insgesamt | Zelle | direkte Abhängigkeiten und alle Pakete, von denen sie laut Lock-Datei abhängen |
| Systemerweiterungen | Zelle | Laufzeiterweiterungen außerhalb des Paketmanagers (z. B. phpredis über PECL) |
| Projektdateien, Codezeilen im Projekt | Prototyp | alle Quell- und Konfigurationsdateien ohne Abhängigkeiten, Lock-Dateien, Laufzeitdaten und Dokumentation; bei Laravel einschließlich des erzeugten Projektgerüsts |
| installierte Produktionspakete | Prototyp | alle Pakete der Lock-Datei ohne Entwicklungsabhängigkeiten |

Welche Dateien und Abhängigkeiten zu einer Zelle gehören, legt `variants.json` ausdrücklich fest. Nicht mitgezählt werden die Ereignisquellen, die auf dem Lastgenerator laufen (`node-express/queue/producer.js`, `ProduceScanEventsCommand.php`), und der Hilfsbefehl des Debugging-Vergleichs (`DispatchTestScanCommand.php`).

## Grenzen

Codezeilen und Paketzahlen sind grobe Näherungen für Wartungsaufwand. Sie erfassen weder die Verständlichkeit des Codes noch die Qualität der Dokumentation eines Frameworks. In der Arbeit werden sie deshalb nur zusammen mit dem qualitativen Vergleich (DECISIONS.md 5.13) und ohne Gewichtung zu einer Gesamtnote berichtet.
