# Beschreibende Auswertung von Block 2

Ersetzt durch die dokumentierte Wiederholung (DECISIONS.md 5.14): b2-c02-baseline durch rerun-b2-c02-baseline.

Erzeugt am 2026-11-15T12:18:37.812Z mit `tools/orchestrate/descriptive.js` aus den Laufprotokollen. Nur beschreibend, ohne Tests. Tests und Bewertung der Hypothesen stehen in `evaluation.md`.

Werte je Variante und Laststufe über alle gültigen gewerteten Läufe von Block 2. Eine Variante, die in mehreren Vergleichen vorkommt, geht mit allen ihren Läufen ein. Perzentile nach der Methode des nächsten Rangs wie in `stats.js`.

## a) Verteilung der Lauf-Werte

### Latenz, Mittel je Lauf (ms)

| Variante | Laststufe | Läufe | Median | Mittelwert | p95 | p99 |
|---|---|---|---|---|---|---|
| node-express-sse | baseline | 270 | 1.444 | 1.452 | 1.590 | 1.715 |
| node-express-sse | medium | 270 | 2.478 | 2.484 | 2.650 | 2.711 |
| node-express-sse | stress | 270 | 11.084 | 11.416 | 13.362 | 13.511 |
| node-express-sse-queue | baseline | 180 | 2.490 | 2.501 | 2.640 | 2.822 |
| node-express-sse-queue | medium | 180 | 3.578 | 3.577 | 3.774 | 3.888 |
| node-express-sse-queue | stress | 180 | 12.992 | 13.117 | 14.735 | 14.991 |
| node-express-ws | baseline | 180 | 1.438 | 1.441 | 1.563 | 1.623 |
| node-express-ws | medium | 180 | 2.447 | 2.443 | 2.583 | 2.714 |
| node-express-ws | stress | 180 | 10.785 | 11.162 | 13.243 | 13.319 |
| node-minimal-sse | baseline | 270 | 1.440 | 1.440 | 1.543 | 1.588 |
| node-minimal-sse | medium | 270 | 2.442 | 2.447 | 2.577 | 2.652 |
| node-minimal-sse | stress | 270 | 11.502 | 11.909 | 13.945 | 14.076 |
| node-minimal-ws | baseline | 270 | 1.433 | 1.432 | 1.552 | 1.637 |
| node-minimal-ws | medium | 270 | 2.384 | 2.387 | 2.509 | 2.536 |
| node-minimal-ws | stress | 270 | 10.120 | 10.572 | 12.378 | 13.064 |
| php-laravel-sse | baseline | 270 | 1.461 | 1.462 | 1.607 | 1.675 |
| php-laravel-sse | medium | 270 | 2.438 | 2.428 | 2.594 | 2.652 |
| php-laravel-sse | stress | 270 | 9.788 | 9.805 | 10.140 | 10.306 |
| php-laravel-sse-queue | baseline | 180 | 2.593 | 2.620 | 2.968 | 3.008 |
| php-laravel-sse-queue | medium | 180 | 3.514 | 3.520 | 3.815 | 3.894 |
| php-laravel-sse-queue | stress | 180 | 10.794 | 10.854 | 11.373 | 11.707 |
| php-laravel-ws | baseline | 180 | 3.562 | 3.551 | 3.687 | 3.762 |
| php-laravel-ws | medium | 180 | 4.724 | 4.719 | 4.867 | 4.944 |
| php-laravel-ws | stress | 180 | 13.213 | 13.209 | 13.618 | 13.819 |
| php-minimal-sse | baseline | 270 | 1.433 | 1.448 | 1.587 | 1.670 |
| php-minimal-sse | medium | 270 | 2.433 | 2.435 | 2.569 | 2.651 |
| php-minimal-sse | stress | 270 | 9.524 | 9.524 | 9.966 | 10.382 |
| php-minimal-ws | baseline | 270 | 1.483 | 1.485 | 1.620 | 1.670 |
| php-minimal-ws | medium | 270 | 2.516 | 2.514 | 2.637 | 2.710 |
| php-minimal-ws | stress | 270 | 9.231 | 9.307 | 10.063 | 10.229 |

### Verbindungsaufbau, Mittel je Lauf (ms)

| Variante | Laststufe | Läufe | Median | Mittelwert | p95 | p99 |
|---|---|---|---|---|---|---|
| node-express-sse | baseline | 270 | 2.50 | 2.54 | 2.90 | 3.10 |
| node-express-sse | medium | 270 | 2.02 | 2.04 | 2.26 | 2.42 |
| node-express-sse | stress | 270 | 1.81 | 1.81 | 1.91 | 1.97 |
| node-express-sse-queue | baseline | 180 | 2.50 | 2.51 | 2.90 | 3.00 |
| node-express-sse-queue | medium | 180 | 2.06 | 2.08 | 2.30 | 2.48 |
| node-express-sse-queue | stress | 180 | 1.82 | 1.82 | 1.90 | 1.97 |
| node-express-ws | baseline | 180 | 2.40 | 2.42 | 2.80 | 2.90 |
| node-express-ws | medium | 180 | 1.93 | 1.96 | 2.24 | 2.36 |
| node-express-ws | stress | 180 | 1.72 | 1.72 | 1.80 | 1.86 |
| node-minimal-sse | baseline | 270 | 2.40 | 2.40 | 2.70 | 2.80 |
| node-minimal-sse | medium | 270 | 1.94 | 1.95 | 2.18 | 2.30 |
| node-minimal-sse | stress | 270 | 1.78 | 1.78 | 1.88 | 1.91 |
| node-minimal-ws | baseline | 270 | 2.40 | 2.40 | 2.70 | 2.90 |
| node-minimal-ws | medium | 270 | 1.92 | 1.94 | 2.24 | 2.34 |
| node-minimal-ws | stress | 270 | 1.70 | 1.70 | 1.80 | 1.87 |
| php-laravel-sse | baseline | 270 | 8.00 | 8.04 | 8.40 | 8.50 |
| php-laravel-sse | medium | 270 | 7.00 | 7.00 | 7.20 | 7.28 |
| php-laravel-sse | stress | 270 | 6.75 | 6.75 | 6.85 | 6.89 |
| php-laravel-sse-queue | baseline | 180 | 8.10 | 8.05 | 8.40 | 8.50 |
| php-laravel-sse-queue | medium | 180 | 7.08 | 7.05 | 7.24 | 7.36 |
| php-laravel-sse-queue | stress | 180 | 6.76 | 6.77 | 6.88 | 6.94 |
| php-laravel-ws | baseline | 180 | 2.80 | 2.82 | 3.10 | 3.30 |
| php-laravel-ws | medium | 180 | 2.34 | 2.34 | 2.52 | 2.82 |
| php-laravel-ws | stress | 180 | 2.43 | 2.44 | 2.52 | 2.58 |
| php-minimal-sse | baseline | 270 | 2.30 | 2.27 | 2.60 | 2.80 |
| php-minimal-sse | medium | 270 | 1.88 | 1.90 | 2.14 | 2.22 |
| php-minimal-sse | stress | 270 | 1.76 | 1.76 | 1.83 | 1.85 |
| php-minimal-ws | baseline | 270 | 2.50 | 2.50 | 2.80 | 3.00 |
| php-minimal-ws | medium | 270 | 2.02 | 2.05 | 2.34 | 2.44 |
| php-minimal-ws | stress | 270 | 2.10 | 2.11 | 2.20 | 2.27 |

### CPU-Zeit von Variante und Redis (s)

| Variante | Laststufe | Läufe | Median | Mittelwert | p95 | p99 |
|---|---|---|---|---|---|---|
| node-express-sse | baseline | 270 | 0.120 | 0.122 | 0.139 | 0.152 |
| node-express-sse | medium | 270 | 0.256 | 0.260 | 0.287 | 0.317 |
| node-express-sse | stress | 270 | 1.621 | 1.663 | 1.962 | 1.995 |
| node-express-sse-queue | baseline | 180 | 0.286 | 0.292 | 0.335 | 0.361 |
| node-express-sse-queue | medium | 180 | 0.450 | 0.456 | 0.505 | 0.517 |
| node-express-sse-queue | stress | 180 | 1.904 | 1.936 | 2.178 | 2.220 |
| node-express-ws | baseline | 180 | 0.125 | 0.126 | 0.142 | 0.152 |
| node-express-ws | medium | 180 | 0.261 | 0.264 | 0.298 | 0.311 |
| node-express-ws | stress | 180 | 1.597 | 1.653 | 1.960 | 2.015 |
| node-minimal-sse | baseline | 270 | 0.116 | 0.117 | 0.129 | 0.146 |
| node-minimal-sse | medium | 270 | 0.245 | 0.252 | 0.280 | 0.308 |
| node-minimal-sse | stress | 270 | 1.644 | 1.697 | 1.998 | 2.049 |
| node-minimal-ws | baseline | 270 | 0.121 | 0.123 | 0.136 | 0.144 |
| node-minimal-ws | medium | 270 | 0.243 | 0.249 | 0.278 | 0.288 |
| node-minimal-ws | stress | 270 | 1.495 | 1.555 | 1.873 | 2.003 |
| php-laravel-sse | baseline | 270 | 0.201 | 0.202 | 0.210 | 0.223 |
| php-laravel-sse | medium | 270 | 0.646 | 0.647 | 0.659 | 0.669 |
| php-laravel-sse | stress | 270 | 5.652 | 5.652 | 5.691 | 5.722 |
| php-laravel-sse-queue | baseline | 180 | 0.394 | 0.395 | 0.402 | 0.405 |
| php-laravel-sse-queue | medium | 180 | 0.851 | 0.852 | 0.864 | 0.877 |
| php-laravel-sse-queue | stress | 180 | 5.930 | 5.926 | 5.983 | 6.005 |
| php-laravel-ws | baseline | 180 | 0.268 | 0.268 | 0.275 | 0.288 |
| php-laravel-ws | medium | 180 | 0.383 | 0.383 | 0.394 | 0.402 |
| php-laravel-ws | stress | 180 | 1.885 | 1.930 | 2.157 | 2.188 |
| php-minimal-sse | baseline | 270 | 0.143 | 0.143 | 0.147 | 0.165 |
| php-minimal-sse | medium | 270 | 0.389 | 0.390 | 0.399 | 0.406 |
| php-minimal-sse | stress | 270 | 3.144 | 3.148 | 3.200 | 3.242 |
| php-minimal-ws | baseline | 270 | 0.106 | 0.107 | 0.115 | 0.123 |
| php-minimal-ws | medium | 270 | 0.184 | 0.184 | 0.206 | 0.209 |
| php-minimal-ws | stress | 270 | 1.152 | 1.189 | 1.431 | 1.445 |

### Spitze des Working Sets von Variante und Redis (MiB)

| Variante | Laststufe | Läufe | Median | Mittelwert | p95 | p99 |
|---|---|---|---|---|---|---|
| node-express-sse | baseline | 270 | 87.1 | 86.7 | 90.0 | 91.1 |
| node-express-sse | medium | 270 | 90.0 | 79.9 | 92.1 | 92.6 |
| node-express-sse | stress | 270 | 66.6 | 76.8 | 99.3 | 99.8 |
| node-express-sse-queue | baseline | 180 | 112.5 | 113.4 | 127.7 | 128.9 |
| node-express-sse-queue | medium | 180 | 111.0 | 113.7 | 131.7 | 132.2 |
| node-express-sse-queue | stress | 180 | 123.7 | 123.5 | 138.6 | 139.8 |
| node-express-ws | baseline | 180 | 65.0 | 65.0 | 82.5 | 83.1 |
| node-express-ws | medium | 180 | 55.0 | 54.4 | 56.8 | 57.2 |
| node-express-ws | stress | 180 | 74.9 | 74.9 | 92.4 | 93.2 |
| node-minimal-sse | baseline | 270 | 85.2 | 86.0 | 91.1 | 91.6 |
| node-minimal-sse | medium | 270 | 88.8 | 79.3 | 90.0 | 90.8 |
| node-minimal-sse | stress | 270 | 93.8 | 83.7 | 97.1 | 97.8 |
| node-minimal-ws | baseline | 270 | 47.7 | 57.9 | 81.8 | 82.3 |
| node-minimal-ws | medium | 270 | 58.0 | 65.1 | 86.5 | 87.1 |
| node-minimal-ws | stress | 270 | 57.5 | 68.0 | 90.7 | 91.0 |
| php-laravel-sse | baseline | 270 | 1139.6 | 1141.9 | 1175.1 | 1177.7 |
| php-laravel-sse | medium | 270 | 1118.2 | 1112.3 | 1135.1 | 1137.1 |
| php-laravel-sse | stress | 270 | 1097.2 | 1097.5 | 1117.4 | 1119.5 |
| php-laravel-sse-queue | baseline | 180 | 1158.4 | 1160.3 | 1170.8 | 1172.0 |
| php-laravel-sse-queue | medium | 180 | 1128.8 | 1129.1 | 1151.7 | 1153.2 |
| php-laravel-sse-queue | stress | 180 | 1141.1 | 1141.2 | 1160.6 | 1162.2 |
| php-laravel-ws | baseline | 180 | 126.2 | 126.3 | 126.6 | 126.9 |
| php-laravel-ws | medium | 180 | 96.7 | 96.1 | 98.3 | 98.6 |
| php-laravel-ws | stress | 180 | 112.2 | 112.0 | 129.0 | 129.2 |
| php-minimal-sse | baseline | 270 | 415.0 | 408.3 | 419.3 | 419.4 |
| php-minimal-sse | medium | 270 | 417.6 | 410.2 | 420.2 | 420.2 |
| php-minimal-sse | stress | 270 | 400.4 | 408.7 | 429.6 | 429.8 |
| php-minimal-ws | baseline | 270 | 46.0 | 51.0 | 72.3 | 72.5 |
| php-minimal-ws | medium | 270 | 51.6 | 56.0 | 72.6 | 72.7 |
| php-minimal-ws | stress | 270 | 41.7 | 43.5 | 47.9 | 48.2 |

### Latenz innerhalb der Läufe (ms)

Median über die Läufe von Median, p95 und p99 der Events eines Laufs.

| Variante | Laststufe | Läufe | Median | p95 | p99 |
|---|---|---|---|---|---|
| node-express-sse | baseline | 270 | 1.0 | 2.0 | 2.0 |
| node-express-sse | medium | 270 | 3.0 | 4.0 | 4.0 |
| node-express-sse | stress | 270 | 11.0 | 19.0 | 20.0 |
| node-express-sse-queue | baseline | 180 | 2.0 | 3.0 | 3.0 |
| node-express-sse-queue | medium | 180 | 4.0 | 5.0 | 6.0 |
| node-express-sse-queue | stress | 180 | 13.0 | 22.0 | 23.0 |
| node-express-ws | baseline | 180 | 1.0 | 2.0 | 2.0 |
| node-express-ws | medium | 180 | 2.0 | 4.0 | 4.0 |
| node-express-ws | stress | 180 | 11.0 | 19.0 | 20.0 |
| node-minimal-sse | baseline | 270 | 1.0 | 2.0 | 2.0 |
| node-minimal-sse | medium | 270 | 2.0 | 4.0 | 4.0 |
| node-minimal-sse | stress | 270 | 11.0 | 20.0 | 21.0 |
| node-minimal-ws | baseline | 270 | 1.0 | 2.0 | 2.0 |
| node-minimal-ws | medium | 270 | 2.0 | 4.0 | 4.0 |
| node-minimal-ws | stress | 270 | 10.0 | 18.0 | 19.0 |
| php-laravel-sse | baseline | 270 | 1.0 | 2.0 | 2.0 |
| php-laravel-sse | medium | 270 | 2.0 | 4.0 | 4.0 |
| php-laravel-sse | stress | 270 | 9.0 | 17.0 | 18.0 |
| php-laravel-sse-queue | baseline | 180 | 3.0 | 3.0 | 3.0 |
| php-laravel-sse-queue | medium | 180 | 4.0 | 5.0 | 6.0 |
| php-laravel-sse-queue | stress | 180 | 11.0 | 18.0 | 19.0 |
| php-laravel-ws | baseline | 180 | 4.0 | 4.0 | 4.0 |
| php-laravel-ws | medium | 180 | 5.0 | 6.0 | 6.0 |
| php-laravel-ws | stress | 180 | 14.0 | 16.0 | 18.0 |
| php-minimal-sse | baseline | 270 | 1.0 | 2.0 | 2.0 |
| php-minimal-sse | medium | 270 | 2.0 | 4.0 | 4.0 |
| php-minimal-sse | stress | 270 | 9.0 | 17.0 | 17.0 |
| php-minimal-ws | baseline | 270 | 1.0 | 2.0 | 2.0 |
| php-minimal-ws | medium | 270 | 3.0 | 3.0 | 4.0 |
| php-minimal-ws | stress | 270 | 9.0 | 12.0 | 15.0 |

## b) CPU-Zeit von Variante und Redis

Grundlast von Redis ohne Clients und ohne Ereignisquelle, gemessen auf dem Pi:

| Datei | Healthcheck | Dauer (s) | CPU-Zeit der cgroup (ms) | davon redis-server (ms) | übrige Prozesse (ms) | laufende Container |
|---|---|---|---|---|---|---|
| 2026-10-31T14-13-34Z_redis-idle.json | alle 2 s | 60 | 629 | 50 | 579 | eda-thesis-nginx-1,eda-thesis-node-minimal-sse-1,eda-thesis-php-minimal-fpm-1,eda-thesis-redis-1,eda-thesis-resource-sampler-1 |
| 2026-10-31T14-39-34Z_redis-idle.json | nur beim Start alle 2 s, danach stündlich | 60 | 45 | 50 | -5 | eda-thesis-redis-1 |

Der Prozesswert von `redis-server` hat eine Auflösung von 10 ms, deshalb kann „übrige Prozesse“ leicht negativ sein. Der Messung mit dem alten Healthcheck liefen weitere Container mit, ohne Clients und ohne Ereignisquelle.

Geschätzte Grundlast je Lauf = Grundlast der cgroup mit neuem Healthcheck (45 ms in 60 s) mal Dauer des Laufs. Verteilung = CPU-Zeit von Redis minus diese Grundlast. Die Zerlegung nimmt an, dass die Grundlast gleich bleibt und sich zur Arbeit für die Verteilung addiert. Die Bewertung von H8 bleibt davon unberührt.

| Variante | Laststufe | Läufe | CPU Variante (s) | CPU Redis (s) | Anteil Redis | Grundlast Redis (s) | Redis ohne Grundlast (s) | Anteil Redis ohne Grundlast |
|---|---|---|---|---|---|---|---|---|
| node-express-sse | baseline | 270 | 0.046 | 0.072 | 61.4 % | 0.054 | 0.018 | 15.4 % |
| node-express-sse | medium | 270 | 0.177 | 0.077 | 30.4 % | 0.054 | 0.023 | 9.0 % |
| node-express-sse | stress | 270 | 1.534 | 0.083 | 5.1 % | 0.054 | 0.028 | 1.7 % |
| node-express-sse-queue | baseline | 180 | 0.149 | 0.135 | 47.5 % | 0.054 | 0.081 | 28.3 % |
| node-express-sse-queue | medium | 180 | 0.309 | 0.142 | 31.5 % | 0.054 | 0.088 | 19.6 % |
| node-express-sse-queue | stress | 180 | 1.755 | 0.146 | 7.7 % | 0.054 | 0.092 | 4.9 % |
| node-express-ws | baseline | 180 | 0.051 | 0.073 | 58.7 % | 0.054 | 0.019 | 15.3 % |
| node-express-ws | medium | 180 | 0.183 | 0.077 | 29.8 % | 0.054 | 0.024 | 9.0 % |
| node-express-ws | stress | 180 | 1.513 | 0.082 | 5.2 % | 0.054 | 0.028 | 1.7 % |
| node-minimal-sse | baseline | 270 | 0.044 | 0.071 | 61.6 % | 0.054 | 0.017 | 14.6 % |
| node-minimal-sse | medium | 270 | 0.169 | 0.076 | 30.8 % | 0.054 | 0.021 | 8.6 % |
| node-minimal-sse | stress | 270 | 1.559 | 0.083 | 5.0 % | 0.054 | 0.028 | 1.7 % |
| node-minimal-ws | baseline | 270 | 0.049 | 0.072 | 59.5 % | 0.054 | 0.018 | 14.5 % |
| node-minimal-ws | medium | 270 | 0.166 | 0.076 | 31.5 % | 0.054 | 0.022 | 9.2 % |
| node-minimal-ws | stress | 270 | 1.412 | 0.082 | 5.5 % | 0.054 | 0.028 | 1.8 % |
| php-laravel-sse | baseline | 270 | 0.114 | 0.087 | 43.4 % | 0.054 | 0.033 | 16.4 % |
| php-laravel-sse | medium | 270 | 0.496 | 0.149 | 23.1 % | 0.054 | 0.095 | 14.7 % |
| php-laravel-sse | stress | 270 | 4.860 | 0.787 | 13.9 % | 0.054 | 0.732 | 13.0 % |
| php-laravel-sse-queue | baseline | 180 | 0.265 | 0.129 | 32.9 % | 0.054 | 0.075 | 19.1 % |
| php-laravel-sse-queue | medium | 180 | 0.658 | 0.193 | 22.7 % | 0.054 | 0.138 | 16.3 % |
| php-laravel-sse-queue | stress | 180 | 5.068 | 0.850 | 14.3 % | 0.054 | 0.795 | 13.4 % |
| php-laravel-ws | baseline | 180 | 0.192 | 0.076 | 28.5 % | 0.054 | 0.022 | 8.4 % |
| php-laravel-ws | medium | 180 | 0.304 | 0.078 | 20.6 % | 0.054 | 0.025 | 6.5 % |
| php-laravel-ws | stress | 180 | 1.801 | 0.084 | 4.4 % | 0.054 | 0.030 | 1.6 % |
| php-minimal-sse | baseline | 270 | 0.057 | 0.086 | 60.2 % | 0.054 | 0.032 | 22.2 % |
| php-minimal-sse | medium | 270 | 0.242 | 0.146 | 37.5 % | 0.054 | 0.092 | 23.6 % |
| php-minimal-sse | stress | 270 | 2.394 | 0.742 | 23.7 % | 0.054 | 0.688 | 22.0 % |
| php-minimal-ws | baseline | 270 | 0.034 | 0.071 | 67.8 % | 0.054 | 0.017 | 16.3 % |
| php-minimal-ws | medium | 270 | 0.107 | 0.075 | 41.5 % | 0.054 | 0.021 | 11.6 % |
| php-minimal-ws | stress | 270 | 1.069 | 0.082 | 7.1 % | 0.054 | 0.028 | 2.5 % |

## c) Läufe deutlich über den übrigen

Als auffällig gilt ein Lauf, dessen Latenz-Mittel mehr als 1 ms über dem Median derselben Konfiguration in derselben Kampagne liegt. Zum Vergleich steht die Zahl nach dem Kriterium „mehr als 12 % über dem Median“, mit dem DECISIONS.md 5.14 den Befund beschrieben hat. Aufgeführt sind alle Konfigurationen mit mindestens einem solchen Lauf.

| Kampagne | Variante | Position | Partner | Läufe | über +1 ms | über +12 % | Latenz übrige / auffällige (ms) | CPU Variante übrige / auffällige (s) | Laufnummern der auffälligen | Anteil in Drittel 1, 2, 3 |
|---|---|---|---|---|---|---|---|---|---|---|
| b2-c07-baseline | php-minimal-sse | A | php-laravel-sse | 90 | 0 | 2 | 1.45 / – | 0.056 / – | – | 0, 0, 0 |
| b2-c07-baseline | php-laravel-sse | B | php-minimal-sse | 90 | 0 | 2 | 1.46 / – | 0.113 / – | – | 0, 0, 0 |
| b2-c01-stress | node-minimal-sse | A | php-minimal-sse | 90 | 14 | 14 | 11.44 / 13.88 | 1.546 / 1.896 | 9, 18, 22, 24, 29, 34, 37, 41, 49, 50, 56, 80, 88, 91 | 6, 5, 3 |
| b2-c01-stress | php-minimal-sse | B | node-minimal-sse | 90 | 2 | 2 | 9.27 / 10.56 | 2.439 / 2.395 | 44, 46 | 0, 2, 0 |
| b2-c04-stress | node-express-ws | A | php-laravel-ws | 90 | 21 | 21 | 10.82 / 13.23 | 1.517 / 1.849 | 10, 21, 29, 30, 42, 45, 48, 49, 50, 51, 53, 54, 56, 58, 59, 62, 63, 74, 78, 81, 84 | 4, 13, 4 |
| b2-c12-baseline | node-minimal-sse | A | node-minimal-ws | 90 | 0 | 1 | 1.45 / – | 0.044 / – | – | 0, 0, 0 |
| b2-c12-baseline | node-minimal-ws | B | node-minimal-sse | 90 | 0 | 2 | 1.44 / – | 0.050 / – | – | 0, 0, 0 |
| b2-c03-baseline | node-express-sse | A | php-laravel-sse | 90 | 0 | 1 | 1.43 / – | 0.043 / – | – | 0, 0, 0 |
| b2-c03-baseline | php-laravel-sse | B | node-express-sse | 90 | 0 | 1 | 1.46 / – | 0.114 / – | – | 0, 0, 0 |
| b2-c09-baseline | node-express-sse | A | node-express-sse-queue | 90 | 0 | 7 | 1.48 / – | 0.047 / – | – | 0, 0, 0 |
| b2-c09-baseline | node-express-sse-queue | B | node-express-sse | 90 | 0 | 2 | 2.49 / – | 0.156 / – | – | 0, 0, 0 |
| b2-c09-stress | node-express-sse | A | node-express-sse-queue | 90 | 9 | 9 | 10.89 / 13.22 | 1.516 / 1.865 | 26, 28, 30, 35, 60, 69, 77, 79, 88 | 4, 1, 4 |
| b2-c09-stress | node-express-sse-queue | B | node-express-sse | 90 | 23 | 18 | 12.23 / 14.22 | 1.674 / 1.972 | 10, 20, 23, 25, 29, 31, 33, 34, 37, 38, 39, 41, 44, 54, 69, 72, 73, 75, 77, 79, 80, 83, 93 | 8, 6, 9 |
| b2-c08-baseline | php-minimal-ws | A | php-laravel-ws | 90 | 0 | 1 | 1.49 / – | 0.035 / – | – | 0, 0, 0 |
| b2-c12-stress | node-minimal-sse | A | node-minimal-ws | 90 | 21 | 19 | 11.55 / 13.94 | 1.562 / 1.909 | 7, 10, 16, 17, 18, 21, 22, 32, 33, 35, 36, 37, 39, 41, 44, 47, 50, 53, 78, 87, 89 | 10, 8, 3 |
| b2-c12-stress | node-minimal-ws | B | node-minimal-sse | 90 | 19 | 18 | 9.99 / 12.31 | 1.381 / 1.714 | 9, 13, 17, 18, 33, 40, 51, 54, 59, 63, 68, 73, 75, 76, 78, 79, 84, 87, 93 | 5, 5, 9 |
| b2-c10-medium | php-laravel-sse | A | php-laravel-sse-queue | 90 | 0 | 1 | 2.47 / – | 0.496 / – | – | 0, 0, 0 |
| b2-c10-baseline | php-laravel-sse | A | php-laravel-sse-queue | 90 | 0 | 4 | 1.46 / – | 0.113 / – | – | 0, 0, 0 |
| b2-c10-baseline | php-laravel-sse-queue | B | php-laravel-sse | 90 | 0 | 5 | 2.64 / – | 0.266 / – | – | 0, 0, 0 |
| b2-c11-stress | node-express-sse-queue | A | php-laravel-sse-queue | 90 | 16 | 5 | 13.13 / 14.77 | 1.780 / 1.983 | 14, 17, 39, 45, 47, 49, 51, 55, 60, 62, 71, 75, 85, 88, 90, 93 | 2, 8, 6 |
| b2-c11-stress | php-laravel-sse-queue | B | node-express-sse-queue | 90 | 1 | 0 | 10.77 / 12.04 | 5.053 / 5.001 | 26 | 1, 0, 0 |
| b2-c11-baseline | php-laravel-sse-queue | B | node-express-sse-queue | 90 | 0 | 11 | 2.58 / – | 0.263 / – | – | 0, 0, 0 |
| b2-c01-medium | php-minimal-sse | B | node-minimal-sse | 90 | 0 | 1 | 2.42 / – | 0.243 / – | – | 0, 0, 0 |
| b2-c13-baseline | php-minimal-sse | A | php-minimal-ws | 90 | 0 | 1 | 1.48 / – | 0.057 / – | – | 0, 0, 0 |
| b2-c13-baseline | php-minimal-ws | B | php-minimal-sse | 90 | 0 | 2 | 1.48 / – | 0.032 / – | – | 0, 0, 0 |
| b2-c02-stress | node-minimal-ws | A | php-minimal-ws | 90 | 19 | 19 | 10.01 / 12.26 | 1.403 / 1.745 | 8, 10, 11, 18, 24, 31, 33, 35, 38, 42, 47, 63, 70, 71, 72, 73, 76, 79, 91 | 8, 4, 7 |
| b2-c02-stress | php-minimal-ws | B | node-minimal-ws | 90 | 1 | 0 | 9.23 / 10.29 | 1.069 / 1.352 | 49 | 0, 1, 0 |
| b2-c03-stress | node-express-sse | A | php-laravel-sse | 90 | 21 | 20 | 10.76 / 13.03 | 1.475 / 1.816 | 8, 9, 11, 18, 26, 30, 32, 34, 35, 36, 37, 44, 52, 55, 62, 64, 80, 83, 85, 88, 93 | 9, 7, 5 |
| b2-c05-stress | node-minimal-sse | A | node-express-sse | 90 | 17 | 14 | 11.42 / 13.69 | 1.532 / 1.854 | 8, 11, 26, 34, 36, 40, 46, 53, 55, 58, 60, 72, 76, 77, 81, 91, 93 | 4, 7, 6 |
| b2-c05-stress | node-express-sse | B | node-minimal-sse | 90 | 21 | 19 | 11.36 / 13.38 | 1.558 / 1.869 | 6, 16, 17, 20, 21, 22, 24, 29, 30, 44, 51, 59, 63, 70, 71, 74, 80, 82, 83, 94, 95 | 9, 4, 8 |
| b2-c13-stress | php-minimal-sse | A | php-minimal-ws | 90 | 1 | 1 | 9.51 / 10.86 | 2.371 / 2.329 | 92 | 0, 0, 1 |
| b2-c06-stress | node-minimal-ws | A | node-express-ws | 90 | 18 | 18 | 10.09 / 12.23 | 1.393 / 1.721 | 6, 11, 16, 37, 39, 41, 46, 54, 55, 62, 64, 73, 76, 82, 85, 86, 88, 92 | 3, 8, 7 |
| b2-c06-stress | node-express-ws | B | node-minimal-ws | 90 | 22 | 18 | 10.47 / 12.64 | 1.464 / 1.786 | 7, 12, 15, 17, 19, 28, 31, 33, 42, 43, 49, 53, 58, 60, 63, 67, 74, 76, 78, 81, 82, 94 | 8, 7, 7 |
| rerun-b2-c02-baseline | node-minimal-ws | A | php-minimal-ws | 90 | 0 | 3 | 1.46 / – | 0.046 / – | – | 0, 0, 0 |
| rerun-b2-c02-baseline | php-minimal-ws | B | node-minimal-ws | 90 | 0 | 2 | 1.48 / – | 0.034 / – | – | 0, 0, 0 |

Weitere Werte der Laufprotokolle, Median der übrigen gegenüber Median der auffälligen Läufe, je Konfiguration mit mindestens 5 auffälligen Läufen. Sie sind Hinweise, keine Ursache.

| Kampagne | Variante | p99 (ms) | Max (ms) | Aufbau (ms) | Working Set (MiB) | CPU Redis (s) | Lastgenerator (%) | Temperatur (°C) | Bytes je s |
|---|---|---|---|---|---|---|---|---|---|
| b2-c01-stress | node-minimal-sse | 21.00 / 26.00 | 22.00 / 27.00 | 1.78 / 1.79 | 43.54 / 44.36 | 0.08 / 0.08 | 1.04 / 1.06 | 50.15 / 50.70 | 79164.71 / 79156.81 |
| b2-c04-stress | node-express-ws | 20.00 / 25.00 | 21.00 / 26.00 | 1.72 / 1.74 | 39.97 / 40.00 | 0.08 / 0.08 | 1.06 / 1.03 | 50.15 / 49.60 | 73711.70 / 73709.99 |
| b2-c09-stress | node-express-sse | 20.00 / 25.00 | 21.00 / 27.00 | 1.79 / 1.82 | 47.51 / 47.14 | 0.09 / 0.09 | 1.03 / 0.97 | 50.15 / 50.15 | 78351.81 / 78346.59 |
| b2-c09-stress | node-express-sse-queue | 21.00 / 26.00 | 22.00 / 28.00 | 1.81 / 1.82 | 84.85 / 85.89 | 0.14 / 0.15 | 1.05 / 1.04 | 50.15 / 50.15 | 92436.81 / 92426.67 |
| b2-c12-stress | node-minimal-sse | 21.00 / 26.00 | 22.00 / 27.00 | 1.77 / 1.81 | 43.42 / 43.46 | 0.08 / 0.08 | 1.07 / 1.10 | 50.15 / 50.70 | 79164.10 / 79153.74 |
| b2-c12-stress | node-minimal-ws | 18.00 / 24.00 | 20.00 / 25.00 | 1.70 / 1.70 | 38.83 / 39.18 | 0.08 / 0.08 | 1.12 / 1.08 | 50.15 / 50.70 | 73841.83 / 73708.26 |
| b2-c11-stress | node-express-sse-queue | 23.00 / 27.00 | 27.00 / 28.00 | 1.81 / 1.83 | 87.43 / 87.21 | 0.15 / 0.15 | 1.05 / 1.08 | 49.88 / 49.88 | 92430.57 / 92429.53 |
| b2-c02-stress | node-minimal-ws | 18.00 / 24.00 | 20.00 / 25.00 | 1.69 / 1.74 | 38.79 / 38.99 | 0.08 / 0.08 | 1.01 / 1.00 | 50.15 / 49.60 | 73706.97 / 73599.91 |
| b2-c03-stress | node-express-sse | 19.00 / 24.00 | 21.00 / 25.00 | 1.79 / 1.85 | 47.60 / 47.56 | 0.08 / 0.08 | 1.04 / 1.06 | 49.60 / 49.60 | 79327.03 / 79324.46 |
| b2-c05-stress | node-minimal-sse | 21.00 / 25.00 | 22.00 / 27.00 | 1.77 / 1.80 | 43.07 / 42.79 | 0.08 / 0.08 | 1.01 / 0.98 | 49.60 / 49.60 | 79162.23 / 79159.59 |
| b2-c05-stress | node-express-sse | 21.00 / 25.00 | 22.00 / 26.00 | 1.81 / 1.86 | 47.09 / 47.10 | 0.08 / 0.08 | 1.01 / 0.97 | 49.60 / 50.15 | 79325.57 / 79323.15 |
| b2-c06-stress | node-minimal-ws | 19.00 / 23.00 | 20.00 / 24.50 | 1.69 / 1.75 | 38.55 / 38.63 | 0.08 / 0.08 | 1.10 / 1.07 | 50.15 / 50.42 | 73856.62 / 73951.24 |
| b2-c06-stress | node-express-ws | 19.00 / 24.00 | 20.00 / 26.00 | 1.70 / 1.75 | 40.15 / 40.09 | 0.08 / 0.08 | 1.12 / 1.09 | 49.88 / 50.15 | 73864.37 / 73866.50 |

Den Zeitpunkt einzelner Events im Messfenster und die Zahl der Prozesse enthalten die Laufprotokolle nicht.

## d) Paare mit Differenz null und Verfahren des Wilcoxon-Tests

Paare mit einer Differenz von genau null verwirft der Wilcoxon-Test (DECISIONS.md 5.8). Bis 50 verbleibende Paare ohne Bindungen gilt der exakte Test, sonst die Normalapproximation.

| Messgröße | Nr. | Laststufe | Paare | davon Differenz null | Verfahren |
|---|---|---|---|---|---|
| latency_mean_ms | 1 | baseline | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 1 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 1 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 2 | baseline | 90 | 2 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 2 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 2 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 3 | baseline | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 3 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 3 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 4 | baseline | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 4 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 4 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 5 | baseline | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 5 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 5 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 6 | baseline | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 6 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 6 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 7 | baseline | 90 | 1 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 7 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 7 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 8 | baseline | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 8 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 8 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 9 | baseline | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 9 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 9 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 10 | baseline | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 10 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 10 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 11 | baseline | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 11 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 11 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 12 | baseline | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 12 | medium | 90 | 1 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 12 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 13 | baseline | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 13 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 13 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| cpu_seconds_total | 1 | baseline | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| cpu_seconds_total | 1 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| cpu_seconds_total | 1 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| cpu_seconds_total | 2 | baseline | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| cpu_seconds_total | 2 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| cpu_seconds_total | 2 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| cpu_seconds_total | 3 | baseline | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| cpu_seconds_total | 3 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| cpu_seconds_total | 3 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| cpu_seconds_total | 4 | baseline | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| cpu_seconds_total | 4 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| cpu_seconds_total | 4 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| cpu_seconds_total | 5 | baseline | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| cpu_seconds_total | 5 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| cpu_seconds_total | 5 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| cpu_seconds_total | 6 | baseline | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| cpu_seconds_total | 6 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| cpu_seconds_total | 6 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| cpu_seconds_total | 7 | baseline | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| cpu_seconds_total | 7 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| cpu_seconds_total | 7 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| cpu_seconds_total | 8 | baseline | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| cpu_seconds_total | 8 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| cpu_seconds_total | 8 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| cpu_seconds_total | 9 | baseline | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| cpu_seconds_total | 9 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| cpu_seconds_total | 9 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| cpu_seconds_total | 10 | baseline | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| cpu_seconds_total | 10 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| cpu_seconds_total | 10 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| cpu_seconds_total | 11 | baseline | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| cpu_seconds_total | 11 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| cpu_seconds_total | 11 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| cpu_seconds_total | 12 | baseline | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| cpu_seconds_total | 12 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| cpu_seconds_total | 12 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| cpu_seconds_total | 13 | baseline | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| cpu_seconds_total | 13 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| cpu_seconds_total | 13 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| working_set_peak_bytes_total | 1 | baseline | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| working_set_peak_bytes_total | 1 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| working_set_peak_bytes_total | 1 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| working_set_peak_bytes_total | 2 | baseline | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| working_set_peak_bytes_total | 2 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| working_set_peak_bytes_total | 2 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| working_set_peak_bytes_total | 3 | baseline | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| working_set_peak_bytes_total | 3 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| working_set_peak_bytes_total | 3 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| working_set_peak_bytes_total | 4 | baseline | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| working_set_peak_bytes_total | 4 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| working_set_peak_bytes_total | 4 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| working_set_peak_bytes_total | 5 | baseline | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| working_set_peak_bytes_total | 5 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| working_set_peak_bytes_total | 5 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| working_set_peak_bytes_total | 6 | baseline | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| working_set_peak_bytes_total | 6 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| working_set_peak_bytes_total | 6 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| working_set_peak_bytes_total | 7 | baseline | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| working_set_peak_bytes_total | 7 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| working_set_peak_bytes_total | 7 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| working_set_peak_bytes_total | 8 | baseline | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| working_set_peak_bytes_total | 8 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| working_set_peak_bytes_total | 8 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| working_set_peak_bytes_total | 9 | baseline | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| working_set_peak_bytes_total | 9 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| working_set_peak_bytes_total | 9 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| working_set_peak_bytes_total | 10 | baseline | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| working_set_peak_bytes_total | 10 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| working_set_peak_bytes_total | 10 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| working_set_peak_bytes_total | 11 | baseline | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| working_set_peak_bytes_total | 11 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| working_set_peak_bytes_total | 11 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| working_set_peak_bytes_total | 12 | baseline | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| working_set_peak_bytes_total | 12 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| working_set_peak_bytes_total | 12 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| working_set_peak_bytes_total | 13 | baseline | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| working_set_peak_bytes_total | 13 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| working_set_peak_bytes_total | 13 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 1 | baseline | 90 | 12 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 1 | medium | 90 | 2 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 1 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 2 | baseline | 90 | 13 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 2 | medium | 90 | 2 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 2 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 3 | baseline | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 3 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 3 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 4 | baseline | 90 | 6 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 4 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 4 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 5 | baseline | 90 | 11 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 5 | medium | 90 | 4 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 5 | stress | 90 | 1 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 6 | baseline | 90 | 16 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 6 | medium | 90 | 6 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 6 | stress | 90 | 1 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 7 | baseline | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 7 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 7 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 8 | baseline | 90 | 8 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 8 | medium | 90 | 3 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 8 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 9 | baseline | 90 | 3 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 9 | medium | 90 | 4 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 9 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 10 | baseline | 90 | 10 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 10 | medium | 90 | 2 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 10 | stress | 90 | 1 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 11 | baseline | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 11 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 11 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 12 | baseline | 90 | 13 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 12 | medium | 90 | 6 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 12 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 13 | baseline | 90 | 7 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 13 | medium | 90 | 2 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 13 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |

## e) Auflösung des Verbindungsaufbaus

`k6/lib/delivery.js` misst die Dauer jeder Verbindung als Differenz zweier Werte von `Date.now()`, also in ganzen Millisekunden. `connect_mean_ms` ist das Mittel über die Clients eines Laufs. Es kann deshalb nur Vielfache von 1 ms geteilt durch die Zahl der Clients annehmen. Der Median der Paardifferenzen liegt bei gerader Paarzahl zwischen zwei solchen Stufen und kann deshalb auch eine halbe Stufe betragen.

| Laststufe | Clients | kleinste Stufe (ms) | Läufe | davon Mittel mal Clients ganzzahlig |
|---|---|---|---|---|
| baseline | 10 | 0.100 | 2340 | 2340 |
| medium | 50 | 0.020 | 2340 | 2340 |
| stress | 500 | 0.002 | 2340 | 2340 |

## f) Messbetrieb

| Größe | Wert |
|---|---|
| Kampagnen | 39 |
| Läufe insgesamt, mit Warm-up | 7410 |
| gewertete Läufe | 7020 |
| davon gültig | 7020 |
| ungültige gewertete Läufe nach Grund | keine |
| Dauer laut Zeitplan | 2026-11-07T20:37:14.478Z bis 2026-11-14T14:57:36.470Z, 162.3 h |
| höchste Temperatur des Pi | 52.90 °C |
| Drosselstatus | 0x0 |
| höchstes Mittel der Auslastung des Lastgenerators je gewertetem Lauf | 6.05 % |

Kontrollmessungen im Zeitraum des Zeitplans:

| Kampagne | gültige Läufe | Haltezeit (s) | Clients | Median des Latenz-Mittels (ms) | Abweichung vom ersten Tag |
|---|---|---|---|---|---|
| 2026-11-08T04-41-25-908Z_control-node-minimal-sse | 5 | 60 | 50 | 2.551 | 0.0 % |
| 2026-11-09T05-20-54-799Z_control-node-minimal-sse | 5 | 60 | 50 | 2.512 | -1.5 % |
| 2026-11-10T05-43-34-806Z_control-node-minimal-sse | 5 | 60 | 50 | 2.625 | 2.9 % |
| 2026-11-11T07-36-20-871Z_control-node-minimal-sse | 5 | 60 | 50 | 2.681 | 5.1 % |
| 2026-11-12T09-29-17-395Z_control-node-minimal-sse | 5 | 60 | 50 | 2.553 | 0.1 % |
| 2026-11-13T09-53-12-033Z_control-node-minimal-sse | 5 | 60 | 50 | 2.627 | 3.0 % |
| 2026-11-14T10-47-07-570Z_control-node-minimal-sse | 5 | 60 | 50 | 2.641 | 3.5 % |

## g) Schiefe im Pilot

Nachgerechnet aus den Pilotkampagnen (`…_pilot-c<Vergleich>-<Laststufe>`) für die Begründung des Tests in DECISIONS.md 5.8. Schiefe als drittes standardisiertes Moment.

| Kampagne | Variante | Läufe | Schiefe der Lauf-Werte | Paare | Schiefe der Paardifferenzen |
|---|---|---|---|---|---|
| pilot-c10-baseline | php-laravel-sse | 100 | 0.47 | 100 | 0.76 |
| pilot-c10-baseline | php-laravel-sse-queue | 100 | -1.00 |  |  |
| pilot-c07-baseline | php-minimal-sse | 100 | 0.86 | 100 | 0.09 |
| pilot-c07-baseline | php-laravel-sse | 100 | -0.01 |  |  |
| pilot-c04-medium | node-express-ws | 60 | -0.15 | 60 | -0.04 |
| pilot-c04-medium | php-laravel-ws | 60 | -0.28 |  |  |
| pilot-c07-stress | php-minimal-sse | 40 | 0.79 | 40 | -0.20 |
| pilot-c07-stress | php-laravel-sse | 40 | 0.75 |  |  |
| pilot-c10-medium | php-laravel-sse | 60 | -0.59 | 60 | 0.32 |
| pilot-c10-medium | php-laravel-sse-queue | 60 | 0.30 |  |  |
| pilot-c04-baseline | node-express-ws | 100 | -0.02 | 100 | 1.54 |
| pilot-c04-baseline | php-laravel-ws | 100 | -2.41 |  |  |
| pilot-c07-medium | php-minimal-sse | 60 | -0.01 | 60 | 0.08 |
| pilot-c07-medium | php-laravel-sse | 60 | 0.36 |  |  |
| pilot-c10-stress | php-laravel-sse | 40 | 0.45 | 40 | 0.19 |
| pilot-c10-stress | php-laravel-sse-queue | 40 | 0.21 |  |  |
| pilot-c01-medium | node-minimal-sse | 60 | 0.08 | 60 | -0.04 |
| pilot-c01-medium | php-minimal-sse | 60 | 0.12 |  |  |
| pilot-c01-baseline | node-minimal-sse | 100 | -0.12 | 100 | -0.25 |
| pilot-c01-baseline | php-minimal-sse | 100 | -0.00 |  |  |
| pilot-c04-stress | node-express-ws | 40 | 1.33 | 40 | 0.67 |
| pilot-c04-stress | php-laravel-ws | 40 | 1.13 |  |  |
| pilot-c01-stress | node-minimal-sse | 40 | 0.61 | 40 | 0.47 |
| pilot-c01-stress | php-minimal-sse | 40 | 0.33 |  |  |

Zusammengefasst liegt der Betrag der Schiefe über 1 in 4 von 24 Fällen, Spanne -2.41 bis 1.33. Betrag der Schiefe der Paardifferenzen höchstens 0,76 in 11 von 12 Kampagnen, größter Betrag 1.54.

Ein Shapiro-Wilk-Test ist nicht enthalten. Die Werkzeuge haben dafür kein geprüftes Verfahren, und eine ungeprüfte eigene Umsetzung wäre kein belastbarer Beleg.

## h) Front-Nginx, beschreibend

| Variante | Laststufe | Modus | Läufe | CPU-Zeit Nginx (s) | Spitze Working Set Nginx (MiB) |
|---|---|---|---|---|---|
| node-express-sse | baseline | http | 270 | 0.027 | 10.8 |
| node-express-sse | medium | http | 270 | 0.099 | 12.0 |
| node-express-sse | stress | http | 270 | 0.898 | 24.3 |
| node-express-sse-queue | baseline | http | 180 | 0.033 | 10.9 |
| node-express-sse-queue | medium | http | 180 | 0.114 | 11.9 |
| node-express-sse-queue | stress | http | 180 | 0.917 | 24.3 |
| node-express-ws | baseline | http | 180 | 0.026 | 10.9 |
| node-express-ws | medium | http | 180 | 0.093 | 12.2 |
| node-express-ws | stress | http | 180 | 0.793 | 26.5 |
| node-minimal-sse | baseline | http | 270 | 0.027 | 10.9 |
| node-minimal-sse | medium | http | 270 | 0.098 | 12.0 |
| node-minimal-sse | stress | http | 270 | 0.905 | 24.3 |
| node-minimal-ws | baseline | http | 270 | 0.025 | 10.9 |
| node-minimal-ws | medium | http | 270 | 0.090 | 12.2 |
| node-minimal-ws | stress | http | 270 | 0.792 | 26.6 |
| php-laravel-sse | baseline | fastcgi | 270 | 0.030 | 11.0 |
| php-laravel-sse | medium | fastcgi | 270 | 0.113 | 12.3 |
| php-laravel-sse | stress | fastcgi | 270 | 1.077 | 26.7 |
| php-laravel-sse-queue | baseline | fastcgi | 180 | 0.031 | 11.0 |
| php-laravel-sse-queue | medium | fastcgi | 180 | 0.116 | 12.3 |
| php-laravel-sse-queue | stress | fastcgi | 180 | 1.099 | 26.6 |
| php-laravel-ws | baseline | http | 180 | 0.025 | 10.9 |
| php-laravel-ws | medium | http | 180 | 0.082 | 12.2 |
| php-laravel-ws | stress | http | 180 | 0.752 | 26.6 |
| php-minimal-sse | baseline | fastcgi | 270 | 0.029 | 11.0 |
| php-minimal-sse | medium | fastcgi | 270 | 0.108 | 12.1 |
| php-minimal-sse | stress | fastcgi | 270 | 1.023 | 24.4 |
| php-minimal-ws | baseline | http | 270 | 0.024 | 11.0 |
| php-minimal-ws | medium | http | 270 | 0.079 | 12.2 |
| php-minimal-ws | stress | http | 270 | 0.761 | 26.6 |

