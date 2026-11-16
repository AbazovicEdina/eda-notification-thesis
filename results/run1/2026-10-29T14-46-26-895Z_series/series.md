# Skalierungsreihe und Sättigungstest

Erzeugt: 2026-10-29T14:46:26.895Z. Beschreibende Auswertung ohne Signifikanztests. Jeder Wert ist der Median über die gültigen Läufe einer Stufe.

## Ansturm

Alle Clients verbinden sich im selben Moment, etwa nach einem Neustart des Servers. Jede Zelle wird einzeln gemessen. Die Speicherspitze laut Kernel ist der größte Höchstwert über die Läufe, als Summe über die Container der Zelle.

| Zelle | Clients | gültig | rechtzeitig verbunden | bedient (Median, Minimum) | Verbindungsaufbau (ms) | Latenz Mittel (ms) | Speicherspitze laut Kernel (MiB) | Gründe ungültiger Läufe |
|---|---|---|---|---|---|---|---|---|
| node-express-sse | 500 | 3/3 | 100.0 % | 100.0 %, 100.0 % | 46.5 | 11.52 | 72 | – |
| node-express-sse-queue | 500 | 3/3 | 100.0 % | 100.0 %, 100.0 % | 44.9 | 12.66 | 156 | – |
| node-express-ws | 500 | 3/3 | 100.0 % | 100.0 %, 100.0 % | 31.5 | 11.65 | 71 | – |
| node-minimal-sse | 500 | 3/3 | 100.0 % | 100.0 %, 100.0 % | 25.2 | 11.33 | 71 | – |
| node-minimal-ws | 500 | 3/3 | 100.0 % | 100.0 %, 100.0 % | 56.9 | 11.09 | 69 | – |
| php-laravel-ws | 500 | 3/3 | 100.0 % | 100.0 %, 100.0 % | 195.9 | 13.54 | 85 | – |
| php-minimal-sse | 500 | 3/3 | 100.0 % | 100.0 %, 100.0 % | 41.1 | 10.82 | 403 | – |
| php-minimal-ws | 500 | 3/3 | 100.0 % | 100.0 %, 100.0 % | 64.5 | 9.93 | 25 | – |

## Hinweise

- 2026-10-29T14-34-13-207Z_storm-php-laravel-sse: abgebrochen (Front-Nginx erreicht php-laravel-sse (fastcgi php-laravel-fpm:9000) nicht), übersprungen (--include-aborted zum Einbeziehen)
- 2026-10-29T14-35-21-590Z_storm-php-laravel-sse-queue: abgebrochen (Front-Nginx erreicht php-laravel-sse-queue (fastcgi php-laravel-fpm-queue:9000) nicht), übersprungen (--include-aborted zum Einbeziehen)
