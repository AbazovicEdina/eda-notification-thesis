# Funktionsprüfung des überarbeiteten Messaufbaus (2026-10-16, zweite Runde)

Lokale Kurzkampagnen (Docker Desktop unter Windows 11/WSL2, 16 Kerne) nach der zweiten Überprüfung des Messaufbaus: Produktionsbetrieb, Front-Nginx mit FastCGI, Einschwingzeit, Verbindungsaufbau, Redis-Messung, Queue-Achse, Skalierungsphase, Zeitplan und Replikationsblock. Die Läufe sind bewusst kurz und **keine Messergebnisse der Arbeit**; absolute Werte sind nicht auf den Raspberry Pi übertragbar.

| Verzeichnis | Prüfgegenstand | Ergebnis |
|---|---|---|
| `…_t1-fastcgi-production` | node-minimal/SSE gegen php-minimal/SSE: Front-Nginx spricht FastCGI direkt mit PHP-FPM, Produktionsprüfung, Verbindungsaufbau, Redis-Messung | alle Läufe gültig; alle Container im Produktionsbetrieb (`NODE_ENV=production`, `php.ini-production`); Verbindungsaufbau ca. 3 ms; CPU-Zeit von Zelle und Redis getrennt erfasst |
| `…_t2-queue-laravel` | php-laravel/SSE gegen php-laravel/SSE mit Queue: Laravel-Erzeuger, Queue-Worker mit `block_for`, FastCGI zu Laravel | Zustellung 100 %; Queue-Weg ca. 0,3 ms langsamer (ohne `block_for` bis zu 3 s); Verbindungsaufbau Laravel ca. 15 ms |
| `…_t3-node-queue-reverb` | node-express/SSE gegen node-express/SSE mit BullMQ-Queue; node-express/WS gegen php-laravel/WS im Produktionsbetrieb | alle Zellen funktionsfähig, Zustellung 100 % |
| `…_t4-scaling-php-minimal-sse` | Skalierungsphase mit 100 und 600 Clients | bei 600 Clients 91,7 % bediente Clients (550 FPM-Worker); Zustellquote der bedienten Clients weiterhin 100 % |
| `…_t5-php-sse-stress-production` | php-minimal/SSE gegen php-laravel/SSE mit 500 Clients im Produktionsbetrieb | kein OOM; alle Clients innerhalb der Einschwingzeit verbunden; Working-Set-Spitze ca. 375 MiB bzw. 1 390 MiB; Verbindungsaufbau ca. 50 ms bzw. 610 ms |
| `…_mini-control`, `…_mini-b1-c01-baseline`, `…_mini-b2-c01-baseline`, `…_schedule_mini.jsonl` | Zeitplan (`schedule.js`): Kontrollmessung, zufällige Reihenfolge, Fortsetzen | Kontrollmessung vor der ersten Kampagne; zweiter Start überspringt alle vollständigen Kampagnen |
| `…_evaluation` | Gesamtauswertung mit Block 1 (konfirmatorisch) und Block 2 (Replikation) | Holm über m = 33 je Familie; Vergleiche unter 20 Paaren als nicht aussagekräftig markiert; Replikationsabgleich |

Wegen der geringen Zahl an Läufen (n = 1–3 Paare) sind alle Vergleiche erwartungsgemäß nicht signifikant bzw. nicht aussagekräftig.
