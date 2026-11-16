# Erster Messdurchlauf (bis 2026-11-15)

Dieser Ordner enthält alle Ergebnisse bis zum 2026-11-15. Dazu gehören Belastungstest, Probeläufe, Pilot, Block 1, Block 2, Ansturm, Vorprüfung, Sättigungstest, Skalierungsreihe, Kontrollmessungen und die Auswertungen dazu. Die Arbeit wertet nur den zweiten Durchlauf ab dem 2026-11-16 aus, der direkt in `results/` liegt (DECISIONS.md 5.14, Abschnitt „Zweiter Durchlauf“).

**Grund für den zweiten Durchlauf.** Zwei unabhängige Prüfungen nach der Auswertung fanden Unstimmigkeiten in der Messkette. Die Quelle der Laravel-Queue rundete ihren Zeitstempel, alle anderen schnitten ihn ab. SSE-Läufe dauerten rund 0,4 s länger als WebSocket-Läufe und enthielten damit ein Event mehr. Bei PHP-FPM mit SSE endete der gemessene Verbindungsaufbau vor der Verbindung zu Redis. Bei Reverb wurde die Empfangszeit erst nach dem Parsen genommen. Die Ereignisquelle wartete nach jedem Event auf Redis, und die Regel zur Senderate im Sättigungstest konnte nie greifen. Außerdem lief in jedem Paar A vor B. Alles ist im zweiten Durchlauf behoben, die Daten hier bleiben unverändert erhalten.

**Was weiter gilt.** Der Pilot bleibt die Grundlage für die Wiederholungszahl von 90 Läufen je Konfiguration (DECISIONS.md 5.9). Die Probeläufe und Belastungstests dokumentieren die Einrichtung.

**Pfade in den Dateien.** Auswertungen, Reihen und Abbildungen in diesem Ordner nennen ihre Quellen noch mit dem ursprünglichen Ort `results/<ordner>`, also ohne `run1/`.
