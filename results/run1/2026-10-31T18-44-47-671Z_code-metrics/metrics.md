# Code- und Betriebskennzahlen

Erzeugt: 2026-10-31T18:44:47.671Z, Commit 8ca159f. Statische Auswertung, Definitionen in tools/code-metrics/variants.json und DECISIONS.md 5.22.

## Je Zelle

| Zelle | eigener Code (Dateien) | eigener Code (Zeilen) | Betriebskonfiguration (Zeilen) | Container | direkte Abhängigkeiten | Pakete insgesamt | Systemerweiterungen |
|---|---|---|---|---|---|---|---|
| node-minimal-sse | 1 | 33 | 7 | 1 | redis | 6 | – |
| node-minimal-ws | 1 | 25 | 7 | 1 | redis, ws | 7 | – |
| node-express-sse | 1 | 27 | 8 | 1 | express, redis | 71 | – |
| node-express-ws | 1 | 20 | 8 | 1 | express, redis, ws | 72 | – |
| node-express-sse-queue | 2 | 47 | 8 | 2 | express, redis, bullmq | 93 | – |
| php-minimal-sse | 1 | 23 | 19 | 1 | – | 0 | ext-redis (PECL) |
| php-minimal-ws | 1 | 55 | 14 | 1 | cboden/ratchet, clue/redis-react | 22 | – |
| php-laravel-sse | 1 | 30 | 35 | 1 | laravel/framework | 74 | ext-redis (PECL), ext-pcntl |
| php-laravel-ws | 3 | 40 | 30 | 2 | laravel/framework, laravel/reverb | 87 | ext-redis (PECL), ext-pcntl |
| php-laravel-sse-queue | 2 | 49 | 35 | 2 | laravel/framework | 74 | ext-redis (PECL), ext-pcntl |

„Pakete insgesamt" zählt die direkt genutzten Abhängigkeiten und alle Pakete, von denen diese abhängen (Lock-Datei).

## Je Prototyp

| Prototyp | Projektdateien | Codezeilen im Projekt | installierte Produktionspakete |
|---|---|---|---|
| node-minimal | 4 | 78 | 7 |
| node-express | 6 | 103 | 94 |
| php-minimal | 5 | 103 | 22 |
| php-laravel | 36 | 1043 | 90 |

Projektdateien und Codezeilen ohne Abhängigkeiten, Lock-Dateien, Laufzeitdaten und Dokumentation. Bei php-laravel enthalten sie das vom Framework erzeugte Projektgerüst (Konfiguration, Bootstrap, Migrationen).
