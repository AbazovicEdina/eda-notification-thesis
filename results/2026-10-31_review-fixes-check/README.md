# Prüfung der Korrekturen aus der statischen Prüfung vor Block 1 (2026-10-31)

Lokale Kurzkampagnen (Docker Desktop unter Windows 11/WSL2) nach den Korrekturen vom 2026-10-31 (DECISIONS.md 5.14, 5.18 bis 5.20). Die Images von node-express, php-laravel und der Ereignisquelle waren neu gebaut. Beide Kampagnen messen Vergleich 11 (node-express-sse-queue gegen php-laravel-sse-queue) mit 10 Clients, je einem Warm-up und drei Läufen mit 10 s Haltezeit. In Vergleich 11 laufen beide Queue-Zellen in derselben Kampagne, deshalb fiel der gemeinsame Kanal genau dort auf. Die Läufe sind bewusst kurz und **keine Messergebnisse der Arbeit**. Absolute Werte sind nicht auf den Raspberry Pi übertragbar.

| Verzeichnis | Prüfgegenstand | Ergebnis |
|---|---|---|
| `…_check-queue-pilot-c11-baseline` | eigener Redis-Kanal je Queue-Zelle (5.19), Regel gegen doppelte Events (5.9), BullMQ löscht erledigte Jobs (5.20), OPcache im Kontext (5.16) | alle acht Läufe gültig. Jede Zelle erhielt in jedem Lauf genau die 100 erwarteten Events (10 Clients × 10 s × 1 Event/s), ohne Duplikate und ohne Verluste. Vor der Korrektur kam in dieser Konstellation jedes Event doppelt an. Nach der Kampagne lagen in Redis nur noch vier Verwaltungsschlüssel von BullMQ, kein Job. `opcache_enable_fpm` steht im Kontext auf `On` |
| `…_check-health-pilot-c11-baseline` | dieselbe Kampagne nach einem frischen Start mit dem Healthcheck von Redis nur beim Start (5.18) | alle acht Läufe gültig, Zustellung wie oben. Redis war nach 2 s bereit, während der ganzen Kampagne lief der Healthcheck genau einmal. Die CPU-Zeit von Redis je Lauf sank von 0,29 bis 0,32 s auf 0,09 bis 0,10 s, der Anteil von Redis an der CPU-Zeit von Zelle und Redis von 69 bis 77 % auf 43 bis 52 % |

## Grundlast von Redis

Gemessen ohne Clients und ohne Ereignisquelle, jeweils über 30 s, getrennt nach der cgroup des Redis-Containers und dem Prozess `redis-server`. Der Anteil des Prozesses stammt aus `/proc/1/stat` (Auflösung 10 ms).

| Zustand | CPU-Zeit der cgroup | davon `redis-server` |
|---|---|---|
| Healthcheck alle 2 s, beide Queue-Worker aktiv | 354 ms | nicht getrennt gemessen |
| Healthcheck alle 2 s, Queue-Worker gestoppt | 334 und 368 ms | 60 ms |
| Healthcheck nur beim Start, Queue-Worker gestoppt | 66 ms | 60 ms |
| Healthcheck nur beim Start, beide Queue-Worker aktiv | 70 ms | 70 ms |

Rund 85 % der Grundlast stammten vom Healthcheck, der alle 2 s `redis-cli ping` im Container startete. Für die Messung auf dem Pi gibt es `infra/pi/redis-idle.sh`.

Der Hinweis auf aktiven Swap betrifft nur den lokalen Rechner, auf dem Pi ist Swap abgeschaltet und wird vor jeder Kampagne geprüft.

## Ereignisquelle je Lauf und Nginx (zweite Prüfung, DECISIONS.md 5.6.1, 5.6.3)

| Verzeichnis | Prüfgegenstand | Ergebnis |
|---|---|---|
| `…_check-switch-pilot-c11-baseline` | Vergleich 11, je Lauf läuft nur die Ereignisquelle der gemessenen Zelle | alle acht Läufe gültig, je Zelle genau 100 Events ohne Duplikate. Die CPU-Zeit von Redis unterscheidet sich jetzt zwischen den Zellen (BullMQ rund 0,08 s, Laravel 0,08 bis 0,10 s), vorher enthielt jeder Lauf beide Queues. Der Wechsel kostet lokal rund 7 s je Lauf außerhalb des Messfensters. Nginx wird getrennt gemessen (rund 0,03 s und 37 MiB je Lauf) und geht nicht in „Zelle + Redis" ein |
| `…_check-switch-pilot-c12-baseline` | Vergleich 12 mit einer gemeinsamen Quelle | alle Läufe gültig, die Quelle startet nur einmal je Laststufe, das bisherige Verhalten bleibt unverändert |

## Prüfung auf dem Pi

Die Prüfkampagnen auf der Zielhardware liegen direkt in `results/` mit dem Präfix `check-` (Vergleich 11 auf allen drei Laststufen und eine Kontrollmessung, 2026-10-31). Auswertung in DECISIONS.md 5.14.
