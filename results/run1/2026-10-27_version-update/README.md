# Funktionsprüfung nach dem Versionswechsel (2026-10-27)

Lokale Kurzkampagne (Docker Desktop unter Windows 11/WSL2) nach der Neufestlegung aller gemessenen Versionen (DECISIONS.md 5.26). Die Läufe sind bewusst kurz und **keine Messergebnisse der Arbeit**. Absolute Werte sind nicht auf den Raspberry Pi übertragbar.

| Verzeichnis bzw. Prüfung | Prüfgegenstand | Ergebnis |
|---|---|---|
| `…_v-update-all-cells` | alle zehn Zellen mit PHP 8.5.11, Node.js 26.11.1, Laravel 13.36.0, Express 5.3.0, BullMQ 6.3.14, Redis 8.10.2 und Nginx 1.30.5, Produktionsbetrieb, 10 Clients (je ein Warm-up und zwei Läufe) und 500 Clients (je ein Warm-up-Lauf) | alle Läufe gültig, alle Container im Produktionsbetrieb, Zustellung 100 %. Bei 500 Clients bedienten alle Zellen sämtliche Clients. Working-Set-Spitze bei 500 Clients 1 022 MiB für php-laravel/SSE, 1 055 MiB für php-laravel/SSE mit Queue und 360 MiB für php-minimal/SSE |
| Fehlersichtbarkeit von BullMQ (ohne Ergebnisverzeichnis) | Wiederholung des Experiments aus DECISIONS.md 5.13 unter BullMQ 6.3.14 mit ioredis 6.0.0 und Node.js 26.11.1, eigene Prüf-Queue | Befund wie zuvor. Der `failed`-Handler meldet Job-ID und Fehlermeldung ohne Correlation-ID, `queue.getFailed()` liefert den Job mit `correlation_id`, Fehlergrund und Zahl der Versuche |
| Fehlersichtbarkeit der Laravel-Queue (ohne Ergebnisverzeichnis) | Wiederholung unter Laravel 13.36.0. Der Fehler wurde nur im laufenden Prüf-Container eingebaut, der Container danach verworfen | Befund wie unter Laravel 13.34.0. Die Konsole meldet nur `FAIL`, die Protokollierung scheitert an der fehlenden SQLite-Datenbank, Fehlermeldung und Correlation-ID stehen nur im Kontext des Folgefehlers |
| Werkzeuge in den Images | `node --help` im Node-Image, PHP-Module und Composer-Stand im Laravel-Image | Node.js 26.11.1 enthält `--inspect`, `--prof` und `--cpu-prof`. Kein Xdebug im Image mit PHP 8.5.11, Laravel 13.36.0 bringt Monolog 3.12.1 mit |

Der Vergleich der Latenzen ist bei n = 1 Paar erwartungsgemäß nicht aussagekräftig. Der Hinweis auf aktiven Swap betrifft nur den lokalen Rechner, auf dem Pi ist Swap abgeschaltet und wird vor jeder Kampagne geprüft.
