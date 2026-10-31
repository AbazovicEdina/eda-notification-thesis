# Skalierungsreihe und Sättigungstest

Erzeugt: 2026-10-29T16:12:22.683Z. Beschreibende Auswertung ohne Signifikanztests. Jeder Wert ist der Median über die gültigen Läufe einer Stufe.

## Ansturm

Alle Clients verbinden sich im selben Moment, etwa nach einem Neustart des Servers. Jede Zelle wird einzeln gemessen. Die Speicherspitze laut Kernel ist der größte Höchstwert über die Läufe, als Summe über die Container der Zelle.

| Zelle | Clients | gültig | rechtzeitig verbunden | bedient (Median, Minimum) | Verbindungsaufbau (ms) | Latenz Mittel (ms) | Speicherspitze laut Kernel (MiB) | Gründe ungültiger Läufe |
|---|---|---|---|---|---|---|---|---|
| node-express-sse | 500 | 3/3 | 100.0 % | 100.0 %, 100.0 % | 104.7 | 12.18 | 75 | – |
| node-express-sse-queue | 500 | 3/3 | 100.0 % | 100.0 %, 100.0 % | 132.0 | 13.95 | 149 | – |
| node-express-ws | 500 | 3/3 | 100.0 % | 100.0 %, 100.0 % | 124.5 | 11.27 | 71 | – |
| node-minimal-sse | 500 | 3/3 | 100.0 % | 100.0 %, 100.0 % | 109.7 | 11.30 | 71 | – |
| node-minimal-ws | 500 | 3/3 | 100.0 % | 100.0 %, 100.0 % | 70.8 | 11.09 | 68 | – |
| php-laravel-sse | 500 | 1/3 | 100.0 % | 99.8 %, 0.0 % | 3696.7 | 9.82 | 1538 | sut_container_failed:php-laravel-fpm(OOM) (2) |
| php-laravel-sse-queue | 500 | 0/3 | 0.0 % | 0.0 %, 0.0 % | – | – | – | sut_container_failed:php-laravel-fpm-queue(OOM),php-laravel-queue-worker(OOM) (3) |
| php-laravel-ws | 500 | 3/3 | 100.0 % | 100.0 %, 100.0 % | 230.5 | 13.96 | 77 | – |
| php-minimal-sse | 500 | 3/3 | 100.0 % | 100.0 %, 100.0 % | 93.3 | 10.04 | 349 | – |
| php-minimal-ws | 500 | 3/3 | 100.0 % | 100.0 %, 100.0 % | 53.2 | 10.87 | 22 | – |
