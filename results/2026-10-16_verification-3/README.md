# Funktionsprüfung nach dem Abgleich mit dem Exposé (2026-10-16, dritte Runde)

Lokale Kurzkampagnen (Docker Desktop unter Windows 11/WSL2, 16 Kerne) nach dem Upgrade auf Laravel 13 und der Ergänzung der Transportvergleiche (DECISIONS.md 5.15, 5.23). Die Läufe sind bewusst kurz und **keine Messergebnisse der Arbeit**; absolute Werte sind nicht auf den Raspberry Pi übertragbar.

| Verzeichnis | Prüfgegenstand | Ergebnis |
|---|---|---|
| `…_v13-laravel` | php-laravel/SSE, php-laravel/WS und php-laravel/SSE mit Queue unter Laravel 13.34.0 und Reverb 1.12.0, Produktionsbetrieb, 10 und 500 Clients | alle Läufe gültig; alle Container im Produktionsbetrieb; Zustellung 100 %; Working-Set-Spitze von php-laravel/SSE bei 500 Clients ca. 1 010 MiB (10 s Haltezeit) |
| `…_v13-pilot-c12-baseline` | Vergleich 12 (node-minimal/SSE gegen node-minimal/WS), erzeugt mit `plan-campaigns.js pilot --comparisons 12,13 --prefix v13-`; xk6-sse und das WebSocket-Modul von k6 in einer Kampagne | alle Läufe gültig; Latenz beider Transporte ca. 1,1 ms bei 10 Clients |
| `…_v13-pilot-c13-stress` | Vergleich 13 (php-minimal/SSE über FastCGI gegen php-minimal/WS mit Ratchet), 500 Clients, Umschalten des Front-Nginx zwischen FastCGI- und HTTP-Modus je Lauf | alle Läufe gültig; alle Clients innerhalb der Einschwingzeit verbunden; CPU-Zeit von Zelle und Redis bei SSE etwa doppelt so hoch wie bei WS |

Nachtrag vom 2026-10-17:

| Verzeichnis bzw. Prüfung | Prüfgegenstand | Ergebnis |
|---|---|---|
| `…_v-digests-all-cells` | alle zehn Zellen nach dem Pinnen der Basis-Images auf Multi-Arch-Digests und einem Neubau aller Images, Produktionsbetrieb, 10 Clients | alle 30 Läufe gültig; alle Container im Produktionsbetrieb; Zustellung 100 % |
| Fehlersichtbarkeit der Laravel-Queue (ohne Ergebnisverzeichnis) | Wiederholung des Experiments aus DECISIONS.md 5.13 unter Laravel 13.34.0; der Fehler wurde nur im laufenden Prüf-Container eingebaut, der Container danach verworfen | Befund wie unter Laravel 12: Konsole nur `FAIL`, Protokollierung scheitert an der fehlenden SQLite-Datenbank, Fehlermeldung und Correlation-ID nur im Kontext des Folgefehlers |

Wegen der geringen Zahl an Läufen (n = 1–3 Paare) sind alle Vergleiche erwartungsgemäß nicht aussagekräftig. Der Hinweis auf aktiven Swap betrifft nur den lokalen Rechner; auf dem Pi ist Swap abgeschaltet und wird vor jeder Kampagne geprüft.
