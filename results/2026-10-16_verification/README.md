# Funktionsprüfung des Messaufbaus (2026-10-16, erste Runde)

> Stand vor der zweiten Überprüfung: Diese Läufe entstanden noch im Entwicklungsbetrieb, mit Nginx-Brücke vor PHP-FPM und ohne Einschwingzeit. Den aktuellen Aufbau prüft `results/2026-10-16_verification-2/`.

Kurze lokale Kampagnen (Docker Desktop unter Windows 11/WSL2, 16 Kerne) zur Prüfung des überarbeiteten Messaufbaus. Die Läufe sind bewusst kurz (wenige Wiederholungen, 8–20 s Haltezeit) und **keine Messergebnisse der Arbeit**. Sie belegen die in DECISIONS.md genannten Prüfungen; absolute Werte sind nicht auf den Raspberry Pi übertragbar.

| Verzeichnis | Prüfgegenstand | Ergebnis |
|---|---|---|
| `…_v1-ws-framework` | Vergleich 4 (node-express/WS gegen php-laravel/WS): Reverb hinter dem Front-Nginx (`location /app/`), Zelle aus zwei Containern, Reverb-App-Key aus `prototypes/php-laravel/.env` | alle Läufe gültig, Zustellung 100 %; CPU-Zeit der Zelle php-laravel/WS je Container erfasst (Listener > Reverb); Key-Wert in keiner Ergebnisdatei |
| `…_v2-failure-injection` | Paarbildung bei Ausfall: k6-Container von php-minimal/SSE in Lauf 3 absichtlich beendet | Lauf 3 ungültig (`k6_exit_137`), aus der Paarbildung entfernt; Paare 2, 4, 5, 6 korrekt zugeordnet; Kampagne lief weiter |
| `…_v3-php-sse-stress` | Speicherbedarf mit 500 SSE-Clients unter 2 GiB (php-minimal/SSE gegen php-laravel/SSE) | kein OOM, keine verlorenen Events, keine Verbindungsfehler; Working-Set-Spitze ca. 397 MiB bzw. 1 035 MiB |
| `…_v4-saturation-ws-minimal` | Sättigungsphase mit Event-Raten 10, 100 und 500 pro Sekunde | gemessene Senderate 10,0 / 100,0 / 500,0 Events/s; auf dieser Hardware keine Sättigung erreicht |
| `…_evaluation` | Gesamtauswertung (`evaluate.js`) über v1 und v3 | Zuordnung zu den geplanten Vergleichen 4 und 7, fehlende Tests mit p = 1, Holm über m = 24 je Familie |

Die Phase von v1 und v3 ist `main`, damit `evaluate.js` sie einbezieht. Wegen der geringen Zahl an Paaren (n = 2–3) sind alle Vergleiche erwartungsgemäß nicht signifikant.
