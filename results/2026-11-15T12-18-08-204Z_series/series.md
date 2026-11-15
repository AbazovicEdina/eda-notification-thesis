# Skalierungsreihe und Sättigungstest

Erzeugt: 2026-11-15T12:18:08.204Z. Beschreibende Auswertung ohne Signifikanztests. Jeder Wert ist der Median über die gültigen Läufe einer Stufe.

## Skalierungsreihe

Kapazitätsgrenze: kleinste Clientzahl, bei der im Median weniger als 99.0 % der Clients bedient werden.

| Zelle | Kapazitätsgrenze (Clients) | Kampagne |
|---|---|---|
| node-express-sse | nicht erreicht | 2026-11-15T06-52-08-151Z_scaling-node-express-sse |
| node-express-sse-queue | nicht erreicht | 2026-11-15T05-01-53-885Z_scaling-node-express-sse-queue |
| node-express-ws | nicht erreicht | 2026-11-15T06-15-28-512Z_scaling-node-express-ws |
| node-minimal-sse | nicht erreicht | 2026-11-15T09-21-18-813Z_scaling-node-minimal-sse |
| node-minimal-ws | nicht erreicht | 2026-11-15T10-35-10-277Z_scaling-node-minimal-ws |
| php-laravel-sse | 750 | 2026-11-15T08-05-50-450Z_scaling-php-laravel-sse |
| php-laravel-sse-queue | 750 | 2026-11-15T08-43-06-534Z_scaling-php-laravel-sse-queue |
| php-laravel-ws | nicht erreicht | 2026-11-15T05-38-47-273Z_scaling-php-laravel-ws |
| php-minimal-sse | 750 | 2026-11-15T09-58-02-750Z_scaling-php-minimal-sse |
| php-minimal-ws | nicht erreicht | 2026-11-15T07-29-09-181Z_scaling-php-minimal-ws |

### node-express-sse

| Clients | bedient | Verbindungsaufbau (ms) | Latenz Mittel (ms) | Latenz p95 (ms) | CPU (Kerne) | Working Set gesamt (MiB) |
|---|---|---|---|---|---|---|
| 10 | 100.0 % | 2.5 | 1.59 | 2.0 | 0.00 | 55 |
| 50 | 100.0 % | 2.1 | 2.59 | 4.0 | 0.00 | 56 |
| 100 | 100.0 % | 2.0 | 3.66 | 6.0 | 0.00 | 59 |
| 250 | 100.0 % | 2.0 | 6.11 | 10.0 | 0.01 | 64 |
| 500 | 100.0 % | 1.8 | 10.63 | 18.0 | 0.02 | 70 |
| 750 | 100.0 % | 1.8 | 15.19 | 27.0 | 0.03 | 90 |
| 1000 | 100.0 % | 2.0 | 19.76 | 36.0 | 0.04 | 101 |

### node-express-sse-queue

| Clients | bedient | Verbindungsaufbau (ms) | Latenz Mittel (ms) | Latenz p95 (ms) | CPU (Kerne) | Working Set gesamt (MiB) |
|---|---|---|---|---|---|---|
| 10 | 100.0 % | 2.6 | 3.09 | 4.0 | 0.00 | 89 |
| 50 | 100.0 % | 2.2 | 3.80 | 5.0 | 0.01 | 91 |
| 100 | 100.0 % | 2.1 | 4.85 | 7.0 | 0.01 | 98 |
| 250 | 100.0 % | 2.0 | 7.62 | 12.0 | 0.01 | 101 |
| 500 | 100.0 % | 1.9 | 12.86 | 22.0 | 0.03 | 109 |
| 750 | 100.0 % | 2.0 | 17.74 | 31.0 | 0.03 | 126 |
| 1000 | 100.0 % | 2.0 | 23.29 | 41.0 | 0.05 | 145 |

### node-express-ws

| Clients | bedient | Verbindungsaufbau (ms) | Latenz Mittel (ms) | Latenz p95 (ms) | CPU (Kerne) | Working Set gesamt (MiB) |
|---|---|---|---|---|---|---|
| 10 | 100.0 % | 2.4 | 1.59 | 2.0 | 0.00 | 52 |
| 50 | 100.0 % | 1.9 | 2.57 | 4.0 | 0.00 | 52 |
| 100 | 100.0 % | 1.9 | 3.78 | 6.0 | 0.00 | 53 |
| 250 | 100.0 % | 1.8 | 6.03 | 10.0 | 0.01 | 58 |
| 500 | 100.0 % | 1.7 | 10.19 | 18.0 | 0.02 | 62 |
| 750 | 100.0 % | 1.8 | 14.31 | 26.0 | 0.03 | 66 |
| 1000 | 100.0 % | 1.8 | 18.75 | 34.0 | 0.04 | 69 |

### node-minimal-sse

| Clients | bedient | Verbindungsaufbau (ms) | Latenz Mittel (ms) | Latenz p95 (ms) | CPU (Kerne) | Working Set gesamt (MiB) |
|---|---|---|---|---|---|---|
| 10 | 100.0 % | 2.4 | 1.64 | 2.0 | 0.00 | 54 |
| 50 | 100.0 % | 2.0 | 2.62 | 4.0 | 0.00 | 54 |
| 100 | 100.0 % | 2.1 | 3.60 | 6.0 | 0.00 | 57 |
| 250 | 100.0 % | 1.9 | 6.48 | 10.0 | 0.01 | 63 |
| 500 | 100.0 % | 1.8 | 11.14 | 19.0 | 0.02 | 70 |
| 750 | 100.0 % | 1.8 | 15.26 | 27.0 | 0.03 | 82 |
| 1000 | 100.0 % | 1.8 | 19.95 | 36.0 | 0.04 | 83 |

### node-minimal-ws

| Clients | bedient | Verbindungsaufbau (ms) | Latenz Mittel (ms) | Latenz p95 (ms) | CPU (Kerne) | Working Set gesamt (MiB) |
|---|---|---|---|---|---|---|
| 10 | 100.0 % | 2.7 | 1.57 | 2.0 | 0.00 | 51 |
| 50 | 100.0 % | 1.9 | 2.17 | 3.0 | 0.00 | 52 |
| 100 | 100.0 % | 1.8 | 3.66 | 6.0 | 0.00 | 54 |
| 250 | 100.0 % | 1.8 | 6.07 | 10.0 | 0.01 | 58 |
| 500 | 100.0 % | 1.7 | 10.08 | 18.0 | 0.02 | 62 |
| 750 | 100.0 % | 1.8 | 14.62 | 26.0 | 0.03 | 66 |
| 1000 | 100.0 % | 1.7 | 18.69 | 34.0 | 0.04 | 69 |

### php-laravel-sse

| Clients | bedient | Verbindungsaufbau (ms) | Latenz Mittel (ms) | Latenz p95 (ms) | CPU (Kerne) | Working Set gesamt (MiB) |
|---|---|---|---|---|---|---|
| 10 | 100.0 % | 8.1 | 1.46 | 2.0 | 0.00 | 1077 |
| 50 | 100.0 % | 7.0 | 2.51 | 4.0 | 0.01 | 1080 |
| 100 | 100.0 % | 7.1 | 3.23 | 5.0 | 0.01 | 1082 |
| 250 | 100.0 % | 6.8 | 5.98 | 9.0 | 0.03 | 1086 |
| 500 | 100.0 % | 6.7 | 9.90 | 17.0 | 0.07 | 1091 |
| 750 | 73.3 % | 18225.5 | 10.59 | 18.0 | 0.09 | 1095 |
| 1000 | 55.0 % | 31413.8 | 10.83 | 19.0 | 0.11 | 1097 |

### php-laravel-sse-queue

| Clients | bedient | Verbindungsaufbau (ms) | Latenz Mittel (ms) | Latenz p95 (ms) | CPU (Kerne) | Working Set gesamt (MiB) |
|---|---|---|---|---|---|---|
| 10 | 100.0 % | 8.1 | 2.92 | 3.0 | 0.00 | 1104 |
| 50 | 100.0 % | 7.2 | 3.60 | 5.0 | 0.01 | 1107 |
| 100 | 100.0 % | 7.1 | 4.28 | 6.0 | 0.02 | 1112 |
| 250 | 100.0 % | 6.8 | 6.86 | 10.0 | 0.04 | 1113 |
| 500 | 100.0 % | 6.7 | 10.88 | 18.0 | 0.07 | 1119 |
| 750 | 73.3 % | 18311.7 | 12.14 | 22.0 | 0.10 | 1122 |
| 1000 | 55.0 % | 31333.0 | 12.92 | 23.0 | 0.12 | 1125 |

### php-laravel-ws

| Clients | bedient | Verbindungsaufbau (ms) | Latenz Mittel (ms) | Latenz p95 (ms) | CPU (Kerne) | Working Set gesamt (MiB) |
|---|---|---|---|---|---|---|
| 10 | 100.0 % | 2.6 | 3.47 | 4.0 | 0.00 | 98 |
| 50 | 100.0 % | 2.4 | 4.87 | 6.0 | 0.00 | 98 |
| 100 | 100.0 % | 2.4 | 6.32 | 8.0 | 0.01 | 98 |
| 250 | 100.0 % | 2.4 | 9.36 | 12.0 | 0.01 | 99 |
| 500 | 100.0 % | 2.4 | 12.96 | 16.0 | 0.03 | 102 |
| 750 | 100.0 % | 2.7 | 16.90 | 21.0 | 0.04 | 109 |
| 1000 | 100.0 % | 3.1 | 21.31 | 31.0 | 0.06 | 116 |

### php-minimal-sse

| Clients | bedient | Verbindungsaufbau (ms) | Latenz Mittel (ms) | Latenz p95 (ms) | CPU (Kerne) | Working Set gesamt (MiB) |
|---|---|---|---|---|---|---|
| 10 | 100.0 % | 2.3 | 1.37 | 2.0 | 0.00 | 383 |
| 50 | 100.0 % | 1.9 | 2.48 | 3.0 | 0.00 | 385 |
| 100 | 100.0 % | 2.2 | 3.48 | 5.0 | 0.01 | 391 |
| 250 | 100.0 % | 1.9 | 5.93 | 9.0 | 0.02 | 394 |
| 500 | 100.0 % | 1.8 | 9.67 | 17.0 | 0.03 | 399 |
| 750 | 73.3 % | 18251.4 | 10.41 | 18.0 | 0.04 | 401 |
| 1000 | 55.0 % | 30937.1 | 10.62 | 18.0 | 0.04 | 402 |

### php-minimal-ws

| Clients | bedient | Verbindungsaufbau (ms) | Latenz Mittel (ms) | Latenz p95 (ms) | CPU (Kerne) | Working Set gesamt (MiB) |
|---|---|---|---|---|---|---|
| 10 | 100.0 % | 2.4 | 1.45 | 2.0 | 0.00 | 43 |
| 50 | 100.0 % | 2.0 | 2.56 | 3.0 | 0.00 | 44 |
| 100 | 100.0 % | 2.2 | 3.74 | 5.0 | 0.00 | 44 |
| 250 | 100.0 % | 2.1 | 6.74 | 9.0 | 0.01 | 45 |
| 500 | 100.0 % | 2.2 | 9.62 | 12.0 | 0.01 | 45 |
| 750 | 100.0 % | 2.3 | 12.15 | 16.0 | 0.02 | 51 |
| 1000 | 100.0 % | 2.6 | 15.49 | 21.0 | 0.04 | 57 |

## Sättigungstest

Eine Stufe ist bestanden, wenn im Median ihrer Läufe alle fünf Bedingungen gelten (DECISIONS.md 5.17).

1. Zustellung mindestens 99.0 % der Events zwischen dem ersten und dem letzten empfangenen Event eines Clients.
2. p95-Latenz höchstens 1000 ms.
3. Senderate der Quelle mindestens 99.0 % der eingestellten Rate.
4. Mindestens 99.0 % der Clients bedient, also mit mindestens einem Event im Messfenster.
5. Gesamtzustellung mindestens 99.0 %, also alle empfangenen Events geteilt durch Clients × Rate × Haltezeit.

War der Lastgenerator im Median mehr als 80.0 % ausgelastet oder ist seine Auslastung unbekannt, ist die Stufe nicht auswertbar. Die höchste nachhaltige Rate ist die höchste Stufe, bis zu der jede Stufe bestanden ist. „≥ … (Lastgenerator)“ heißt, dass die Reihe an einer nicht auswertbaren Stufe endete und die Grenze mindestens dort liegt. „≥ … (höchste Stufe)“ heißt, dass alle Stufen bestanden sind. „≥ …, … wegen zu niedriger Senderate nicht eindeutig bewertbar“ heißt, dass an der nächsten Stufe allein die Senderate der Quelle unter 99 % lag und alle anderen Bedingungen erfüllt waren (Regel vom 2026-11-14, DECISIONS.md 5.17).

**Primäre Einstufung.** Die höchste nachhaltige Rate ist die höchste vollständig bestandene Teststufe nach den Kriterien oben. Sie ist keine nachgewiesene technische Grenze, die echte Grenze liegt zwischen ihr und der nächsten getesteten Stufe oder darüber.

**Nachträgliche Sensitivitätsanalyse (2026-11-15, nach Sichtung der Ergebnisse).** Eine Senderate unter 99 % lässt die auf die Sollrate bezogene Gesamtzustellung zwangsläufig mit durchfallen, deshalb kann die Regel vom 2026-11-14 nicht greifen. Die Sensitivitätsanalyse bezieht die Gesamtzustellung auf die tatsächlich gesendeten Events. Sie ist nicht Teil des Hauptergebnisses und nur dort ausgefüllt, wo sie vom Hauptergebnis abweicht. Die Ursache einer zu niedrigen Senderate ist nicht bestimmt.

| Zelle | primär: höchste bestandene Stufe (Events/s) | Senderate an der Stufe, an der die Reihe endete | nachträgliche Sensitivitätsanalyse | Kampagne |
|---|---|---|---|---|
| node-express-sse | ≥ 1000 (höchste Stufe) | – | – | 2026-11-14T21-58-37-631Z_saturation-node-express-sse |
| node-express-sse-queue | 700 | 100.0 % bei 1000 | – | 2026-11-15T03-26-04-567Z_saturation-node-express-sse-queue |
| node-express-ws | 500 | 100.0 % bei 700 | – | 2026-11-15T01-52-21-143Z_saturation-node-express-ws |
| node-minimal-sse | ≥ 1000 (höchste Stufe) | – | – | 2026-11-15T01-05-33-015Z_saturation-node-minimal-sse |
| node-minimal-ws | 500 | 100.0 % bei 700 | – | 2026-11-15T02-39-13-401Z_saturation-node-minimal-ws |
| php-laravel-sse | 700 | 85.6 % bei 1000 | ≥ 700, 1000 wegen zu niedriger Senderate nicht eindeutig bewertbar | 2026-11-14T22-45-08-608Z_saturation-php-laravel-sse |
| php-laravel-sse-queue | 200 | 100.0 % bei 300 | – | 2026-11-15T04-13-10-540Z_saturation-php-laravel-sse-queue |
| php-laravel-ws | 400 | 100.0 % bei 500 | – | 2026-11-14T23-31-52-756Z_saturation-php-laravel-ws |
| php-minimal-sse | 700 | 90.4 % bei 1000 | ≥ 700, 1000 wegen zu niedriger Senderate nicht eindeutig bewertbar | 2026-11-14T21-12-07-565Z_saturation-php-minimal-sse |
| php-minimal-ws | ≥ 1000 (höchste Stufe) | – | – | 2026-11-15T00-18-46-433Z_saturation-php-minimal-ws |

### node-express-sse

| Rate (Events/s) | Senderate | bedient | Zustellung | Gesamtzustellung | Latenz p95 (ms) | Lastgenerator | CPU (Kerne) | Ergebnis |
|---|---|---|---|---|---|---|---|---|
| 10 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 3.0 | 1.1 % | 0.02 | bestanden |
| 50 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 3.0 | 1.9 % | 0.08 | bestanden |
| 100 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 3.0 | 11.3 % | 0.16 | bestanden |
| 200 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 3.0 | 24.5 % | 0.32 | bestanden |
| 300 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 3.0 | 35.3 % | 0.47 | bestanden |
| 400 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 2.0 | 21.0 % | 0.62 | bestanden |
| 500 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 3.0 | 13.3 % | 0.78 | bestanden |
| 700 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 3.0 | 21.1 % | 0.94 | bestanden |
| 1000 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 3.0 | 28.4 % | 0.96 | bestanden |

### node-express-sse-queue

| Rate (Events/s) | Senderate | bedient | Zustellung | Gesamtzustellung | Latenz p95 (ms) | Lastgenerator | CPU (Kerne) | Ergebnis |
|---|---|---|---|---|---|---|---|---|
| 10 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 4.0 | 2.3 % | 0.04 | bestanden |
| 50 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 4.0 | 6.2 % | 0.17 | bestanden |
| 100 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 4.0 | 13.6 % | 0.31 | bestanden |
| 200 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 4.0 | 25.8 % | 0.62 | bestanden |
| 300 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 4.0 | 33.8 % | 0.92 | bestanden |
| 400 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 4.0 | 15.5 % | 1.25 | bestanden |
| 500 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 5.0 | 16.6 % | 1.48 | bestanden |
| 700 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 31.0 | 20.1 % | 1.46 | bestanden |
| 1000 | 100.0 % | 100.0 % | 100.0 % | 86.3 % | 13577.0 | 23.7 % | 1.46 | nicht bestanden (p95-Latenz, Gesamtzustellung) |

### node-express-ws

| Rate (Events/s) | Senderate | bedient | Zustellung | Gesamtzustellung | Latenz p95 (ms) | Lastgenerator | CPU (Kerne) | Ergebnis |
|---|---|---|---|---|---|---|---|---|
| 10 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 3.0 | 0.9 % | 0.02 | bestanden |
| 50 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 3.0 | 11.3 % | 0.08 | bestanden |
| 100 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 3.0 | 13.9 % | 0.16 | bestanden |
| 200 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 2.0 | 23.9 % | 0.31 | bestanden |
| 300 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 3.0 | 34.3 % | 0.48 | bestanden |
| 400 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 2.0 | 22.7 % | 0.61 | bestanden |
| 500 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 26.0 | 15.8 % | 0.93 | bestanden |
| 700 | 100.0 % | 100.0 % | 100.0 % | 92.4 % | 4765.0 | 19.2 % | 0.95 | nicht bestanden (p95-Latenz, Gesamtzustellung) |
| 1000 | 100.0 % | 100.0 % | 100.0 % | 66.6 % | 18785.0 | 20.5 % | 0.97 | nicht bestanden (p95-Latenz, Gesamtzustellung) |

### node-minimal-sse

| Rate (Events/s) | Senderate | bedient | Zustellung | Gesamtzustellung | Latenz p95 (ms) | Lastgenerator | CPU (Kerne) | Ergebnis |
|---|---|---|---|---|---|---|---|---|
| 10 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 3.0 | 0.7 % | 0.02 | bestanden |
| 50 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 3.0 | 3.5 % | 0.09 | bestanden |
| 100 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 3.0 | 12.7 % | 0.17 | bestanden |
| 200 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 3.0 | 24.7 % | 0.33 | bestanden |
| 300 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 3.0 | 36.5 % | 0.49 | bestanden |
| 400 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 2.0 | 17.9 % | 0.67 | bestanden |
| 500 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 4.0 | 16.4 % | 0.91 | bestanden |
| 700 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 4.0 | 19.8 % | 0.94 | bestanden |
| 1000 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 3.0 | 27.2 % | 0.96 | bestanden |

### node-minimal-ws

| Rate (Events/s) | Senderate | bedient | Zustellung | Gesamtzustellung | Latenz p95 (ms) | Lastgenerator | CPU (Kerne) | Ergebnis |
|---|---|---|---|---|---|---|---|---|
| 10 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 3.0 | 1.7 % | 0.02 | bestanden |
| 50 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 3.0 | 11.2 % | 0.08 | bestanden |
| 100 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 3.0 | 10.0 % | 0.15 | bestanden |
| 200 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 2.0 | 23.9 % | 0.30 | bestanden |
| 300 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 2.0 | 35.1 % | 0.45 | bestanden |
| 400 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 2.0 | 25.7 % | 0.60 | bestanden |
| 500 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 6.0 | 18.9 % | 0.79 | bestanden |
| 700 | 100.0 % | 100.0 % | 100.0 % | 86.6 % | 9330.0 | 18.3 % | 0.95 | nicht bestanden (p95-Latenz, Gesamtzustellung) |
| 1000 | 100.0 % | 98.0 % | 100.0 % | 59.5 % | 22037.0 | 18.0 % | 0.97 | nicht bestanden (p95-Latenz, bediente Clients, Gesamtzustellung) |

### php-laravel-sse

| Rate (Events/s) | Senderate | bedient | Zustellung | Gesamtzustellung | Latenz p95 (ms) | Lastgenerator | CPU (Kerne) | Ergebnis |
|---|---|---|---|---|---|---|---|---|
| 10 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 3.0 | 2.7 % | 0.04 | bestanden |
| 50 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 3.0 | 8.3 % | 0.15 | bestanden |
| 100 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 3.0 | 11.6 % | 0.30 | bestanden |
| 200 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 2.0 | 24.9 % | 0.59 | bestanden |
| 300 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 2.0 | 35.8 % | 0.88 | bestanden |
| 400 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 2.0 | 31.6 % | 1.17 | bestanden |
| 500 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 3.0 | 18.5 % | 1.43 | bestanden |
| 700 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 4.0 | 23.4 % | 1.88 | bestanden |
| 1000 | 85.6 % | 100.0 % | 100.0 % | 85.6 % | 7.0 | 25.5 % | 1.79 | nicht bestanden (Senderate, Gesamtzustellung) |

### php-laravel-sse-queue

| Rate (Events/s) | Senderate | bedient | Zustellung | Gesamtzustellung | Latenz p95 (ms) | Lastgenerator | CPU (Kerne) | Ergebnis |
|---|---|---|---|---|---|---|---|---|
| 10 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 4.0 | 2.7 % | 0.06 | bestanden |
| 50 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 4.0 | 2.7 % | 0.26 | bestanden |
| 100 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 4.0 | 13.2 % | 0.51 | bestanden |
| 200 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 3.0 | 24.1 % | 1.04 | bestanden |
| 300 | 100.0 % | 100.0 % | 100.0 % | 95.7 % | 2709.0 | 36.4 % | 1.48 | nicht bestanden (p95-Latenz, Gesamtzustellung) |
| 400 | 100.0 % | 100.0 % | 100.0 % | 71.3 % | 52606.0 | 36.2 % | 1.49 | nicht bestanden (p95-Latenz, Gesamtzustellung) |
| 500 | 100.0 % | 100.0 % | 100.0 % | 56.7 % | 135452.0 | 35.6 % | 1.49 | nicht bestanden (p95-Latenz, Gesamtzustellung) |
| 700 | 71.4 % | 100.0 % | 100.0 % | 40.3 % | 249488.0 | 36.5 % | 1.49 | nicht bestanden (p95-Latenz, Senderate, Gesamtzustellung) |
| 1000 | 70.0 % | 100.0 % | 100.0 % | 27.8 % | 416697.0 | 29.5 % | 1.48 | nicht bestanden (p95-Latenz, Senderate, Gesamtzustellung) |

### php-laravel-ws

| Rate (Events/s) | Senderate | bedient | Zustellung | Gesamtzustellung | Latenz p95 (ms) | Lastgenerator | CPU (Kerne) | Ergebnis |
|---|---|---|---|---|---|---|---|---|
| 10 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 5.0 | 1.8 % | 0.03 | bestanden |
| 50 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 5.0 | 2.4 % | 0.14 | bestanden |
| 100 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 5.0 | 13.3 % | 0.29 | bestanden |
| 200 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 33.0 | 19.6 % | 0.49 | bestanden |
| 300 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 20.0 | 35.9 % | 0.82 | bestanden |
| 400 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 20.0 | 37.9 % | 0.98 | bestanden |
| 500 | 100.0 % | 100.0 % | 100.0 % | 85.4 % | 24760.0 | 39.5 % | 1.05 | nicht bestanden (p95-Latenz, Gesamtzustellung) |
| 700 | 100.0 % | 100.0 % | 100.0 % | 60.4 % | 104870.0 | 40.4 % | 1.05 | nicht bestanden (p95-Latenz, Gesamtzustellung) |
| 1000 | 85.0 % | 100.0 % | 100.0 % | 42.7 % | 219030.0 | 41.3 % | 1.06 | nicht bestanden (p95-Latenz, Senderate, Gesamtzustellung) |

### php-minimal-sse

| Rate (Events/s) | Senderate | bedient | Zustellung | Gesamtzustellung | Latenz p95 (ms) | Lastgenerator | CPU (Kerne) | Ergebnis |
|---|---|---|---|---|---|---|---|---|
| 10 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 3.0 | 2.7 % | 0.03 | bestanden |
| 50 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 3.0 | 6.5 % | 0.16 | bestanden |
| 100 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 3.0 | 11.7 % | 0.32 | bestanden |
| 200 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 3.0 | 25.7 % | 0.64 | bestanden |
| 300 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 3.0 | 36.5 % | 0.96 | bestanden |
| 400 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 2.0 | 21.0 % | 1.28 | bestanden |
| 500 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 2.0 | 19.9 % | 1.61 | bestanden |
| 700 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 6.0 | 25.3 % | 1.88 | bestanden |
| 1000 | 90.4 % | 100.0 % | 100.0 % | 90.4 % | 8.0 | 25.5 % | 1.84 | nicht bestanden (Senderate, Gesamtzustellung) |

### php-minimal-ws

| Rate (Events/s) | Senderate | bedient | Zustellung | Gesamtzustellung | Latenz p95 (ms) | Lastgenerator | CPU (Kerne) | Ergebnis |
|---|---|---|---|---|---|---|---|---|
| 10 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 3.0 | 0.7 % | 0.01 | bestanden |
| 50 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 3.0 | 9.6 % | 0.03 | bestanden |
| 100 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 3.0 | 14.5 % | 0.07 | bestanden |
| 200 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 3.0 | 25.1 % | 0.13 | bestanden |
| 300 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 3.0 | 36.3 % | 0.19 | bestanden |
| 400 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 3.0 | 42.6 % | 0.25 | bestanden |
| 500 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 3.0 | 46.9 % | 0.32 | bestanden |
| 700 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 2.0 | 40.4 % | 0.44 | bestanden |
| 1000 | 100.0 % | 100.0 % | 100.0 % | 100.0 % | 2.0 | 35.1 % | 0.62 | bestanden |

## Ansturm

Alle Clients verbinden sich im selben Moment, etwa nach einem Neustart des Servers. Jede Zelle wird einzeln gemessen. Die Speicherspitze laut Kernel ist der größte Höchstwert über die Läufe, als Summe über die Container der Zelle.

| Zelle | Clients | gültig | rechtzeitig verbunden | bedient (Median, Minimum) | Verbindungsaufbau (ms) | Latenz Mittel (ms) | Speicherspitze laut Kernel (MiB) | Gründe ungültiger Läufe |
|---|---|---|---|---|---|---|---|---|
| node-express-sse | 500 | 3/3 | 100.0 % | 100.0 %, 100.0 % | 111.9 | 11.32 | 72 | – |
| node-express-sse-queue | 500 | 3/3 | 100.0 % | 100.0 %, 100.0 % | 107.4 | 13.31 | 139 | – |
| node-express-ws | 500 | 3/3 | 100.0 % | 100.0 %, 100.0 % | 109.0 | 11.24 | 71 | – |
| node-minimal-sse | 500 | 3/3 | 100.0 % | 100.0 %, 100.0 % | 95.5 | 12.99 | 72 | – |
| node-minimal-ws | 500 | 3/3 | 100.0 % | 100.0 %, 100.0 % | 105.9 | 11.08 | 69 | – |
| php-laravel-sse | 500 | 0/3 | 0.0 % | 0.0 %, 0.0 % | – | – | – | sut_container_failed:php-laravel-fpm(OOM) (3) |
| php-laravel-sse-queue | 500 | 1/3 | 4.0 % | 0.0 %, 0.0 % | 25663.5 | 11.13 | 1279 | sut_container_failed:php-laravel-fpm-queue(OOM),php-laravel-queue-worker(OOM) (2) |
| php-laravel-ws | 500 | 3/3 | 100.0 % | 100.0 %, 100.0 % | 228.4 | 13.78 | 77 | – |
| php-minimal-sse | 500 | 3/3 | 100.0 % | 100.0 %, 100.0 % | 88.0 | 9.95 | 345 | – |
| php-minimal-ws | 500 | 3/3 | 100.0 % | 100.0 %, 100.0 % | 79.2 | 9.62 | 22 | – |

## SSE und WebSocket im Vergleich

Gleiche Sprache und Variante, unterschiedlicher Transport. Beschreibend, da die Zellen in getrennten Kampagnen gemessen werden. Gepaarte Tests zum Transport enthalten nur die Vergleiche 12 und 13 der Hauptmessung (evaluation.md).

| Variante | Kapazitätsgrenze SSE | Kapazitätsgrenze WS | höchste Rate SSE (Events/s) | höchste Rate WS (Events/s) |
|---|---|---|---|---|
| node-express | nicht erreicht | nicht erreicht | ≥ 1000 (höchste Stufe) | 500 |
| node-minimal | nicht erreicht | nicht erreicht | ≥ 1000 (höchste Stufe) | 500 |
| php-laravel | 750 | nicht erreicht | 700 | 400 |
| php-minimal | 750 | nicht erreicht | 700 | ≥ 1000 (höchste Stufe) |

„–" bedeutet: nicht gemessen.

### node-express: SSE gegen WS je Clientzahl

| Clients | bedient SSE | bedient WS | Latenz SSE (ms) | Latenz WS (ms) | Working Set SSE (MiB) | Working Set WS (MiB) |
|---|---|---|---|---|---|---|
| 10 | 100.0 % | 100.0 % | 1.59 | 1.59 | 55 | 52 |
| 50 | 100.0 % | 100.0 % | 2.59 | 2.57 | 56 | 52 |
| 100 | 100.0 % | 100.0 % | 3.66 | 3.78 | 59 | 53 |
| 250 | 100.0 % | 100.0 % | 6.11 | 6.03 | 64 | 58 |
| 500 | 100.0 % | 100.0 % | 10.63 | 10.19 | 70 | 62 |
| 750 | 100.0 % | 100.0 % | 15.19 | 14.31 | 90 | 66 |
| 1000 | 100.0 % | 100.0 % | 19.76 | 18.75 | 101 | 69 |

### node-minimal: SSE gegen WS je Clientzahl

| Clients | bedient SSE | bedient WS | Latenz SSE (ms) | Latenz WS (ms) | Working Set SSE (MiB) | Working Set WS (MiB) |
|---|---|---|---|---|---|---|
| 10 | 100.0 % | 100.0 % | 1.64 | 1.57 | 54 | 51 |
| 50 | 100.0 % | 100.0 % | 2.62 | 2.17 | 54 | 52 |
| 100 | 100.0 % | 100.0 % | 3.60 | 3.66 | 57 | 54 |
| 250 | 100.0 % | 100.0 % | 6.48 | 6.07 | 63 | 58 |
| 500 | 100.0 % | 100.0 % | 11.14 | 10.08 | 70 | 62 |
| 750 | 100.0 % | 100.0 % | 15.26 | 14.62 | 82 | 66 |
| 1000 | 100.0 % | 100.0 % | 19.95 | 18.69 | 83 | 69 |

### php-laravel: SSE gegen WS je Clientzahl

| Clients | bedient SSE | bedient WS | Latenz SSE (ms) | Latenz WS (ms) | Working Set SSE (MiB) | Working Set WS (MiB) |
|---|---|---|---|---|---|---|
| 10 | 100.0 % | 100.0 % | 1.46 | 3.47 | 1077 | 98 |
| 50 | 100.0 % | 100.0 % | 2.51 | 4.87 | 1080 | 98 |
| 100 | 100.0 % | 100.0 % | 3.23 | 6.32 | 1082 | 98 |
| 250 | 100.0 % | 100.0 % | 5.98 | 9.36 | 1086 | 99 |
| 500 | 100.0 % | 100.0 % | 9.90 | 12.96 | 1091 | 102 |
| 750 | 73.3 % | 100.0 % | 10.59 | 16.90 | 1095 | 109 |
| 1000 | 55.0 % | 100.0 % | 10.83 | 21.31 | 1097 | 116 |

### php-minimal: SSE gegen WS je Clientzahl

| Clients | bedient SSE | bedient WS | Latenz SSE (ms) | Latenz WS (ms) | Working Set SSE (MiB) | Working Set WS (MiB) |
|---|---|---|---|---|---|---|
| 10 | 100.0 % | 100.0 % | 1.37 | 1.45 | 383 | 43 |
| 50 | 100.0 % | 100.0 % | 2.48 | 2.56 | 385 | 44 |
| 100 | 100.0 % | 100.0 % | 3.48 | 3.74 | 391 | 44 |
| 250 | 100.0 % | 100.0 % | 5.93 | 6.74 | 394 | 45 |
| 500 | 100.0 % | 100.0 % | 9.67 | 9.62 | 399 | 45 |
| 750 | 73.3 % | 100.0 % | 10.41 | 12.15 | 401 | 51 |
| 1000 | 55.0 % | 100.0 % | 10.62 | 15.49 | 402 | 57 |
