# Beschreibende Auswertung von Block 1

Erzeugt am 2026-11-07T20:22:02.032Z mit `tools/orchestrate/descriptive.js` aus den Laufprotokollen. Nur beschreibend, ohne Tests. Tests und Bewertung der Hypothesen stehen in `evaluation.md`.

Werte je Variante und Laststufe über alle gültigen gewerteten Läufe von Block 1. Eine Variante, die in mehreren Vergleichen vorkommt, geht mit allen ihren Läufen ein. Perzentile nach der Methode des nächsten Rangs wie in `stats.js`.

## a) Verteilung der Lauf-Werte

### Latenz, Mittel je Lauf (ms)

| Variante | Laststufe | Läufe | Median | Mittelwert | p95 | p99 |
|---|---|---|---|---|---|---|
| node-express-sse | baseline | 270 | 1.480 | 1.476 | 1.607 | 1.680 |
| node-express-sse | medium | 270 | 2.504 | 2.509 | 2.662 | 2.815 |
| node-express-sse | stress | 270 | 11.594 | 12.010 | 13.906 | 14.047 |
| node-express-sse-queue | baseline | 180 | 2.480 | 2.488 | 2.688 | 2.868 |
| node-express-sse-queue | medium | 180 | 3.654 | 3.652 | 3.810 | 3.948 |
| node-express-sse-queue | stress | 180 | 12.990 | 13.203 | 14.822 | 14.971 |
| node-express-ws | baseline | 180 | 1.469 | 1.473 | 1.583 | 1.740 |
| node-express-ws | medium | 180 | 2.459 | 2.466 | 2.612 | 2.742 |
| node-express-ws | stress | 180 | 10.800 | 11.140 | 13.034 | 13.104 |
| node-minimal-sse | baseline | 270 | 1.483 | 1.487 | 1.620 | 1.673 |
| node-minimal-sse | medium | 270 | 2.459 | 2.463 | 2.585 | 2.647 |
| node-minimal-sse | stress | 270 | 11.577 | 11.958 | 13.735 | 13.901 |
| node-minimal-ws | baseline | 270 | 1.478 | 1.479 | 1.617 | 1.665 |
| node-minimal-ws | medium | 270 | 2.438 | 2.444 | 2.593 | 2.640 |
| node-minimal-ws | stress | 270 | 10.129 | 10.518 | 12.317 | 12.914 |
| php-laravel-sse | baseline | 270 | 1.432 | 1.433 | 1.583 | 1.650 |
| php-laravel-sse | medium | 270 | 2.442 | 2.429 | 2.589 | 2.700 |
| php-laravel-sse | stress | 270 | 9.459 | 9.542 | 10.084 | 10.763 |
| php-laravel-sse-queue | baseline | 180 | 2.656 | 2.655 | 2.962 | 3.007 |
| php-laravel-sse-queue | medium | 180 | 3.545 | 3.539 | 3.773 | 3.918 |
| php-laravel-sse-queue | stress | 180 | 10.899 | 10.941 | 11.433 | 11.756 |
| php-laravel-ws | baseline | 180 | 3.566 | 3.573 | 3.720 | 3.795 |
| php-laravel-ws | medium | 180 | 4.741 | 4.734 | 4.861 | 4.925 |
| php-laravel-ws | stress | 180 | 13.268 | 13.274 | 13.641 | 13.763 |
| php-minimal-sse | baseline | 270 | 1.441 | 1.437 | 1.590 | 1.650 |
| php-minimal-sse | medium | 270 | 2.402 | 2.398 | 2.494 | 2.576 |
| php-minimal-sse | stress | 270 | 9.396 | 9.468 | 9.977 | 10.310 |
| php-minimal-ws | baseline | 270 | 1.495 | 1.505 | 1.652 | 1.732 |
| php-minimal-ws | medium | 270 | 2.550 | 2.546 | 2.685 | 2.721 |
| php-minimal-ws | stress | 270 | 9.319 | 9.458 | 10.250 | 10.495 |

### Verbindungsaufbau, Mittel je Lauf (ms)

| Variante | Laststufe | Läufe | Median | Mittelwert | p95 | p99 |
|---|---|---|---|---|---|---|
| node-express-sse | baseline | 270 | 2.60 | 2.55 | 2.90 | 3.00 |
| node-express-sse | medium | 270 | 2.04 | 2.06 | 2.30 | 2.52 |
| node-express-sse | stress | 270 | 1.83 | 1.83 | 1.92 | 1.97 |
| node-express-sse-queue | baseline | 180 | 2.60 | 2.59 | 2.90 | 3.00 |
| node-express-sse-queue | medium | 180 | 2.06 | 2.10 | 2.38 | 2.60 |
| node-express-sse-queue | stress | 180 | 1.83 | 1.83 | 1.91 | 1.96 |
| node-express-ws | baseline | 180 | 2.50 | 2.44 | 2.70 | 2.80 |
| node-express-ws | medium | 180 | 1.94 | 1.94 | 2.22 | 2.36 |
| node-express-ws | stress | 180 | 1.72 | 1.72 | 1.83 | 1.89 |
| node-minimal-sse | baseline | 270 | 2.40 | 2.42 | 2.70 | 2.90 |
| node-minimal-sse | medium | 270 | 1.96 | 1.98 | 2.22 | 2.38 |
| node-minimal-sse | stress | 270 | 1.79 | 1.80 | 1.90 | 1.97 |
| node-minimal-ws | baseline | 270 | 2.40 | 2.43 | 2.80 | 2.90 |
| node-minimal-ws | medium | 270 | 1.93 | 1.95 | 2.24 | 2.34 |
| node-minimal-ws | stress | 270 | 1.70 | 1.71 | 1.82 | 1.84 |
| php-laravel-sse | baseline | 270 | 8.20 | 8.25 | 8.60 | 9.40 |
| php-laravel-sse | medium | 270 | 7.12 | 7.19 | 7.36 | 11.22 |
| php-laravel-sse | stress | 270 | 6.79 | 6.79 | 6.88 | 6.90 |
| php-laravel-sse-queue | baseline | 180 | 8.30 | 8.37 | 8.80 | 15.60 |
| php-laravel-sse-queue | medium | 180 | 7.08 | 7.10 | 7.36 | 8.54 |
| php-laravel-sse-queue | stress | 180 | 6.83 | 6.83 | 6.93 | 6.98 |
| php-laravel-ws | baseline | 180 | 2.80 | 2.82 | 3.10 | 3.30 |
| php-laravel-ws | medium | 180 | 2.34 | 2.36 | 2.52 | 2.60 |
| php-laravel-ws | stress | 180 | 2.45 | 2.45 | 2.53 | 2.58 |
| php-minimal-sse | baseline | 270 | 2.30 | 2.27 | 2.70 | 2.80 |
| php-minimal-sse | medium | 270 | 1.90 | 1.92 | 2.18 | 2.34 |
| php-minimal-sse | stress | 270 | 1.78 | 1.78 | 1.84 | 1.88 |
| php-minimal-ws | baseline | 270 | 2.50 | 2.51 | 2.80 | 2.90 |
| php-minimal-ws | medium | 270 | 2.02 | 2.04 | 2.28 | 2.44 |
| php-minimal-ws | stress | 270 | 2.11 | 2.12 | 2.21 | 2.24 |

### CPU-Zeit von Variante und Redis (s)

| Variante | Laststufe | Läufe | Median | Mittelwert | p95 | p99 |
|---|---|---|---|---|---|---|
| node-express-sse | baseline | 270 | 0.122 | 0.123 | 0.141 | 0.153 |
| node-express-sse | medium | 270 | 0.258 | 0.264 | 0.296 | 0.316 |
| node-express-sse | stress | 270 | 1.694 | 1.746 | 2.029 | 2.065 |
| node-express-sse-queue | baseline | 180 | 0.286 | 0.292 | 0.328 | 0.364 |
| node-express-sse-queue | medium | 180 | 0.460 | 0.466 | 0.515 | 0.532 |
| node-express-sse-queue | stress | 180 | 1.911 | 1.941 | 2.182 | 2.227 |
| node-express-ws | baseline | 180 | 0.125 | 0.126 | 0.141 | 0.148 |
| node-express-ws | medium | 180 | 0.259 | 0.263 | 0.296 | 0.311 |
| node-express-ws | stress | 180 | 1.591 | 1.642 | 1.927 | 1.961 |
| node-minimal-sse | baseline | 270 | 0.119 | 0.119 | 0.129 | 0.145 |
| node-minimal-sse | medium | 270 | 0.248 | 0.253 | 0.283 | 0.299 |
| node-minimal-sse | stress | 270 | 1.658 | 1.717 | 1.973 | 2.011 |
| node-minimal-ws | baseline | 270 | 0.120 | 0.122 | 0.139 | 0.145 |
| node-minimal-ws | medium | 270 | 0.247 | 0.255 | 0.285 | 0.309 |
| node-minimal-ws | stress | 270 | 1.493 | 1.542 | 1.853 | 1.956 |
| php-laravel-sse | baseline | 270 | 0.203 | 0.204 | 0.214 | 0.224 |
| php-laravel-sse | medium | 270 | 0.654 | 0.656 | 0.675 | 0.684 |
| php-laravel-sse | stress | 270 | 5.682 | 5.685 | 5.744 | 5.773 |
| php-laravel-sse-queue | baseline | 180 | 0.394 | 0.396 | 0.404 | 0.413 |
| php-laravel-sse-queue | medium | 180 | 0.854 | 0.855 | 0.864 | 0.877 |
| php-laravel-sse-queue | stress | 180 | 6.010 | 6.013 | 6.043 | 6.061 |
| php-laravel-ws | baseline | 180 | 0.266 | 0.267 | 0.270 | 0.289 |
| php-laravel-ws | medium | 180 | 0.380 | 0.381 | 0.389 | 0.400 |
| php-laravel-ws | stress | 180 | 1.886 | 1.928 | 2.147 | 2.161 |
| php-minimal-sse | baseline | 270 | 0.144 | 0.144 | 0.147 | 0.164 |
| php-minimal-sse | medium | 270 | 0.388 | 0.390 | 0.404 | 0.409 |
| php-minimal-sse | stress | 270 | 3.161 | 3.161 | 3.205 | 3.226 |
| php-minimal-ws | baseline | 270 | 0.107 | 0.107 | 0.113 | 0.127 |
| php-minimal-ws | medium | 270 | 0.183 | 0.186 | 0.206 | 0.212 |
| php-minimal-ws | stress | 270 | 1.175 | 1.215 | 1.447 | 1.510 |

### Spitze des Working Sets von Variante und Redis (MiB)

| Variante | Laststufe | Läufe | Median | Mittelwert | p95 | p99 |
|---|---|---|---|---|---|---|
| node-express-sse | baseline | 270 | 46.7 | 46.8 | 50.4 | 50.8 |
| node-express-sse | medium | 270 | 52.4 | 52.1 | 54.0 | 54.5 |
| node-express-sse | stress | 270 | 57.3 | 60.1 | 68.3 | 69.9 |
| node-express-sse-queue | baseline | 180 | 86.1 | 86.1 | 90.7 | 91.5 |
| node-express-sse-queue | medium | 180 | 90.5 | 90.1 | 93.1 | 94.0 |
| node-express-sse-queue | stress | 180 | 105.9 | 105.5 | 113.5 | 114.7 |
| node-express-ws | baseline | 180 | 42.8 | 42.9 | 44.5 | 44.9 |
| node-express-ws | medium | 180 | 48.6 | 47.9 | 49.8 | 50.3 |
| node-express-ws | stress | 180 | 51.6 | 51.4 | 53.4 | 54.6 |
| node-minimal-sse | baseline | 270 | 46.4 | 46.0 | 47.7 | 48.4 |
| node-minimal-sse | medium | 270 | 50.9 | 50.4 | 52.6 | 52.9 |
| node-minimal-sse | stress | 270 | 54.6 | 56.0 | 62.6 | 63.8 |
| node-minimal-ws | baseline | 270 | 42.9 | 43.7 | 47.3 | 47.7 |
| node-minimal-ws | medium | 270 | 46.3 | 46.0 | 48.7 | 49.2 |
| node-minimal-ws | stress | 270 | 49.2 | 50.4 | 55.1 | 56.2 |
| php-laravel-sse | baseline | 270 | 1085.9 | 1086.0 | 1105.6 | 1107.2 |
| php-laravel-sse | medium | 270 | 1101.8 | 1099.3 | 1114.8 | 1116.1 |
| php-laravel-sse | stress | 270 | 1091.5 | 1091.3 | 1104.7 | 1106.1 |
| php-laravel-sse-queue | baseline | 180 | 1116.2 | 1116.9 | 1135.2 | 1136.6 |
| php-laravel-sse-queue | medium | 180 | 1111.7 | 1112.5 | 1131.6 | 1132.2 |
| php-laravel-sse-queue | stress | 180 | 1123.0 | 1122.7 | 1135.0 | 1136.8 |
| php-laravel-ws | baseline | 180 | 90.7 | 90.5 | 93.4 | 93.7 |
| php-laravel-ws | medium | 180 | 88.2 | 88.2 | 88.6 | 88.8 |
| php-laravel-ws | stress | 180 | 89.9 | 89.8 | 90.2 | 90.4 |
| php-minimal-sse | baseline | 270 | 378.0 | 378.0 | 381.1 | 381.1 |
| php-minimal-sse | medium | 270 | 383.0 | 383.5 | 388.4 | 388.5 |
| php-minimal-sse | stress | 270 | 388.0 | 390.1 | 395.7 | 395.8 |
| php-minimal-ws | baseline | 270 | 33.9 | 36.2 | 41.4 | 41.5 |
| php-minimal-ws | medium | 270 | 34.2 | 34.2 | 34.6 | 34.8 |
| php-minimal-ws | stress | 270 | 33.5 | 33.9 | 36.1 | 36.2 |

### Latenz innerhalb der Läufe (ms)

Median über die Läufe von Median, p95 und p99 der Events eines Laufs.

| Variante | Laststufe | Läufe | Median | p95 | p99 |
|---|---|---|---|---|---|
| node-express-sse | baseline | 270 | 1.0 | 2.0 | 2.0 |
| node-express-sse | medium | 270 | 3.0 | 4.0 | 4.0 |
| node-express-sse | stress | 270 | 12.0 | 20.0 | 21.0 |
| node-express-sse-queue | baseline | 180 | 2.0 | 3.0 | 3.0 |
| node-express-sse-queue | medium | 180 | 4.0 | 5.0 | 6.0 |
| node-express-sse-queue | stress | 180 | 13.0 | 22.0 | 25.0 |
| node-express-ws | baseline | 180 | 1.0 | 2.0 | 2.0 |
| node-express-ws | medium | 180 | 2.0 | 4.0 | 4.0 |
| node-express-ws | stress | 180 | 11.0 | 19.0 | 20.0 |
| node-minimal-sse | baseline | 270 | 1.0 | 2.0 | 2.0 |
| node-minimal-sse | medium | 270 | 2.0 | 4.0 | 4.0 |
| node-minimal-sse | stress | 270 | 12.0 | 20.0 | 21.0 |
| node-minimal-ws | baseline | 270 | 1.0 | 2.0 | 2.0 |
| node-minimal-ws | medium | 270 | 2.0 | 4.0 | 4.0 |
| node-minimal-ws | stress | 270 | 10.0 | 18.0 | 19.0 |
| php-laravel-sse | baseline | 270 | 1.0 | 2.0 | 2.0 |
| php-laravel-sse | medium | 270 | 2.0 | 4.0 | 4.0 |
| php-laravel-sse | stress | 270 | 9.0 | 16.0 | 17.0 |
| php-laravel-sse-queue | baseline | 180 | 3.0 | 3.0 | 3.0 |
| php-laravel-sse-queue | medium | 180 | 4.0 | 5.0 | 6.0 |
| php-laravel-sse-queue | stress | 180 | 11.0 | 18.0 | 19.0 |
| php-laravel-ws | baseline | 180 | 4.0 | 4.0 | 4.0 |
| php-laravel-ws | medium | 180 | 5.0 | 6.0 | 6.0 |
| php-laravel-ws | stress | 180 | 14.0 | 16.0 | 18.0 |
| php-minimal-sse | baseline | 270 | 1.0 | 2.0 | 2.0 |
| php-minimal-sse | medium | 270 | 2.0 | 3.0 | 4.0 |
| php-minimal-sse | stress | 270 | 9.0 | 16.0 | 17.0 |
| php-minimal-ws | baseline | 270 | 1.0 | 2.0 | 2.0 |
| php-minimal-ws | medium | 270 | 3.0 | 3.0 | 4.0 |
| php-minimal-ws | stress | 270 | 9.0 | 12.0 | 16.0 |

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
| node-express-sse | baseline | 270 | 0.047 | 0.073 | 60.6 % | 0.054 | 0.018 | 15.2 % |
| node-express-sse | medium | 270 | 0.177 | 0.077 | 30.0 % | 0.054 | 0.023 | 8.7 % |
| node-express-sse | stress | 270 | 1.606 | 0.085 | 5.0 % | 0.054 | 0.031 | 1.8 % |
| node-express-sse-queue | baseline | 180 | 0.148 | 0.136 | 47.6 % | 0.054 | 0.082 | 28.3 % |
| node-express-sse-queue | medium | 180 | 0.315 | 0.144 | 31.2 % | 0.054 | 0.090 | 19.4 % |
| node-express-sse-queue | stress | 180 | 1.763 | 0.149 | 7.8 % | 0.054 | 0.095 | 4.9 % |
| node-express-ws | baseline | 180 | 0.050 | 0.074 | 59.4 % | 0.054 | 0.020 | 15.7 % |
| node-express-ws | medium | 180 | 0.181 | 0.077 | 30.0 % | 0.054 | 0.023 | 9.0 % |
| node-express-ws | stress | 180 | 1.507 | 0.083 | 5.2 % | 0.054 | 0.030 | 1.8 % |
| node-minimal-sse | baseline | 270 | 0.046 | 0.072 | 61.1 % | 0.054 | 0.018 | 15.0 % |
| node-minimal-sse | medium | 270 | 0.170 | 0.076 | 30.9 % | 0.054 | 0.022 | 8.8 % |
| node-minimal-sse | stress | 270 | 1.574 | 0.083 | 5.0 % | 0.054 | 0.029 | 1.7 % |
| node-minimal-ws | baseline | 270 | 0.048 | 0.072 | 60.2 % | 0.054 | 0.018 | 15.1 % |
| node-minimal-ws | medium | 270 | 0.171 | 0.076 | 30.7 % | 0.054 | 0.022 | 8.9 % |
| node-minimal-ws | stress | 270 | 1.408 | 0.083 | 5.6 % | 0.054 | 0.029 | 1.9 % |
| php-laravel-sse | baseline | 270 | 0.116 | 0.088 | 43.1 % | 0.054 | 0.033 | 16.4 % |
| php-laravel-sse | medium | 270 | 0.504 | 0.148 | 22.6 % | 0.054 | 0.093 | 14.3 % |
| php-laravel-sse | stress | 270 | 4.910 | 0.766 | 13.5 % | 0.054 | 0.711 | 12.5 % |
| php-laravel-sse-queue | baseline | 180 | 0.266 | 0.130 | 32.8 % | 0.054 | 0.075 | 19.1 % |
| php-laravel-sse-queue | medium | 180 | 0.663 | 0.191 | 22.3 % | 0.054 | 0.136 | 16.0 % |
| php-laravel-sse-queue | stress | 180 | 5.153 | 0.854 | 14.2 % | 0.054 | 0.800 | 13.3 % |
| php-laravel-ws | baseline | 180 | 0.191 | 0.075 | 28.3 % | 0.054 | 0.021 | 8.1 % |
| php-laravel-ws | medium | 180 | 0.301 | 0.079 | 20.7 % | 0.054 | 0.025 | 6.5 % |
| php-laravel-ws | stress | 180 | 1.800 | 0.085 | 4.5 % | 0.054 | 0.031 | 1.6 % |
| php-minimal-sse | baseline | 270 | 0.057 | 0.086 | 60.1 % | 0.054 | 0.032 | 22.5 % |
| php-minimal-sse | medium | 270 | 0.245 | 0.142 | 36.8 % | 0.054 | 0.088 | 22.8 % |
| php-minimal-sse | stress | 270 | 2.422 | 0.730 | 23.2 % | 0.054 | 0.675 | 21.4 % |
| php-minimal-ws | baseline | 270 | 0.035 | 0.072 | 67.7 % | 0.054 | 0.018 | 17.0 % |
| php-minimal-ws | medium | 270 | 0.106 | 0.076 | 41.6 % | 0.054 | 0.022 | 11.8 % |
| php-minimal-ws | stress | 270 | 1.093 | 0.083 | 7.1 % | 0.054 | 0.029 | 2.5 % |

## c) Läufe deutlich über den übrigen

Als auffällig gilt ein Lauf, dessen Latenz-Mittel mehr als 1 ms über dem Median derselben Konfiguration in derselben Kampagne liegt. Zum Vergleich steht die Zahl nach dem Kriterium „mehr als 12 % über dem Median“, mit dem DECISIONS.md 5.14 den Befund beschrieben hat. Aufgeführt sind alle Konfigurationen mit mindestens einem solchen Lauf.

| Kampagne | Variante | Position | Partner | Läufe | über +1 ms | über +12 % | Latenz übrige / auffällige (ms) | CPU Variante übrige / auffällige (s) | Laufnummern der auffälligen | Anteil in Drittel 1, 2, 3 |
|---|---|---|---|---|---|---|---|---|---|---|
| b1-c01-stress | node-minimal-sse | A | php-minimal-sse | 90 | 19 | 14 | 11.56 / 13.62 | 1.550 / 1.846 | 8, 15, 19, 24, 25, 40, 42, 51, 55, 56, 59, 65, 69, 70, 73, 77, 79, 89, 90 | 5, 7, 7 |
| b1-c03-stress | node-express-sse | A | php-laravel-sse | 90 | 17 | 14 | 11.53 / 13.90 | 1.589 / 1.926 | 13, 14, 15, 16, 20, 21, 27, 39, 42, 45, 49, 51, 57, 71, 82, 83, 88 | 7, 6, 4 |
| b1-c03-stress | php-laravel-sse | B | node-express-sse | 90 | 1 | 1 | 9.42 / 10.88 | 4.893 / 4.850 | 59 | 0, 1, 0 |
| b1-c02-stress | node-minimal-ws | A | php-minimal-ws | 90 | 17 | 17 | 9.93 / 12.19 | 1.368 / 1.724 | 10, 25, 27, 35, 38, 40, 42, 43, 46, 50, 57, 68, 71, 74, 85, 86, 93 | 4, 7, 6 |
| b1-c09-baseline | node-express-sse | A | node-express-sse-queue | 90 | 0 | 2 | 1.52 / – | 0.047 / – | – | 0, 0, 0 |
| b1-c09-baseline | node-express-sse-queue | B | node-express-sse | 90 | 0 | 1 | 2.44 / – | 0.144 / – | – | 0, 0, 0 |
| b1-c06-stress | node-minimal-ws | A | node-express-ws | 90 | 14 | 11 | 9.99 / 12.08 | 1.378 / 1.696 | 9, 11, 23, 30, 35, 40, 61, 77, 82, 87, 90, 92, 93, 95 | 5, 2, 7 |
| b1-c06-stress | node-express-ws | B | node-minimal-ws | 90 | 18 | 18 | 10.62 / 12.99 | 1.492 / 1.832 | 7, 24, 25, 27, 31, 45, 46, 54, 60, 63, 66, 72, 76, 77, 80, 82, 93, 95 | 5, 5, 8 |
| b1-c01-baseline | node-minimal-sse | A | php-minimal-sse | 90 | 0 | 1 | 1.45 / – | 0.043 / – | – | 0, 0, 0 |
| b1-c13-stress | php-minimal-ws | B | php-minimal-sse | 90 | 10 | 5 | 9.27 / 10.41 | 1.104 / 1.424 | 9, 43, 49, 61, 64, 65, 71, 80, 87, 94 | 1, 5, 4 |
| b1-c11-baseline | node-express-sse-queue | A | php-laravel-sse-queue | 90 | 0 | 3 | 2.53 / – | 0.160 / – | – | 0, 0, 0 |
| b1-c11-baseline | php-laravel-sse-queue | B | node-express-sse-queue | 90 | 0 | 1 | 2.67 / – | 0.264 / – | – | 0, 0, 0 |
| b1-c05-stress | node-minimal-sse | A | node-express-sse | 90 | 24 | 22 | 11.32 / 13.33 | 1.573 / 1.870 | 14, 15, 16, 21, 22, 24, 38, 41, 42, 43, 44, 45, 46, 54, 57, 62, 69, 71, 72, 77, 82, 84, 88, 90 | 6, 10, 8 |
| b1-c05-stress | node-express-sse | B | node-minimal-sse | 90 | 22 | 21 | 11.51 / 13.82 | 1.597 / 1.910 | 14, 15, 17, 30, 32, 35, 48, 51, 54, 63, 67, 68, 69, 72, 74, 75, 79, 80, 82, 89, 91, 93 | 6, 4, 12 |
| b1-c10-stress | php-laravel-sse | A | php-laravel-sse-queue | 90 | 2 | 2 | 9.57 / 10.85 | 4.925 / 4.862 | 9, 12 | 2, 0, 0 |
| b1-c10-stress | php-laravel-sse-queue | B | php-laravel-sse | 90 | 1 | 1 | 10.90 / 12.41 | 5.152 / 5.079 | 28 | 1, 0, 0 |
| b1-c12-stress | node-minimal-sse | A | node-minimal-ws | 90 | 17 | 15 | 11.58 / 13.70 | 1.567 / 1.874 | 7, 11, 15, 22, 26, 29, 52, 53, 58, 61, 62, 63, 67, 68, 80, 84, 93 | 6, 6, 5 |
| b1-c12-stress | node-minimal-ws | B | node-minimal-sse | 90 | 18 | 18 | 10.38 / 12.80 | 1.430 / 1.802 | 9, 12, 13, 21, 25, 26, 27, 29, 33, 39, 47, 48, 49, 51, 75, 82, 83, 89 | 9, 5, 4 |
| b1-c10-baseline | php-laravel-sse | A | php-laravel-sse-queue | 90 | 0 | 3 | 1.47 / – | 0.118 / – | – | 0, 0, 0 |
| b1-c10-baseline | php-laravel-sse-queue | B | php-laravel-sse | 90 | 0 | 13 | 2.62 / – | 0.267 / – | – | 0, 0, 0 |
| b1-c09-stress | node-express-sse | A | node-express-sse-queue | 90 | 16 | 13 | 11.64 / 13.73 | 1.599 / 1.890 | 10, 11, 15, 24, 32, 39, 49, 51, 53, 59, 61, 63, 67, 78, 86, 92 | 5, 7, 4 |
| b1-c09-stress | node-express-sse-queue | B | node-express-sse | 90 | 20 | 12 | 12.86 / 14.68 | 1.749 / 2.000 | 8, 10, 28, 39, 43, 46, 47, 53, 58, 60, 62, 64, 68, 70, 74, 76, 80, 86, 87, 94 | 3, 9, 8 |
| b1-c08-baseline | php-minimal-ws | A | php-laravel-ws | 90 | 0 | 4 | 1.54 / – | 0.035 / – | – | 0, 0, 0 |
| b1-c02-baseline | node-minimal-ws | A | php-minimal-ws | 90 | 0 | 2 | 1.46 / – | 0.050 / – | – | 0, 0, 0 |
| b1-c06-baseline | node-minimal-ws | A | node-express-ws | 90 | 0 | 6 | 1.45 / – | 0.043 / – | – | 0, 0, 0 |
| b1-c06-baseline | node-express-ws | B | node-minimal-ws | 90 | 0 | 3 | 1.46 / – | 0.049 / – | – | 0, 0, 0 |
| b1-c12-baseline | node-minimal-sse | A | node-minimal-ws | 90 | 0 | 1 | 1.52 / – | 0.046 / – | – | 0, 0, 0 |
| b1-c12-baseline | node-minimal-ws | B | node-minimal-sse | 90 | 0 | 1 | 1.50 / – | 0.050 / – | – | 0, 0, 0 |
| b1-c11-stress | node-express-sse-queue | A | php-laravel-sse-queue | 90 | 23 | 11 | 12.51 / 14.18 | 1.687 / 1.926 | 8, 15, 17, 19, 21, 23, 25, 30, 31, 32, 34, 40, 46, 56, 57, 63, 70, 72, 76, 80, 82, 89, 90 | 11, 5, 7 |
| b1-c13-baseline | php-minimal-sse | A | php-minimal-ws | 90 | 0 | 2 | 1.47 / – | 0.058 / – | – | 0, 0, 0 |
| b1-c13-baseline | php-minimal-ws | B | php-minimal-sse | 90 | 0 | 1 | 1.49 / – | 0.033 / – | – | 0, 0, 0 |
| b1-c07-baseline | php-minimal-sse | A | php-laravel-sse | 90 | 0 | 3 | 1.37 / – | 0.057 / – | – | 0, 0, 0 |
| b1-c07-baseline | php-laravel-sse | B | php-minimal-sse | 90 | 0 | 5 | 1.39 / – | 0.116 / – | – | 0, 0, 0 |
| b1-c04-stress | node-express-ws | A | php-laravel-ws | 90 | 13 | 13 | 10.87 / 13.02 | 1.506 / 1.811 | 8, 15, 19, 22, 23, 31, 36, 41, 47, 48, 55, 86, 94 | 6, 5, 2 |
| b1-c09-medium | node-express-sse | A | node-express-sse-queue | 90 | 0 | 1 | 2.55 / – | 0.178 / – | – | 0, 0, 0 |
| b1-c04-baseline | node-express-ws | A | php-laravel-ws | 90 | 0 | 1 | 1.48 / – | 0.052 / – | – | 0, 0, 0 |
| b1-c03-baseline | php-laravel-sse | B | node-express-sse | 90 | 0 | 1 | 1.45 / – | 0.114 / – | – | 0, 0, 0 |
| b1-c07-stress | php-minimal-sse | A | php-laravel-sse | 90 | 1 | 0 | 9.32 / 10.34 | 2.449 / 2.389 | 69 | 0, 0, 1 |
| b1-c07-stress | php-laravel-sse | B | php-minimal-sse | 90 | 2 | 1 | 9.40 / 10.55 | 4.912 / 4.877 | 38, 82 | 0, 1, 1 |

Weitere Werte der Laufprotokolle, Median der übrigen gegenüber Median der auffälligen Läufe, je Konfiguration mit mindestens 5 auffälligen Läufen. Sie sind Hinweise, keine Ursache.

| Kampagne | Variante | p99 (ms) | Max (ms) | Aufbau (ms) | Working Set (MiB) | CPU Redis (s) | Lastgenerator (%) | Temperatur (°C) | Bytes je s |
|---|---|---|---|---|---|---|---|---|---|
| b1-c01-stress | node-minimal-sse | 21.00 / 26.00 | 22.00 / 27.00 | 1.78 / 1.82 | 43.10 / 43.07 | 0.08 / 0.08 | 1.10 / 1.09 | 50.15 / 50.70 | 79159.89 / 79157.78 |
| b1-c03-stress | node-express-sse | 21.00 / 26.00 | 22.00 / 27.00 | 1.82 / 1.86 | 47.04 / 47.14 | 0.08 / 0.08 | 1.06 / 1.07 | 50.15 / 49.60 | 79326.80 / 79322.55 |
| b1-c02-stress | node-minimal-ws | 18.00 / 23.00 | 19.00 / 24.00 | 1.69 / 1.76 | 38.89 / 38.81 | 0.08 / 0.08 | 0.98 / 0.99 | 50.70 / 50.70 | 73864.55 / 73930.11 |
| b1-c06-stress | node-minimal-ws | 18.00 / 23.00 | 20.00 / 24.00 | 1.69 / 1.73 | 38.95 / 39.54 | 0.08 / 0.08 | 1.10 / 1.11 | 50.70 / 50.70 | 73766.10 / 73800.66 |
| b1-c06-stress | node-express-ws | 20.00 / 25.00 | 21.00 / 26.00 | 1.72 / 1.76 | 39.94 / 39.93 | 0.08 / 0.08 | 1.11 / 1.05 | 50.70 / 50.70 | 73747.83 / 73863.48 |
| b1-c13-stress | php-minimal-ws | 16.00 / 17.50 | 20.00 / 19.50 | 2.11 / 2.17 | 22.93 / 22.77 | 0.08 / 0.08 | 1.03 / 1.01 | 50.70 / 50.70 | 73902.06 / 74193.49 |
| b1-c05-stress | node-minimal-sse | 21.00 / 25.00 | 22.00 / 26.00 | 1.78 / 1.80 | 44.37 / 43.98 | 0.08 / 0.08 | 1.06 / 1.04 | 50.70 / 50.70 | 79163.05 / 79155.47 |
| b1-c05-stress | node-express-sse | 21.00 / 26.00 | 22.00 / 27.00 | 1.83 / 1.83 | 46.73 / 46.81 | 0.08 / 0.08 | 1.08 / 1.03 | 50.70 / 50.70 | 79321.74 / 79795.00 |
| b1-c12-stress | node-minimal-sse | 21.00 / 26.00 | 22.00 / 27.00 | 1.80 / 1.81 | 46.96 / 46.50 | 0.08 / 0.08 | 1.09 / 1.08 | 50.70 / 50.70 | 79161.41 / 79153.87 |
| b1-c12-stress | node-minimal-ws | 19.00 / 24.50 | 20.00 / 26.00 | 1.71 / 1.75 | 39.87 / 39.81 | 0.08 / 0.08 | 1.16 / 1.10 | 50.70 / 50.70 | 73887.77 / 73842.37 |
| b1-c09-stress | node-express-sse | 21.00 / 26.00 | 22.00 / 27.00 | 1.83 / 1.85 | 54.62 / 54.17 | 0.09 / 0.09 | 1.08 / 1.09 | 50.70 / 50.70 | 78350.53 / 78345.86 |
| b1-c09-stress | node-express-sse-queue | 23.00 / 27.00 | 27.00 / 28.00 | 1.83 / 1.85 | 99.08 / 98.92 | 0.15 / 0.14 | 1.11 / 1.09 | 50.70 / 50.70 | 92435.97 / 92429.97 |
| b1-c11-stress | node-express-sse-queue | 22.00 / 27.00 | 27.00 / 28.00 | 1.81 / 1.81 | 86.22 / 86.09 | 0.15 / 0.15 | 1.11 / 1.10 | 50.70 / 50.70 | 92431.30 / 92425.99 |
| b1-c04-stress | node-express-ws | 20.00 / 25.00 | 21.00 / 26.00 | 1.71 / 1.73 | 39.96 / 39.82 | 0.09 / 0.08 | 1.09 / 1.06 | 50.70 / 50.70 | 73832.87 / 73478.67 |

Den Zeitpunkt einzelner Events im Messfenster und die Zahl der Prozesse enthalten die Laufprotokolle nicht.

## d) Paare mit Differenz null und Verfahren des Wilcoxon-Tests

Paare mit einer Differenz von genau null verwirft der Wilcoxon-Test (DECISIONS.md 5.8). Bis 50 verbleibende Paare ohne Bindungen gilt der exakte Test, sonst die Normalapproximation.

| Messgröße | Nr. | Laststufe | Paare | davon Differenz null | Verfahren |
|---|---|---|---|---|---|
| latency_mean_ms | 1 | baseline | 90 | 2 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 1 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 1 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 2 | baseline | 90 | 3 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 2 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 2 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 3 | baseline | 90 | 1 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 3 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 3 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 4 | baseline | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 4 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 4 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 5 | baseline | 90 | 1 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 5 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 5 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| latency_mean_ms | 6 | baseline | 90 | 1 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
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
| latency_mean_ms | 12 | baseline | 90 | 1 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
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
| connect_mean_ms | 1 | baseline | 90 | 13 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 1 | medium | 90 | 3 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 1 | stress | 90 | 1 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 2 | baseline | 90 | 8 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 2 | medium | 90 | 5 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 2 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 3 | baseline | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 3 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 3 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 4 | baseline | 90 | 5 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 4 | medium | 90 | 1 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 4 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 5 | baseline | 90 | 18 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 5 | medium | 90 | 2 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 5 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 6 | baseline | 90 | 17 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 6 | medium | 90 | 4 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 6 | stress | 90 | 1 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 7 | baseline | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 7 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 7 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 8 | baseline | 90 | 6 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 8 | medium | 90 | 3 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 8 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 9 | baseline | 90 | 17 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 9 | medium | 90 | 8 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 9 | stress | 90 | 2 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 10 | baseline | 90 | 18 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 10 | medium | 90 | 1 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 10 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 11 | baseline | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 11 | medium | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 11 | stress | 90 | 0 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 12 | baseline | 90 | 10 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 12 | medium | 90 | 7 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 12 | stress | 90 | 1 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 13 | baseline | 90 | 6 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
| connect_mean_ms | 13 | medium | 90 | 4 | Normalapproximation (Bindungs- und Stetigkeitskorrektur) |
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
| Dauer laut Zeitplan | 2026-10-31T19:08:30.055Z bis 2026-11-07T13:32:11.282Z, 162.4 h |
| höchste Temperatur des Pi | 53.45 °C |
| Drosselstatus | 0x0 |
| höchstes Mittel der Auslastung des Lastgenerators je gewertetem Lauf | 5.91 % |

Kontrollmessungen im Zeitraum des Zeitplans:

| Kampagne | gültige Läufe | Haltezeit (s) | Clients | Median des Latenz-Mittels (ms) | Abweichung vom ersten Tag |
|---|---|---|---|---|---|
| 2026-10-31T19-08-30-114Z_control-node-minimal-sse | 5 | 60 | 50 | 2.554 | 0.0 % |
| 2026-11-01T20-18-56-007Z_control-node-minimal-sse | 5 | 60 | 50 | 2.666 | 4.4 % |
| 2026-11-02T21-45-22-902Z_control-node-minimal-sse | 5 | 60 | 50 | 2.818 | 10.3 % |
| 2026-11-03T23-26-55-706Z_control-node-minimal-sse | 5 | 60 | 50 | 2.557 | 0.1 % |
| 2026-11-04T23-46-18-060Z_control-node-minimal-sse | 5 | 60 | 50 | 2.653 | 3.8 % |
| 2026-11-06T00-38-01-315Z_control-node-minimal-sse | 5 | 60 | 50 | 2.666 | 4.4 % |
| 2026-11-07T01-13-51-181Z_control-node-minimal-sse | 5 | 60 | 50 | 2.758 | 8.0 % |

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
| node-express-sse | baseline | http | 270 | 0.028 | 10.9 |
| node-express-sse | medium | http | 270 | 0.100 | 12.0 |
| node-express-sse | stress | http | 270 | 0.905 | 24.3 |
| node-express-sse-queue | baseline | http | 180 | 0.033 | 10.9 |
| node-express-sse-queue | medium | http | 180 | 0.116 | 11.9 |
| node-express-sse-queue | stress | http | 180 | 0.912 | 24.3 |
| node-express-ws | baseline | http | 180 | 0.026 | 10.9 |
| node-express-ws | medium | http | 180 | 0.094 | 12.2 |
| node-express-ws | stress | http | 180 | 0.807 | 26.5 |
| node-minimal-sse | baseline | http | 270 | 0.028 | 10.9 |
| node-minimal-sse | medium | http | 270 | 0.099 | 12.0 |
| node-minimal-sse | stress | http | 270 | 0.906 | 24.3 |
| node-minimal-ws | baseline | http | 270 | 0.025 | 10.9 |
| node-minimal-ws | medium | http | 270 | 0.090 | 12.2 |
| node-minimal-ws | stress | http | 270 | 0.803 | 26.6 |
| php-laravel-sse | baseline | fastcgi | 270 | 0.030 | 11.0 |
| php-laravel-sse | medium | fastcgi | 270 | 0.115 | 12.3 |
| php-laravel-sse | stress | fastcgi | 270 | 1.102 | 26.6 |
| php-laravel-sse-queue | baseline | fastcgi | 180 | 0.032 | 11.0 |
| php-laravel-sse-queue | medium | fastcgi | 180 | 0.117 | 12.3 |
| php-laravel-sse-queue | stress | fastcgi | 180 | 1.123 | 26.7 |
| php-laravel-ws | baseline | http | 180 | 0.025 | 10.9 |
| php-laravel-ws | medium | http | 180 | 0.083 | 12.2 |
| php-laravel-ws | stress | http | 180 | 0.756 | 26.6 |
| php-minimal-sse | baseline | fastcgi | 270 | 0.029 | 11.0 |
| php-minimal-sse | medium | fastcgi | 270 | 0.110 | 12.1 |
| php-minimal-sse | stress | fastcgi | 270 | 1.042 | 24.4 |
| php-minimal-ws | baseline | http | 270 | 0.024 | 11.0 |
| php-minimal-ws | medium | http | 270 | 0.080 | 12.2 |
| php-minimal-ws | stress | http | 270 | 0.766 | 26.6 |

