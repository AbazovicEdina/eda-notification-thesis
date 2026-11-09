# Gesamtauswertung

Erzeugt: 2026-11-09T00:26:22.566Z · Signifikanzniveau α = 0.05 · Holm-Korrektur je Familie über alle geplanten Tests · konfirmatorisch: Block 1

Vorzeichen: Differenz = A − B. Negative Werte bedeuten, dass A kleiner (bei Latenz, CPU und Speicher: besser) ist.

## latency_mean_ms (primär, Block 1, m = 39)

Mittelwert der Event-Latenz pro Lauf im Messfenster (DECISIONS.md 5.8)

| Nr. | A vs. B | Laststufe | Paare | Median-Diff in ms [95-%-KI] | Cliff's δ | r (rangbiserial) | p | p (Holm) | signifikant | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | node-minimal-sse vs. php-minimal-sse | baseline | 90 | -0.001 [-0.027, 0.027] | 0.031 (vernachlässigbar) | 0.040 | 0.746 | 1.000 | nein | gemessen |
| 1 | node-minimal-sse vs. php-minimal-sse | medium | 90 | 0.029 [0.008, 0.050] | 0.232 (klein) | 0.348 | 0.004 | 0.054 | nein | gemessen |
| 1 | node-minimal-sse vs. php-minimal-sse | stress | 90 | 2.208 [2.156, 2.263] | 1.000 (groß) | 1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 2 | node-minimal-ws vs. php-minimal-ws | baseline | 90 | -0.005 [-0.027, 0.014] | -0.029 (vernachlässigbar) | -0.063 | 0.613 | 1.000 | nein | gemessen |
| 2 | node-minimal-ws vs. php-minimal-ws | medium | 90 | -0.089 [-0.114, -0.059] | -0.598 (groß) | -0.773 | < 0.001 | < 0.001 | ja | gemessen |
| 2 | node-minimal-ws vs. php-minimal-ws | stress | 90 | 0.711 [0.655, 0.786] | 0.928 (groß) | 0.994 | < 0.001 | < 0.001 | ja | gemessen |
| 3 | node-express-sse vs. php-laravel-sse | baseline | 90 | 0.001 [-0.030, 0.032] | 0.013 (vernachlässigbar) | 0.007 | 0.953 | 1.000 | nein | gemessen |
| 3 | node-express-sse vs. php-laravel-sse | medium | 90 | 0.076 [0.054, 0.094] | 0.469 (mittel) | 0.647 | < 0.001 | < 0.001 | ja | gemessen |
| 3 | node-express-sse vs. php-laravel-sse | stress | 90 | 2.138 [2.077, 2.185] | 1.000 (groß) | 1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 4 | node-express-ws vs. php-laravel-ws | baseline | 90 | -2.065 [-2.082, -2.052] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 4 | node-express-ws vs. php-laravel-ws | medium | 90 | -2.251 [-2.285, -2.218] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 4 | node-express-ws vs. php-laravel-ws | stress | 90 | -2.350 [-2.406, -2.246] | -0.958 (groß) | -0.991 | < 0.001 | < 0.001 | ja | gemessen |
| 5 | node-minimal-sse vs. node-express-sse | baseline | 90 | 0.004 [-0.011, 0.019] | 0.088 (vernachlässigbar) | 0.098 | 0.421 | 1.000 | nein | gemessen |
| 5 | node-minimal-sse vs. node-express-sse | medium | 90 | -0.004 [-0.025, 0.026] | -0.077 (vernachlässigbar) | -0.078 | 0.522 | 1.000 | nein | gemessen |
| 5 | node-minimal-sse vs. node-express-sse | stress | 90 | -0.141 [-0.259, -0.113] | -0.344 (mittel) | -0.295 | 0.015 | 0.183 | nein | gemessen |
| 6 | node-minimal-ws vs. node-express-ws | baseline | 90 | -0.010 [-0.036, 0.019] | -0.063 (vernachlässigbar) | -0.117 | 0.337 | 1.000 | nein | gemessen |
| 6 | node-minimal-ws vs. node-express-ws | medium | 90 | -0.007 [-0.041, 0.024] | -0.047 (vernachlässigbar) | -0.095 | 0.436 | 1.000 | nein | gemessen |
| 6 | node-minimal-ws vs. node-express-ws | stress | 90 | -0.642 [-0.701, -0.604] | -0.684 (groß) | -0.704 | < 0.001 | < 0.001 | ja | gemessen |
| 7 | php-minimal-sse vs. php-laravel-sse | baseline | 90 | -0.025 [-0.052, 0.007] | -0.146 (vernachlässigbar) | -0.187 | 0.125 | 1.000 | nein | gemessen |
| 7 | php-minimal-sse vs. php-laravel-sse | medium | 90 | -0.013 [-0.023, 0.012] | -0.016 (vernachlässigbar) | -0.060 | 0.625 | 1.000 | nein | gemessen |
| 7 | php-minimal-sse vs. php-laravel-sse | stress | 90 | -0.072 [-0.125, -0.026] | -0.375 (mittel) | -0.448 | < 0.001 | 0.003 | ja | gemessen |
| 8 | php-minimal-ws vs. php-laravel-ws | baseline | 90 | -2.058 [-2.091, -2.030] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 8 | php-minimal-ws vs. php-laravel-ws | medium | 90 | -2.114 [-2.139, -2.090] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 8 | php-minimal-ws vs. php-laravel-ws | stress | 90 | -3.800 [-3.898, -3.689] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 9 | node-express-sse vs. node-express-sse-queue | baseline | 90 | -0.938 [-0.967, -0.918] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 9 | node-express-sse vs. node-express-sse-queue | medium | 90 | -1.152 [-1.180, -1.079] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 9 | node-express-sse vs. node-express-sse-queue | stress | 90 | -1.251 [-1.453, -1.141] | -0.759 (groß) | -0.876 | < 0.001 | < 0.001 | ja | gemessen |
| 10 | php-laravel-sse vs. php-laravel-sse-queue | baseline | 90 | -1.132 [-1.222, -1.101] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 10 | php-laravel-sse vs. php-laravel-sse-queue | medium | 90 | -1.057 [-1.095, -1.032] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 10 | php-laravel-sse vs. php-laravel-sse-queue | stress | 90 | -1.337 [-1.427, -1.257] | -0.981 (groß) | -0.998 | < 0.001 | < 0.001 | ja | gemessen |
| 11 | node-express-sse-queue vs. php-laravel-sse-queue | baseline | 90 | -0.142 [-0.191, -0.093] | -0.449 (mittel) | -0.578 | < 0.001 | < 0.001 | ja | gemessen |
| 11 | node-express-sse-queue vs. php-laravel-sse-queue | medium | 90 | 0.076 [0.042, 0.126] | 0.350 (mittel) | 0.469 | < 0.001 | 0.002 | ja | gemessen |
| 11 | node-express-sse-queue vs. php-laravel-sse-queue | stress | 90 | 1.928 [1.727, 2.213] | 1.000 (groß) | 1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 12 | node-minimal-sse vs. node-minimal-ws | baseline | 90 | 0.018 [-0.008, 0.047] | 0.081 (vernachlässigbar) | 0.188 | 0.125 | 1.000 | nein | gemessen |
| 12 | node-minimal-sse vs. node-minimal-ws | medium | 90 | 0.063 [0.035, 0.077] | 0.400 (mittel) | 0.508 | < 0.001 | < 0.001 | ja | gemessen |
| 12 | node-minimal-sse vs. node-minimal-ws | stress | 90 | 1.167 [1.125, 1.261] | 0.676 (groß) | 0.761 | < 0.001 | < 0.001 | ja | gemessen |
| 13 | php-minimal-sse vs. php-minimal-ws | baseline | 90 | -0.011 [-0.042, 0.016] | -0.115 (vernachlässigbar) | -0.115 | 0.343 | 1.000 | nein | gemessen |
| 13 | php-minimal-sse vs. php-minimal-ws | medium | 90 | -0.077 [-0.107, -0.056] | -0.688 (groß) | -0.859 | < 0.001 | < 0.001 | ja | gemessen |
| 13 | php-minimal-sse vs. php-minimal-ws | stress | 90 | 0.154 [0.084, 0.220] | 0.372 (mittel) | 0.355 | 0.003 | 0.049 | ja | gemessen |

## cpu_seconds_total (sekundär, Block 1, m = 39)

CPU-Zeit von Zelle und Redis pro Lauf (DECISIONS.md 5.16)

| Nr. | A vs. B | Laststufe | Paare | Median-Diff in s [95-%-KI] | Cliff's δ | r (rangbiserial) | p | p (Holm) | signifikant | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | node-minimal-sse vs. php-minimal-sse | baseline | 90 | -0.029 [-0.030, -0.028] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 1 | node-minimal-sse vs. php-minimal-sse | medium | 90 | -0.152 [-0.154, -0.150] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 1 | node-minimal-sse vs. php-minimal-sse | stress | 90 | -1.508 [-1.523, -1.490] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 2 | node-minimal-ws vs. php-minimal-ws | baseline | 90 | 0.016 [0.014, 0.018] | 0.984 (groß) | 0.999 | < 0.001 | < 0.001 | ja | gemessen |
| 2 | node-minimal-ws vs. php-minimal-ws | medium | 90 | 0.067 [0.064, 0.074] | 1.000 (groß) | 1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 2 | node-minimal-ws vs. php-minimal-ws | stress | 90 | 0.320 [0.296, 0.344] | 0.968 (groß) | 1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 3 | node-express-sse vs. php-laravel-sse | baseline | 90 | -0.085 [-0.087, -0.084] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 3 | node-express-sse vs. php-laravel-sse | medium | 90 | -0.397 [-0.398, -0.395] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 3 | node-express-sse vs. php-laravel-sse | stress | 90 | -3.980 [-3.994, -3.959] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 4 | node-express-ws vs. php-laravel-ws | baseline | 90 | -0.140 [-0.142, -0.138] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 4 | node-express-ws vs. php-laravel-ws | medium | 90 | -0.116 [-0.121, -0.110] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 4 | node-express-ws vs. php-laravel-ws | stress | 90 | -0.291 [-0.302, -0.280] | -0.832 (groß) | -0.966 | < 0.001 | < 0.001 | ja | gemessen |
| 5 | node-minimal-sse vs. node-express-sse | baseline | 90 | -0.000 [-0.001, 0.001] | 0.060 (vernachlässigbar) | -0.065 | 0.594 | 1.000 | nein | gemessen |
| 5 | node-minimal-sse vs. node-express-sse | medium | 90 | -0.009 [-0.011, -0.006] | -0.376 (mittel) | -0.353 | 0.004 | 0.015 | ja | gemessen |
| 5 | node-minimal-sse vs. node-express-sse | stress | 90 | -0.027 [-0.042, -0.013] | -0.178 (klein) | -0.230 | 0.059 | 0.176 | nein | gemessen |
| 6 | node-minimal-ws vs. node-express-ws | baseline | 90 | -0.004 [-0.007, -0.002] | -0.557 (groß) | -0.664 | < 0.001 | < 0.001 | ja | gemessen |
| 6 | node-minimal-ws vs. node-express-ws | medium | 90 | 0.000 [-0.002, 0.003] | 0.070 (vernachlässigbar) | 0.028 | 0.819 | 1.000 | nein | gemessen |
| 6 | node-minimal-ws vs. node-express-ws | stress | 90 | -0.104 [-0.115, -0.091] | -0.674 (groß) | -0.720 | < 0.001 | < 0.001 | ja | gemessen |
| 7 | php-minimal-sse vs. php-laravel-sse | baseline | 90 | -0.060 [-0.060, -0.059] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 7 | php-minimal-sse vs. php-laravel-sse | medium | 90 | -0.266 [-0.269, -0.264] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 7 | php-minimal-sse vs. php-laravel-sse | stress | 90 | -2.497 [-2.507, -2.492] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 8 | php-minimal-ws vs. php-laravel-ws | baseline | 90 | -0.154 [-0.155, -0.153] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 8 | php-minimal-ws vs. php-laravel-ws | medium | 90 | -0.186 [-0.188, -0.184] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 8 | php-minimal-ws vs. php-laravel-ws | stress | 90 | -0.718 [-0.730, -0.711] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 9 | node-express-sse vs. node-express-sse-queue | baseline | 90 | -0.152 [-0.154, -0.151] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 9 | node-express-sse vs. node-express-sse-queue | medium | 90 | -0.195 [-0.200, -0.188] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 9 | node-express-sse vs. node-express-sse-queue | stress | 90 | -0.212 [-0.242, -0.189] | -0.776 (groß) | -0.931 | < 0.001 | < 0.001 | ja | gemessen |
| 10 | php-laravel-sse vs. php-laravel-sse-queue | baseline | 90 | -0.186 [-0.187, -0.185] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 10 | php-laravel-sse vs. php-laravel-sse-queue | medium | 90 | -0.192 [-0.194, -0.191] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 10 | php-laravel-sse vs. php-laravel-sse-queue | stress | 90 | -0.310 [-0.319, -0.298] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 11 | node-express-sse-queue vs. php-laravel-sse-queue | baseline | 90 | -0.098 [-0.100, -0.093] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 11 | node-express-sse-queue vs. php-laravel-sse-queue | medium | 90 | -0.392 [-0.397, -0.388] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 11 | node-express-sse-queue vs. php-laravel-sse-queue | stress | 90 | -4.112 [-4.159, -4.060] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 12 | node-minimal-sse vs. node-minimal-ws | baseline | 90 | -0.003 [-0.004, -0.001] | -0.327 (klein) | -0.498 | < 0.001 | < 0.001 | ja | gemessen |
| 12 | node-minimal-sse vs. node-minimal-ws | medium | 90 | 0.006 [0.004, 0.008] | 0.395 (mittel) | 0.362 | 0.003 | 0.015 | ja | gemessen |
| 12 | node-minimal-sse vs. node-minimal-ws | stress | 90 | 0.128 [0.119, 0.151] | 0.662 (groß) | 0.630 | < 0.001 | < 0.001 | ja | gemessen |
| 13 | php-minimal-sse vs. php-minimal-ws | baseline | 90 | 0.042 [0.041, 0.042] | 1.000 (groß) | 1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 13 | php-minimal-sse vs. php-minimal-ws | medium | 90 | 0.212 [0.210, 0.213] | 1.000 (groß) | 1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 13 | php-minimal-sse vs. php-minimal-ws | stress | 90 | 1.954 [1.949, 1.960] | 1.000 (groß) | 1.000 | < 0.001 | < 0.001 | ja | gemessen |

## working_set_peak_bytes_total (sekundär, Block 1, m = 39)

Spitze des Speicher-Working-Sets von Zelle und Redis pro Lauf (DECISIONS.md 5.16)

| Nr. | A vs. B | Laststufe | Paare | Median-Diff in MiB [95-%-KI] | Cliff's δ | r (rangbiserial) | p | p (Holm) | signifikant | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | node-minimal-sse vs. php-minimal-sse | baseline | 90 | -330.9 [-331.1, -329.8] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 1 | node-minimal-sse vs. php-minimal-sse | medium | 90 | -335.0 [-335.6, -334.1] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 1 | node-minimal-sse vs. php-minimal-sse | stress | 90 | -334.3 [-334.7, -334.1] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 2 | node-minimal-ws vs. php-minimal-ws | baseline | 90 | 8.1 [7.6, 8.6] | 1.000 (groß) | 1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 2 | node-minimal-ws vs. php-minimal-ws | medium | 90 | 13.8 [13.4, 14.1] | 1.000 (groß) | 1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 2 | node-minimal-ws vs. php-minimal-ws | stress | 90 | 15.7 [15.5, 16.0] | 1.000 (groß) | 1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 3 | node-express-sse vs. php-laravel-sse | baseline | 90 | -1033.7 [-1035.7, -1030.9] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 3 | node-express-sse vs. php-laravel-sse | medium | 90 | -1055.1 [-1056.0, -1054.2] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 3 | node-express-sse vs. php-laravel-sse | stress | 90 | -1026.3 [-1028.8, -1022.6] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 4 | node-express-ws vs. php-laravel-ws | baseline | 90 | -44.8 [-45.3, -44.4] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 4 | node-express-ws vs. php-laravel-ws | medium | 90 | -39.3 [-39.8, -39.0] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 4 | node-express-ws vs. php-laravel-ws | stress | 90 | -37.1 [-37.3, -37.0] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 5 | node-minimal-sse vs. node-express-sse | baseline | 90 | -2.2 [-2.2, -2.0] | -0.577 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 5 | node-minimal-sse vs. node-express-sse | medium | 90 | -1.4 [-1.5, -1.3] | -0.687 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 5 | node-minimal-sse vs. node-express-sse | stress | 90 | -2.3 [-2.7, -2.0] | -0.846 (groß) | -0.964 | < 0.001 | < 0.001 | ja | gemessen |
| 6 | node-minimal-ws vs. node-express-ws | baseline | 90 | 4.2 [3.9, 4.6] | 1.000 (groß) | 1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 6 | node-minimal-ws vs. node-express-ws | medium | 90 | -1.0 [-1.1, -0.9] | -0.442 (mittel) | -0.970 | < 0.001 | < 0.001 | ja | gemessen |
| 6 | node-minimal-ws vs. node-express-ws | stress | 90 | -1.2 [-1.4, -0.9] | -0.645 (groß) | -0.836 | < 0.001 | < 0.001 | ja | gemessen |
| 7 | php-minimal-sse vs. php-laravel-sse | baseline | 90 | -700.0 [-701.9, -698.7] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 7 | php-minimal-sse vs. php-laravel-sse | medium | 90 | -702.8 [-704.3, -701.7] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 7 | php-minimal-sse vs. php-laravel-sse | stress | 90 | -700.4 [-702.5, -698.3] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 8 | php-minimal-ws vs. php-laravel-ws | baseline | 90 | -52.0 [-52.1, -52.0] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 8 | php-minimal-ws vs. php-laravel-ws | medium | 90 | -54.1 [-54.2, -54.0] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 8 | php-minimal-ws vs. php-laravel-ws | stress | 90 | -54.0 [-54.1, -53.9] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 9 | node-express-sse vs. node-express-sse-queue | baseline | 90 | -42.8 [-43.1, -41.6] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 9 | node-express-sse vs. node-express-sse-queue | medium | 90 | -39.2 [-39.4, -38.8] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 9 | node-express-sse vs. node-express-sse-queue | stress | 90 | -44.3 [-45.1, -43.7] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 10 | php-laravel-sse vs. php-laravel-sse-queue | baseline | 90 | -27.8 [-28.1, -26.7] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 10 | php-laravel-sse vs. php-laravel-sse-queue | medium | 90 | -18.5 [-18.6, -18.2] | -0.924 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 10 | php-laravel-sse vs. php-laravel-sse-queue | stress | 90 | -21.8 [-22.0, -21.7] | -0.997 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 11 | node-express-sse-queue vs. php-laravel-sse-queue | baseline | 90 | -1025.4 [-1028.5, -1022.7] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 11 | node-express-sse-queue vs. php-laravel-sse-queue | medium | 90 | -1012.9 [-1015.9, -1011.0] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 11 | node-express-sse-queue vs. php-laravel-sse-queue | stress | 90 | -1027.7 [-1029.8, -1025.4] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 12 | node-minimal-sse vs. node-minimal-ws | baseline | 90 | 3.5 [3.3, 3.6] | 0.971 (groß) | 1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 12 | node-minimal-sse vs. node-minimal-ws | medium | 90 | 4.2 [3.9, 4.4] | 1.000 (groß) | 1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 12 | node-minimal-sse vs. node-minimal-ws | stress | 90 | 6.8 [6.5, 7.4] | 1.000 (groß) | 1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 13 | php-minimal-sse vs. php-minimal-ws | baseline | 90 | 346.6 [345.4, 346.8] | 1.000 (groß) | 1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 13 | php-minimal-sse vs. php-minimal-ws | medium | 90 | 346.9 [345.5, 347.3] | 1.000 (groß) | 1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 13 | php-minimal-sse vs. php-minimal-ws | stress | 90 | 354.6 [354.5, 354.7] | 1.000 (groß) | 1.000 | < 0.001 | < 0.001 | ja | gemessen |

## connect_mean_ms (sekundär, Block 1, m = 39)

Mittlere Dauer des Verbindungsaufbaus pro Lauf (DECISIONS.md 5.8, 5.9)

| Nr. | A vs. B | Laststufe | Paare | Median-Diff in ms [95-%-KI] | Cliff's δ | r (rangbiserial) | p | p (Holm) | signifikant | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | node-minimal-sse vs. php-minimal-sse | baseline | 90 | 0.100 [0.000, 0.200] | 0.284 (klein) | 0.400 | 0.002 | 0.029 | ja | gemessen |
| 1 | node-minimal-sse vs. php-minimal-sse | medium | 90 | 0.060 [0.040, 0.100] | 0.367 (mittel) | 0.498 | < 0.001 | < 0.001 | ja | gemessen |
| 1 | node-minimal-sse vs. php-minimal-sse | stress | 90 | 0.008 [-0.013, 0.028] | 0.107 (vernachlässigbar) | 0.167 | 0.172 | 1.000 | nein | gemessen |
| 2 | node-minimal-ws vs. php-minimal-ws | baseline | 90 | -0.100 [-0.100, 0.050] | -0.135 (vernachlässigbar) | -0.161 | 0.205 | 1.000 | nein | gemessen |
| 2 | node-minimal-ws vs. php-minimal-ws | medium | 90 | -0.070 [-0.100, -0.020] | -0.435 (mittel) | -0.463 | < 0.001 | 0.003 | ja | gemessen |
| 2 | node-minimal-ws vs. php-minimal-ws | stress | 90 | -0.390 [-0.413, -0.376] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 3 | node-express-sse vs. php-laravel-sse | baseline | 90 | -5.500 [-5.600, -5.400] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 3 | node-express-sse vs. php-laravel-sse | medium | 90 | -5.010 [-5.060, -4.970] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 3 | node-express-sse vs. php-laravel-sse | stress | 90 | -4.934 [-4.946, -4.916] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 4 | node-express-ws vs. php-laravel-ws | baseline | 90 | -0.400 [-0.450, -0.300] | -0.839 (groß) | -0.958 | < 0.001 | < 0.001 | ja | gemessen |
| 4 | node-express-ws vs. php-laravel-ws | medium | 90 | -0.460 [-0.500, -0.400] | -0.957 (groß) | -0.992 | < 0.001 | < 0.001 | ja | gemessen |
| 4 | node-express-ws vs. php-laravel-ws | stress | 90 | -0.727 [-0.740, -0.703] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 5 | node-minimal-sse vs. node-express-sse | baseline | 90 | -0.100 [-0.200, 0.000] | -0.396 (mittel) | -0.642 | < 0.001 | < 0.001 | ja | gemessen |
| 5 | node-minimal-sse vs. node-express-sse | medium | 90 | -0.060 [-0.120, -0.040] | -0.443 (mittel) | -0.457 | < 0.001 | 0.003 | ja | gemessen |
| 5 | node-minimal-sse vs. node-express-sse | stress | 90 | -0.038 [-0.050, -0.021] | -0.396 (mittel) | -0.525 | < 0.001 | < 0.001 | ja | gemessen |
| 6 | node-minimal-ws vs. node-express-ws | baseline | 90 | 0.000 [-0.100, 0.000] | -0.084 (vernachlässigbar) | -0.134 | 0.320 | 1.000 | nein | gemessen |
| 6 | node-minimal-ws vs. node-express-ws | medium | 90 | -0.020 [-0.070, 0.020] | -0.116 (vernachlässigbar) | -0.179 | 0.149 | 1.000 | nein | gemessen |
| 6 | node-minimal-ws vs. node-express-ws | stress | 90 | -0.023 [-0.046, 0.004] | -0.233 (klein) | -0.348 | 0.004 | 0.053 | nein | gemessen |
| 7 | php-minimal-sse vs. php-laravel-sse | baseline | 90 | -5.900 [-6.000, -5.900] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 7 | php-minimal-sse vs. php-laravel-sse | medium | 90 | -5.220 [-5.260, -5.180] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 7 | php-minimal-sse vs. php-laravel-sse | stress | 90 | -5.018 [-5.033, -5.001] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 8 | php-minimal-ws vs. php-laravel-ws | baseline | 90 | -0.300 [-0.300, -0.200] | -0.738 (groß) | -0.901 | < 0.001 | < 0.001 | ja | gemessen |
| 8 | php-minimal-ws vs. php-laravel-ws | medium | 90 | -0.300 [-0.360, -0.260] | -0.883 (groß) | -0.982 | < 0.001 | < 0.001 | ja | gemessen |
| 8 | php-minimal-ws vs. php-laravel-ws | stress | 90 | -0.329 [-0.343, -0.311] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 9 | node-express-sse vs. node-express-sse-queue | baseline | 90 | 0.000 [-0.100, 0.000] | -0.163 (klein) | -0.271 | 0.044 | 0.413 | nein | gemessen |
| 9 | node-express-sse vs. node-express-sse-queue | medium | 90 | -0.040 [-0.060, 0.000] | -0.203 (klein) | -0.281 | 0.027 | 0.300 | nein | gemessen |
| 9 | node-express-sse vs. node-express-sse-queue | stress | 90 | -0.006 [-0.019, 0.010] | -0.049 (vernachlässigbar) | -0.101 | 0.411 | 1.000 | nein | gemessen |
| 10 | php-laravel-sse vs. php-laravel-sse-queue | baseline | 90 | -0.050 [-0.100, 0.000] | -0.186 (klein) | -0.277 | 0.041 | 0.413 | nein | gemessen |
| 10 | php-laravel-sse vs. php-laravel-sse-queue | medium | 90 | 0.120 [0.040, 0.170] | 0.349 (mittel) | 0.512 | < 0.001 | < 0.001 | ja | gemessen |
| 10 | php-laravel-sse vs. php-laravel-sse-queue | stress | 90 | 0.013 [-0.009, 0.029] | 0.094 (vernachlässigbar) | 0.151 | 0.214 | 1.000 | nein | gemessen |
| 11 | node-express-sse-queue vs. php-laravel-sse-queue | baseline | 90 | -5.500 [-5.600, -5.400] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 11 | node-express-sse-queue vs. php-laravel-sse-queue | medium | 90 | -5.010 [-5.040, -4.960] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 11 | node-express-sse-queue vs. php-laravel-sse-queue | stress | 90 | -5.040 [-5.058, -5.010] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |
| 12 | node-minimal-sse vs. node-minimal-ws | baseline | 90 | 0.000 [-0.100, 0.100] | -0.023 (vernachlässigbar) | -0.036 | 0.778 | 1.000 | nein | gemessen |
| 12 | node-minimal-sse vs. node-minimal-ws | medium | 90 | 0.000 [-0.040, 0.040] | 0.084 (vernachlässigbar) | 0.016 | 0.899 | 1.000 | nein | gemessen |
| 12 | node-minimal-sse vs. node-minimal-ws | stress | 90 | 0.090 [0.062, 0.108] | 0.715 (groß) | 0.853 | < 0.001 | < 0.001 | ja | gemessen |
| 13 | php-minimal-sse vs. php-minimal-ws | baseline | 90 | -0.300 [-0.300, -0.200] | -0.546 (groß) | -0.748 | < 0.001 | < 0.001 | ja | gemessen |
| 13 | php-minimal-sse vs. php-minimal-ws | medium | 90 | -0.140 [-0.160, -0.110] | -0.630 (groß) | -0.736 | < 0.001 | < 0.001 | ja | gemessen |
| 13 | php-minimal-sse vs. php-minimal-ws | stress | 90 | -0.343 [-0.360, -0.331] | -1.000 (groß) | -1.000 | < 0.001 | < 0.001 | ja | gemessen |

## Replikation (Block 2 gegen Block 1)

Beschreibender Abgleich ohne eigene Signifikanzaussage. Ein Ergebnis gilt als repliziert, wenn Block 2 dieselbe Richtung der Median-Differenz zeigt und sich die 95-%-Konfidenzintervalle beider Blöcke überlappen. Die Effektklasse wird berichtet, ist aber keine Bedingung.

Eine Median-Differenz von genau 0 gilt als eigene Richtung. Die letzten beiden Spalten sind nur beschreibend und ändern die Regel nicht (DECISIONS.md 5.8).

| Messgröße | verglichen | repliziert | gleiche Richtung | KI überlappen | gleiche Effektklasse | KI Block 1 enthält 0 | Block 2 allein signifikant, gleiche Richtung (ohne Holm) |
|---|---|---|---|---|---|---|---|
| latency_mean_ms | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| cpu_seconds_total | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| working_set_peak_bytes_total | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| connect_mean_ms | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

## Sensitivitätsanalyse (Symmetrie, Hodges-Lehmann, Vorzeichentest)

Der Wilcoxon-Vorzeichen-Rang-Test bleibt der vorab festgelegte Test und entscheidet über alle Ergebnisse. Er setzt annähernd symmetrische Paardifferenzen voraus. Nur dann ist ein signifikantes Ergebnis eine Aussage über den Median der Differenzen, sonst über den Hodges-Lehmann-Pseudomedian (Median aller Walsh-Mittel). Diese Analyse ist beschreibend (DECISIONS.md 5.8). Sie zeigt je Test die Schiefe der Differenzen (Bowley aus Quartilen mit linearer Interpolation, Momenten-Schiefe aus Populationsmomenten), den Hodges-Lehmann-Schätzer über alle Differenzen und den exakten zweiseitigen Vorzeichentest, der keine Symmetrie braucht und den Median direkt prüft. Differenzen von genau 0 entfallen in beiden Tests. Beide Tests sind je Familie über dieselben 39 Tests nach Holm korrigiert. Für den Wiederholungsblock ist die Wilcoxon-Spalte nur beschreibend und ändert die Replikationsregel nicht.

### Block 1, Übersicht

| Messgröße | Tests | beide signifikant | nur Wilcoxon | nur Vorzeichentest | keiner | Bowley-Schiefe < 0,1 / < 0,3 / < 0,5 / ab 0,5 | Momenten-Schiefe < 0,5 / < 1 / < 2 / ab 2 | Abstand Median zu Hodges-Lehmann in IQR < 0,05 / < 0,1 / < 0,25 / ab 0,25 | stark schief (Bowley ab 0,5), davon alle Differenzen gleich gerichtet |
|---|---|---|---|---|---|---|---|---|---|
| latency_mean_ms | 39 | 25 | 1 | 1 | 12 | 17 / 20 / 2 / 0 | 30 / 4 / 5 / 0 | 21 / 13 / 5 / 0 | 0, 0 |
| cpu_seconds_total | 39 | 36 | 0 | 1 | 2 | 14 / 19 / 6 / 0 | 22 / 10 / 7 / 0 | 17 / 15 / 7 / 0 | 0, 0 |
| working_set_peak_bytes_total | 39 | 39 | 0 | 0 | 0 | 12 / 17 / 5 / 5 | 27 / 8 / 3 / 1 | 14 / 13 / 9 / 3 | 5, 5 |
| connect_mean_ms | 39 | 26 | 1 | 0 | 12 | 23 / 10 / 6 / 0 | 30 / 5 / 2 / 2 | 26 / 9 / 4 / 0 | 0, 0 |

Unterschiedliche Testentscheide: 4. Gegensätzliche Richtungen (Median gegen Hodges-Lehmann oder Wilcoxon gegen Vorzeichentest): 1. Signifikante Tests, deren Median gegen die Richtung des Wilcoxon-Tests zeigt: 0.

### Block 1, je Test, latency_mean_ms

| Nr. | Laststufe | Median-Diff (ms) | Hodges-Lehmann (ms) | Bowley | Momente | Vorzeichen +/− | Vorzeichentest p (Holm) | Vorzeichentest signifikant | Wilcoxon p (Holm) | Wilcoxon signifikant | Cliff's δ |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | baseline | -0.001 | 0.003 | 0.19 | 0.09 | +43/−45/0:2 | 1.000 | nein | 1.000 | nein | 0.03 |
| 1 | medium | 0.029 | 0.030 | 0.07 | -0.16 | +56/−34 | 0.316 | nein | 0.054 | nein | 0.23 |
| 1 | stress | 2.208 | 2.254 | 0.28 | 1.22 | +90/−0 | < 0.001 | ja | < 0.001 | ja | 1.00 |
| 2 | baseline | -0.005 | -0.004 | 0.02 | 0.36 | +40/−47/0:3 | 1.000 | nein | 1.000 | nein | -0.03 |
| 2 | medium | -0.089 | -0.083 | 0.08 | 0.39 | +17/−73 | < 0.001 | ja | < 0.001 | ja | -0.60 |
| 2 | stress | 0.711 | 0.758 | 0.29 | 1.31 | +87/−3 | < 0.001 | ja | < 0.001 | ja | 0.93 |
| 3 | baseline | 0.001 | 0.001 | -0.12 | -0.01 | +45/−44/0:1 | 1.000 | nein | 1.000 | nein | 0.01 |
| 3 | medium | 0.076 | 0.075 | 0.00 | 0.37 | +69/−21 | < 0.001 | ja | < 0.001 | ja | 0.47 |
| 3 | stress | 2.138 | 2.155 | -0.02 | 1.46 | +90/−0 | < 0.001 | ja | < 0.001 | ja | 1.00 |
| 4 | baseline | -2.065 | -2.063 | 0.03 | 0.18 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 4 | medium | -2.251 | -2.249 | -0.11 | 0.22 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 4 | stress | -2.350 | -2.292 | 0.26 | 1.69 | +3/−87 | < 0.001 | ja | < 0.001 | ja | -0.96 |
| 5 | baseline | 0.004 | 0.007 | 0.01 | 0.38 | +48/−41/0:1 | 1.000 | nein | 1.000 | nein | 0.09 |
| 5 | medium | -0.004 | -0.006 | -0.03 | -0.25 | +43/−47 | 1.000 | nein | 1.000 | nein | -0.08 |
| 5 | stress | -0.141 | -0.173 | -0.04 | -0.12 | +27/−63 | 0.003 | ja **(abweichend)** | 0.183 | nein | -0.34 |
| 6 | baseline | -0.010 | -0.012 | -0.10 | 0.04 | +43/−46/0:1 | 1.000 | nein | 1.000 | nein | -0.06 |
| 6 | medium | -0.007 | -0.009 | -0.06 | 0.28 | +43/−47 | 1.000 | nein | 1.000 | nein | -0.05 |
| 6 | stress | -0.642 | -0.660 | -0.13 | -0.30 | +13/−77 | < 0.001 | ja | < 0.001 | ja | -0.68 |
| 7 | baseline | -0.025 | -0.019 | 0.09 | -0.13 | +36/−53/0:1 | 0.983 | nein | 1.000 | nein | -0.15 |
| 7 | medium | -0.013 | -0.005 | 0.22 | 0.23 | +38/−52 | 1.000 | nein | 1.000 | nein | -0.02 |
| 7 | stress | -0.072 | -0.084 | -0.10 | -0.67 | +29/−61 | 0.014 | ja | 0.003 | ja | -0.37 |
| 8 | baseline | -2.058 | -2.063 | -0.16 | -0.02 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 8 | medium | -2.114 | -2.108 | 0.14 | 0.60 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 8 | stress | -3.800 | -3.763 | 0.04 | 0.57 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 9 | baseline | -0.938 | -0.927 | 0.17 | -0.19 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 9 | medium | -1.152 | -1.132 | 0.19 | 0.31 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 9 | stress | -1.251 | -1.345 | -0.37 | 0.44 | +11/−79 | < 0.001 | ja | < 0.001 | ja | -0.76 |
| 10 | baseline | -1.132 | -1.172 | -0.36 | -0.09 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 10 | medium | -1.057 | -1.068 | -0.00 | -0.24 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 10 | stress | -1.337 | -1.325 | 0.05 | 0.09 | +2/−88 | < 0.001 | ja | < 0.001 | ja | -0.98 |
| 11 | baseline | -0.142 | -0.134 | 0.08 | 0.24 | +23/−67 | < 0.001 | ja | < 0.001 | ja | -0.45 |
| 11 | medium | 0.076 | 0.076 | -0.10 | 0.43 | +59/−31 | 0.054 | nein **(abweichend)** | 0.002 | ja | 0.35 |
| 11 | stress | 1.928 | 2.081 | 0.30 | 0.64 | +90/−0 | < 0.001 | ja | < 0.001 | ja | 1.00 |
| 12 | baseline | 0.018 | 0.017 | 0.13 | -0.45 | +51/−38/0:1 | 1.000 | nein | 1.000 | nein | 0.08 |
| 12 | medium | 0.063 | 0.054 | -0.20 | -0.02 | +63/−26/0:1 | 0.002 | ja | < 0.001 | ja | 0.40 |
| 12 | stress | 1.167 | 1.181 | 0.19 | -0.20 | +74/−16 | < 0.001 | ja | < 0.001 | ja | 0.68 |
| 13 | baseline | -0.011 | -0.013 | 0.07 | -0.03 | +43/−47 | 1.000 | nein | 1.000 | nein | -0.12 |
| 13 | medium | -0.077 | -0.087 | -0.16 | -0.19 | +14/−76 | < 0.001 | ja | < 0.001 | ja | -0.69 |
| 13 | stress | 0.154 | 0.126 | -0.24 | -1.24 | +63/−27 | 0.003 | ja | 0.049 | ja | 0.37 |

### Block 1, je Test, cpu_seconds_total

| Nr. | Laststufe | Median-Diff (s) | Hodges-Lehmann (s) | Bowley | Momente | Vorzeichen +/− | Vorzeichentest p (Holm) | Vorzeichentest signifikant | Wilcoxon p (Holm) | Wilcoxon signifikant | Cliff's δ |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | baseline | -0.029 | -0.029 | 0.21 | -0.36 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 1 | medium | -0.152 | -0.151 | 0.14 | 1.08 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 1 | stress | -1.508 | -1.492 | 0.40 | 1.33 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 2 | baseline | 0.016 | 0.017 | 0.18 | 0.47 | +89/−1 | < 0.001 | ja | < 0.001 | ja | 0.98 |
| 2 | medium | 0.067 | 0.072 | 0.49 | 0.85 | +90/−0 | < 0.001 | ja | < 0.001 | ja | 1.00 |
| 2 | stress | 0.320 | 0.324 | -0.00 | 0.61 | +89/−1 | < 0.001 | ja | < 0.001 | ja | 0.97 |
| 3 | baseline | -0.085 | -0.084 | 0.38 | 1.73 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 3 | medium | -0.397 | -0.394 | 0.40 | 0.88 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 3 | stress | -3.980 | -3.968 | 0.22 | 1.41 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 4 | baseline | -0.140 | -0.139 | 0.03 | 0.60 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 4 | medium | -0.116 | -0.110 | 0.40 | 0.53 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 4 | stress | -0.291 | -0.286 | 0.21 | 0.62 | +10/−80 | < 0.001 | ja | < 0.001 | ja | -0.83 |
| 5 | baseline | -0.000 | -0.000 | -0.17 | -0.25 | +45/−45 | 1.000 | nein | 1.000 | nein | 0.06 |
| 5 | medium | -0.009 | -0.008 | 0.22 | -0.32 | +27/−63 | 0.001 | ja | 0.015 | ja | -0.38 |
| 5 | stress | -0.027 | -0.024 | 0.18 | -0.07 | +33/−57 | 0.045 | ja **(abweichend)** | 0.176 | nein | -0.18 |
| 6 | baseline | -0.004 | -0.005 | -0.19 | 0.42 | +19/−71 | < 0.001 | ja | < 0.001 | ja | -0.56 |
| 6 | medium | 0.000 | 0.000 | 0.06 | 0.30 | +47/−43 | 1.000 | nein | 1.000 | nein | 0.07 |
| 6 | stress | -0.104 | -0.109 | -0.18 | -0.29 | +12/−78 | < 0.001 | ja | < 0.001 | ja | -0.67 |
| 7 | baseline | -0.060 | -0.060 | 0.14 | 0.69 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 7 | medium | -0.266 | -0.267 | 0.01 | 0.19 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 7 | stress | -2.497 | -2.501 | -0.25 | -0.74 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 8 | baseline | -0.154 | -0.154 | 0.19 | -1.00 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 8 | medium | -0.186 | -0.185 | 0.20 | 0.15 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 8 | stress | -0.718 | -0.719 | -0.07 | 0.13 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 9 | baseline | -0.152 | -0.152 | -0.07 | -0.17 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 9 | medium | -0.195 | -0.194 | 0.04 | -0.20 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 9 | stress | -0.212 | -0.220 | -0.39 | 0.40 | +12/−78 | < 0.001 | ja | < 0.001 | ja | -0.78 |
| 10 | baseline | -0.186 | -0.186 | 0.07 | 0.46 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 10 | medium | -0.192 | -0.192 | -0.02 | -0.15 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 10 | stress | -0.310 | -0.309 | 0.08 | 0.06 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 11 | baseline | -0.098 | -0.095 | 0.21 | 1.42 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 11 | medium | -0.392 | -0.390 | 0.14 | 1.22 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 11 | stress | -4.112 | -4.098 | 0.06 | 0.52 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 12 | baseline | -0.003 | -0.003 | -0.01 | -0.27 | +32/−58 | 0.032 | ja | < 0.001 | ja | -0.33 |
| 12 | medium | 0.006 | 0.006 | 0.05 | -0.07 | +61/−29 | 0.005 | ja | 0.015 | ja | 0.40 |
| 12 | stress | 0.128 | 0.130 | -0.07 | -0.29 | +74/−16 | < 0.001 | ja | < 0.001 | ja | 0.66 |
| 13 | baseline | 0.042 | 0.042 | -0.22 | 0.13 | +90/−0 | < 0.001 | ja | < 0.001 | ja | 1.00 |
| 13 | medium | 0.212 | 0.212 | 0.21 | 0.12 | +90/−0 | < 0.001 | ja | < 0.001 | ja | 1.00 |
| 13 | stress | 1.954 | 1.951 | -0.17 | -1.78 | +90/−0 | < 0.001 | ja | < 0.001 | ja | 1.00 |

### Block 1, je Test, working_set_peak_bytes_total

| Nr. | Laststufe | Median-Diff (MiB) | Hodges-Lehmann (MiB) | Bowley | Momente | Vorzeichen +/− | Vorzeichentest p (Holm) | Vorzeichentest signifikant | Wilcoxon p (Holm) | Wilcoxon signifikant | Cliff's δ |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | baseline | -330.9 | -329.7 | 0.78 | 0.93 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 1 | medium | -335.0 | -334.8 | 0.14 | 0.41 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 1 | stress | -334.3 | -334.3 | -0.04 | 0.53 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 2 | baseline | 8.1 | 8.2 | 0.12 | 0.25 | +90/−0 | < 0.001 | ja | < 0.001 | ja | 1.00 |
| 2 | medium | 13.8 | 13.3 | -0.59 | -1.12 | +90/−0 | < 0.001 | ja | < 0.001 | ja | 1.00 |
| 2 | stress | 15.7 | 15.7 | 0.15 | -0.22 | +90/−0 | < 0.001 | ja | < 0.001 | ja | 1.00 |
| 3 | baseline | -1033.7 | -1032.6 | 0.20 | 0.30 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 3 | medium | -1055.1 | -1055.9 | -0.39 | -0.47 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 3 | stress | -1026.3 | -1025.4 | 0.12 | 0.20 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 4 | baseline | -44.8 | -44.9 | -0.05 | -0.04 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 4 | medium | -39.3 | -39.7 | -0.57 | -1.21 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 4 | stress | -37.1 | -37.1 | 0.09 | 0.60 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 5 | baseline | -2.2 | -2.1 | 0.26 | 0.33 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -0.58 |
| 5 | medium | -1.4 | -1.4 | 0.01 | -0.14 | +1/−89 | < 0.001 | ja | < 0.001 | ja | -0.69 |
| 5 | stress | -2.3 | -2.4 | -0.07 | -0.58 | +5/−85 | < 0.001 | ja | < 0.001 | ja | -0.85 |
| 6 | baseline | 4.2 | 4.1 | -0.07 | -0.37 | +90/−0 | < 0.001 | ja | < 0.001 | ja | 1.00 |
| 6 | medium | -1.0 | -1.0 | 0.32 | 0.79 | +3/−87 | < 0.001 | ja | < 0.001 | ja | -0.44 |
| 6 | stress | -1.2 | -1.1 | 0.28 | 0.49 | +16/−74 | < 0.001 | ja | < 0.001 | ja | -0.64 |
| 7 | baseline | -700.0 | -700.9 | -0.28 | -0.33 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 7 | medium | -702.8 | -702.8 | -0.03 | 0.09 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 7 | stress | -700.4 | -700.0 | 0.11 | 0.12 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 8 | baseline | -52.0 | -52.0 | 0.14 | -3.17 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 8 | medium | -54.1 | -54.1 | 0.19 | 0.05 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 8 | stress | -54.0 | -54.0 | -0.03 | 0.24 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 9 | baseline | -42.8 | -42.4 | 0.29 | -0.38 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 9 | medium | -39.2 | -39.2 | -0.06 | 0.39 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 9 | stress | -44.3 | -44.3 | -0.16 | 0.17 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 10 | baseline | -27.8 | -27.2 | 0.54 | 0.46 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 10 | medium | -18.5 | -18.3 | 0.35 | 0.48 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -0.92 |
| 10 | stress | -21.8 | -21.9 | -0.18 | 1.23 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 11 | baseline | -1025.4 | -1024.7 | 0.32 | 0.22 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 11 | medium | -1012.9 | -1014.1 | -0.18 | -0.46 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 11 | stress | -1027.7 | -1027.3 | 0.04 | 0.10 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 12 | baseline | 3.5 | 3.5 | 0.06 | 0.11 | +90/−0 | < 0.001 | ja | < 0.001 | ja | 0.97 |
| 12 | medium | 4.2 | 4.3 | -0.01 | 0.86 | +90/−0 | < 0.001 | ja | < 0.001 | ja | 1.00 |
| 12 | stress | 6.8 | 7.0 | 0.27 | 0.38 | +90/−0 | < 0.001 | ja | < 0.001 | ja | 1.00 |
| 13 | baseline | 346.6 | 345.2 | -0.80 | -0.93 | +90/−0 | < 0.001 | ja | < 0.001 | ja | 1.00 |
| 13 | medium | 346.9 | 346.5 | -0.31 | -0.60 | +90/−0 | < 0.001 | ja | < 0.001 | ja | 1.00 |
| 13 | stress | 354.6 | 354.6 | -0.18 | -0.33 | +90/−0 | < 0.001 | ja | < 0.001 | ja | 1.00 |

### Block 1, je Test, connect_mean_ms

| Nr. | Laststufe | Median-Diff (ms) | Hodges-Lehmann (ms) | Bowley | Momente | Vorzeichen +/− | Vorzeichentest p (Holm) | Vorzeichentest signifikant | Wilcoxon p (Holm) | Wilcoxon signifikant | Cliff's δ |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | baseline | 0.100 | 0.100 | 0.00 | -0.26 | +50/−27/0:13 | 0.152 | nein **(abweichend)** | 0.029 | ja | 0.28 |
| 1 | medium | 0.060 | 0.070 | 0.11 | -0.36 | +63/−24/0:3 | < 0.001 | ja | < 0.001 | ja | 0.37 |
| 1 | stress | 0.008 | 0.010 | 0.05 | 0.15 | +48/−41/0:1 | 1.000 | nein | 1.000 | nein | 0.11 |
| 2 | baseline | -0.100 | -0.050 | 0.20 | -0.16 | +36/−46/0:8 | 1.000 | nein | 1.000 | nein | -0.13 |
| 2 | medium | -0.070 | -0.070 | -0.08 | 0.39 | +26/−59/0:5 | 0.007 | ja | 0.003 | ja | -0.44 |
| 2 | stress | -0.390 | -0.395 | -0.22 | 0.03 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 3 | baseline | -5.500 | -5.500 | 0.00 | 0.15 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 3 | medium | -5.010 | -5.000 | 0.08 | 0.71 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 3 | stress | -4.934 | -4.931 | 0.05 | 0.26 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 4 | baseline | -0.400 | -0.400 | 0.07 | -0.03 | +5/−80/0:5 | < 0.001 | ja | < 0.001 | ja | -0.84 |
| 4 | medium | -0.460 | -0.440 | 0.15 | 0.52 | +3/−86/0:1 | < 0.001 | ja | < 0.001 | ja | -0.96 |
| 4 | stress | -0.727 | -0.725 | 0.00 | -0.06 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 5 | baseline | -0.100 | -0.100 | -0.33 | -0.30 | +19/−53/0:18 | 0.001 | ja | < 0.001 | ja | -0.40 |
| 5 | medium | -0.060 | -0.060 | 0.00 | 0.23 | +29/−59/0:2 | 0.026 | ja | 0.003 | ja | -0.44 |
| 5 | stress | -0.038 | -0.036 | -0.04 | -0.09 | +26/−64 | 0.001 | ja | < 0.001 | ja | -0.40 |
| 6 | baseline | 0.000 | -0.050 | -0.33 | -0.18 | +32/−41/0:17 | 1.000 | nein | 1.000 | nein | -0.08 |
| 6 | medium | -0.020 | -0.020 | 0.00 | 0.35 | +38/−48/0:4 | 1.000 | nein | 1.000 | nein | -0.12 |
| 6 | stress | -0.023 | -0.022 | 0.03 | -0.05 | +36/−53/0:1 | 0.893 | nein | 0.053 | nein | -0.23 |
| 7 | baseline | -5.900 | -5.900 | 0.00 | 0.07 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 7 | medium | -5.220 | -5.220 | 0.03 | 0.32 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 7 | stress | -5.018 | -5.018 | -0.06 | 0.09 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 8 | baseline | -0.300 | -0.300 | 0.33 | -0.35 | +7/−77/0:6 | < 0.001 | ja | < 0.001 | ja | -0.74 |
| 8 | medium | -0.300 | -0.300 | 0.00 | -0.56 | +6/−81/0:3 | < 0.001 | ja | < 0.001 | ja | -0.88 |
| 8 | stress | -0.329 | -0.326 | 0.09 | 0.05 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 9 | baseline | 0.000 | -0.050 | -0.33 | 0.29 | +30/−43/0:17 | 1.000 | nein | 0.413 | nein | -0.16 |
| 9 | medium | -0.040 | -0.030 | 0.11 | -0.17 | +32/−50/0:8 | 0.658 | nein | 0.300 | nein | -0.20 |
| 9 | stress | -0.006 | -0.005 | -0.05 | -3.49 | +41/−47/0:2 | 1.000 | nein | 1.000 | nein | -0.05 |
| 10 | baseline | -0.050 | -0.050 | -0.20 | 1.30 | +27/−45/0:18 | 0.532 | nein | 0.413 | nein | -0.19 |
| 10 | medium | 0.120 | 0.120 | 0.07 | 3.98 | +64/−25/0:1 | < 0.001 | ja | < 0.001 | ja | 0.35 |
| 10 | stress | 0.013 | 0.009 | 0.00 | -0.43 | +49/−41 | 1.000 | nein | 1.000 | nein | 0.09 |
| 11 | baseline | -5.500 | -5.550 | -0.33 | -0.64 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 11 | medium | -5.010 | -4.990 | 0.16 | 0.86 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 11 | stress | -5.040 | -5.036 | 0.18 | -0.15 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |
| 12 | baseline | 0.000 | 0.000 | -0.07 | 0.20 | +38/−42/0:10 | 1.000 | nein | 1.000 | nein | -0.02 |
| 12 | medium | 0.000 | 0.000 | 0.09 | 1.10 | +43/−40/0:7 | 1.000 | nein | 1.000 | nein | 0.08 |
| 12 | stress | 0.090 | 0.082 | -0.19 | -0.26 | +80/−9/0:1 | < 0.001 | ja | < 0.001 | ja | 0.72 |
| 13 | baseline | -0.300 | -0.250 | 0.33 | 0.46 | +15/−69/0:6 | < 0.001 | ja | < 0.001 | ja | -0.55 |
| 13 | medium | -0.140 | -0.130 | 0.14 | -0.15 | +15/−71/0:4 | < 0.001 | ja | < 0.001 | ja | -0.63 |
| 13 | stress | -0.343 | -0.347 | -0.09 | 0.14 | +0/−90 | < 0.001 | ja | < 0.001 | ja | -1.00 |

## Zeitliche Diagnose der Paardifferenzen (beschreibend, kein Signifikanznachweis)

Die Diagnose beschreibt den zeitlichen Verlauf der gepaarten Differenzen innerhalb einer Kampagne (DECISIONS.md 5.8). Sie ist kein Test auf Unabhängigkeit und bestätigt keine Testentscheidung. Die Wilcoxon-Tests mit Holm-Korrektur bleiben unverändert die vorab festgelegte Entscheidungsregel, bei serieller Abhängigkeit liefern ihre p-Werte aber keine gesichert kalibrierte Inferenz. Die Grenze 2/√n mit der tatsächlichen Zahl gültiger Paare ist eine Heuristik. „Reststruktur“ heißt, die Autokorrelation erster Ordnung liegt auch nach Entfernen eines linearen Trends über der Grenze, was auch ein nichtlinearer Verlauf auslösen kann. „Nur linearer Trend“ heißt, sie liegt nur vor der Trendbereinigung darüber. „Ohne Befund“ ist kein Nachweis von Unabhängigkeit. Fehlende Paare bleiben Lücken in den echten Laufnummern. In die Autokorrelation gehen nur Paare mit aufeinanderfolgender Laufnummer ein. Die Hälften trennt die feste Laufnummer 50. „Nicht bestimmbar“ steht bei konstanten Reihen, unter 20 gültigen Paaren und unter 19 Nachbarpaaren.

### Block 1, Übersicht

| Messgröße | Diagnosen | ohne Befund | nur linearer Trend | Reststruktur | nicht bestimmbar | mit Lücken |
|---|---|---|---|---|---|---|
| latency_mean_ms | 39 | 39 | 0 | 0 | 0 | 0 |
| cpu_seconds_total | 39 | 34 | 4 | 1 | 0 | 0 |
| working_set_peak_bytes_total | 39 | 7 | 5 | 27 | 0 | 0 |
| connect_mean_ms | 39 | 39 | 0 | 0 | 0 | 0 |

Überschneidung mit den nach Holm signifikanten Tests der Hauptauswertung. Das ist nur eine Zählung und bestätigt keine Entscheidung.

| Messgröße | ohne Befund | nur linearer Trend | Reststruktur | nicht bestimmbar |
|---|---|---|---|---|
| latency_mean_ms | 26 | 0 | 0 | 0 |
| cpu_seconds_total | 31 | 4 | 1 | 0 |
| working_set_peak_bytes_total | 7 | 5 | 27 | 0 |
| connect_mean_ms | 27 | 0 | 0 | 0 |

### Block 1, je Test, latency_mean_ms

| Nr. | Laststufe | gültige Paare | Nachbarpaare | fehlende Läufe | Grenze | Autokorrelation roh | trendbereinigt | Trendanteil | Beobachtungen 1. Hälfte | Beobachtungen 2. Hälfte | Änderung des Medians (ms) | Einordnung |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | baseline | 90 | 89 | 0 | 0.21 | 0.00 | -0.01 | 0.01 | 45 | 45 | 0.030 | ohne Befund |
| 1 | medium | 90 | 89 | 0 | 0.21 | 0.10 | 0.07 | 0.04 | 45 | 45 | 0.060 | ohne Befund |
| 1 | stress | 90 | 89 | 0 | 0.21 | 0.06 | 0.04 | 0.02 | 45 | 45 | 0.073 | ohne Befund |
| 2 | baseline | 90 | 89 | 0 | 0.21 | -0.03 | -0.14 | 0.10 | 45 | 45 | -0.025 | ohne Befund |
| 2 | medium | 90 | 89 | 0 | 0.21 | 0.02 | 0.02 | 0.00 | 45 | 45 | -0.008 | ohne Befund |
| 2 | stress | 90 | 89 | 0 | 0.21 | -0.06 | -0.07 | 0.01 | 45 | 45 | 0.032 | ohne Befund |
| 3 | baseline | 90 | 89 | 0 | 0.21 | -0.00 | -0.01 | 0.00 | 45 | 45 | 0.010 | ohne Befund |
| 3 | medium | 90 | 89 | 0 | 0.21 | -0.06 | -0.06 | 0.00 | 45 | 45 | -0.036 | ohne Befund |
| 3 | stress | 90 | 89 | 0 | 0.21 | 0.08 | 0.07 | 0.00 | 45 | 45 | 0.000 | ohne Befund |
| 4 | baseline | 90 | 89 | 0 | 0.21 | -0.12 | -0.12 | 0.00 | 45 | 45 | -0.012 | ohne Befund |
| 4 | medium | 90 | 89 | 0 | 0.21 | -0.14 | -0.14 | 0.00 | 45 | 45 | 0.020 | ohne Befund |
| 4 | stress | 90 | 89 | 0 | 0.21 | 0.05 | 0.04 | 0.01 | 45 | 45 | -0.015 | ohne Befund |
| 5 | baseline | 90 | 89 | 0 | 0.21 | -0.10 | -0.10 | 0.00 | 45 | 45 | -0.015 | ohne Befund |
| 5 | medium | 90 | 89 | 0 | 0.21 | -0.10 | -0.11 | 0.01 | 45 | 45 | 0.022 | ohne Befund |
| 5 | stress | 90 | 89 | 0 | 0.21 | 0.12 | 0.10 | 0.02 | 45 | 45 | -0.136 | ohne Befund |
| 6 | baseline | 90 | 89 | 0 | 0.21 | 0.07 | -0.01 | 0.09 | 45 | 45 | 0.033 | ohne Befund |
| 6 | medium | 90 | 89 | 0 | 0.21 | 0.04 | 0.04 | 0.00 | 45 | 45 | -0.021 | ohne Befund |
| 6 | stress | 90 | 89 | 0 | 0.21 | -0.01 | -0.02 | 0.00 | 45 | 45 | -0.028 | ohne Befund |
| 7 | baseline | 90 | 89 | 0 | 0.21 | -0.01 | -0.01 | 0.00 | 45 | 45 | -0.015 | ohne Befund |
| 7 | medium | 90 | 89 | 0 | 0.21 | 0.12 | 0.12 | 0.00 | 45 | 45 | -0.010 | ohne Befund |
| 7 | stress | 90 | 89 | 0 | 0.21 | 0.05 | 0.04 | 0.00 | 45 | 45 | 0.036 | ohne Befund |
| 8 | baseline | 90 | 89 | 0 | 0.21 | -0.05 | -0.05 | 0.01 | 45 | 45 | -0.030 | ohne Befund |
| 8 | medium | 90 | 89 | 0 | 0.21 | -0.03 | -0.06 | 0.02 | 45 | 45 | -0.044 | ohne Befund |
| 8 | stress | 90 | 89 | 0 | 0.21 | 0.07 | 0.07 | 0.00 | 45 | 45 | -0.084 | ohne Befund |
| 9 | baseline | 90 | 89 | 0 | 0.21 | -0.08 | -0.13 | 0.04 | 45 | 45 | -0.023 | ohne Befund |
| 9 | medium | 90 | 89 | 0 | 0.21 | -0.18 | -0.19 | 0.02 | 45 | 45 | 0.095 | ohne Befund |
| 9 | stress | 90 | 89 | 0 | 0.21 | -0.22 | -0.23 | 0.00 | 45 | 45 | -0.080 | ohne Befund |
| 10 | baseline | 90 | 89 | 0 | 0.21 | 0.04 | 0.04 | 0.00 | 45 | 45 | 0.057 | ohne Befund |
| 10 | medium | 90 | 89 | 0 | 0.21 | 0.08 | 0.08 | 0.00 | 45 | 45 | -0.010 | ohne Befund |
| 10 | stress | 90 | 89 | 0 | 0.21 | 0.09 | 0.05 | 0.04 | 45 | 45 | -0.133 | ohne Befund |
| 11 | baseline | 90 | 89 | 0 | 0.21 | 0.17 | 0.16 | 0.02 | 45 | 45 | -0.035 | ohne Befund |
| 11 | medium | 90 | 89 | 0 | 0.21 | 0.06 | -0.05 | 0.12 | 45 | 45 | -0.100 | ohne Befund |
| 11 | stress | 90 | 89 | 0 | 0.21 | -0.05 | -0.05 | 0.00 | 45 | 45 | 0.046 | ohne Befund |
| 12 | baseline | 90 | 89 | 0 | 0.21 | 0.02 | 0.02 | 0.00 | 45 | 45 | 0.007 | ohne Befund |
| 12 | medium | 90 | 89 | 0 | 0.21 | 0.11 | 0.11 | 0.00 | 45 | 45 | 0.024 | ohne Befund |
| 12 | stress | 90 | 89 | 0 | 0.21 | 0.10 | 0.08 | 0.02 | 45 | 45 | 0.107 | ohne Befund |
| 13 | baseline | 90 | 89 | 0 | 0.21 | 0.03 | 0.03 | 0.00 | 45 | 45 | -0.033 | ohne Befund |
| 13 | medium | 90 | 89 | 0 | 0.21 | -0.01 | -0.02 | 0.02 | 45 | 45 | 0.006 | ohne Befund |
| 13 | stress | 90 | 89 | 0 | 0.21 | -0.10 | -0.11 | 0.00 | 45 | 45 | 0.030 | ohne Befund |

### Block 1, je Test, cpu_seconds_total

| Nr. | Laststufe | gültige Paare | Nachbarpaare | fehlende Läufe | Grenze | Autokorrelation roh | trendbereinigt | Trendanteil | Beobachtungen 1. Hälfte | Beobachtungen 2. Hälfte | Änderung des Medians (s) | Einordnung |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | baseline | 90 | 89 | 0 | 0.21 | -0.10 | -0.11 | 0.01 | 45 | 45 | -0.001 | ohne Befund |
| 1 | medium | 90 | 89 | 0 | 0.21 | -0.24 | -0.24 | 0.00 | 45 | 45 | -0.002 | ohne Befund |
| 1 | stress | 90 | 89 | 0 | 0.21 | -0.05 | -0.05 | 0.00 | 45 | 45 | 0.000 | ohne Befund |
| 2 | baseline | 90 | 89 | 0 | 0.21 | 0.37 | 0.15 | 0.28 | 45 | 45 | -0.007 | nur linearer Trend |
| 2 | medium | 90 | 89 | 0 | 0.21 | 0.05 | -0.03 | 0.08 | 45 | 45 | -0.008 | ohne Befund |
| 2 | stress | 90 | 89 | 0 | 0.21 | -0.03 | -0.04 | 0.00 | 45 | 45 | -0.054 | ohne Befund |
| 3 | baseline | 90 | 89 | 0 | 0.21 | 0.14 | -0.02 | 0.16 | 45 | 45 | -0.004 | ohne Befund |
| 3 | medium | 90 | 89 | 0 | 0.21 | -0.08 | -0.08 | 0.00 | 45 | 45 | -0.002 | ohne Befund |
| 3 | stress | 90 | 89 | 0 | 0.21 | 0.08 | 0.05 | 0.04 | 45 | 45 | -0.046 | ohne Befund |
| 4 | baseline | 90 | 89 | 0 | 0.21 | 0.23 | -0.01 | 0.26 | 45 | 45 | -0.007 | nur linearer Trend |
| 4 | medium | 90 | 89 | 0 | 0.21 | -0.06 | -0.09 | 0.04 | 45 | 45 | -0.014 | ohne Befund |
| 4 | stress | 90 | 89 | 0 | 0.21 | 0.08 | 0.03 | 0.06 | 45 | 45 | -0.043 | ohne Befund |
| 5 | baseline | 90 | 89 | 0 | 0.21 | 0.16 | 0.05 | 0.12 | 45 | 45 | 0.001 | ohne Befund |
| 5 | medium | 90 | 89 | 0 | 0.21 | 0.20 | 0.19 | 0.01 | 45 | 45 | 0.004 | ohne Befund |
| 5 | stress | 90 | 89 | 0 | 0.21 | 0.17 | 0.15 | 0.02 | 45 | 45 | -0.017 | ohne Befund |
| 6 | baseline | 90 | 89 | 0 | 0.21 | 0.15 | 0.03 | 0.14 | 45 | 45 | 0.005 | ohne Befund |
| 6 | medium | 90 | 89 | 0 | 0.21 | -0.08 | -0.08 | 0.00 | 45 | 45 | 0.002 | ohne Befund |
| 6 | stress | 90 | 89 | 0 | 0.21 | -0.02 | -0.02 | 0.01 | 45 | 45 | -0.033 | ohne Befund |
| 7 | baseline | 90 | 89 | 0 | 0.21 | -0.06 | -0.08 | 0.01 | 45 | 45 | -0.001 | ohne Befund |
| 7 | medium | 90 | 89 | 0 | 0.21 | 0.01 | 0.00 | 0.00 | 45 | 45 | -0.002 | ohne Befund |
| 7 | stress | 90 | 89 | 0 | 0.21 | -0.02 | -0.04 | 0.02 | 45 | 45 | 0.019 | ohne Befund |
| 8 | baseline | 90 | 89 | 0 | 0.21 | -0.01 | -0.01 | 0.00 | 45 | 45 | 0.000 | ohne Befund |
| 8 | medium | 90 | 89 | 0 | 0.21 | 0.05 | 0.04 | 0.00 | 45 | 45 | -0.001 | ohne Befund |
| 8 | stress | 90 | 89 | 0 | 0.21 | 0.08 | 0.08 | 0.00 | 45 | 45 | 0.008 | ohne Befund |
| 9 | baseline | 90 | 89 | 0 | 0.21 | 0.08 | 0.02 | 0.07 | 45 | 45 | -0.002 | ohne Befund |
| 9 | medium | 90 | 89 | 0 | 0.21 | 0.27 | 0.12 | 0.19 | 45 | 45 | 0.019 | nur linearer Trend |
| 9 | stress | 90 | 89 | 0 | 0.21 | -0.27 | -0.27 | 0.00 | 45 | 45 | -0.011 | ohne Befund |
| 10 | baseline | 90 | 89 | 0 | 0.21 | -0.03 | -0.03 | 0.00 | 45 | 45 | -0.001 | ohne Befund |
| 10 | medium | 90 | 89 | 0 | 0.21 | -0.07 | -0.07 | 0.00 | 45 | 45 | -0.002 | ohne Befund |
| 10 | stress | 90 | 89 | 0 | 0.21 | 0.10 | 0.09 | 0.01 | 45 | 45 | 0.026 | ohne Befund |
| 11 | baseline | 90 | 89 | 0 | 0.21 | 0.46 | 0.31 | 0.25 | 45 | 45 | -0.009 | Reststruktur |
| 11 | medium | 90 | 89 | 0 | 0.21 | 0.37 | 0.10 | 0.34 | 45 | 45 | -0.018 | nur linearer Trend |
| 11 | stress | 90 | 89 | 0 | 0.21 | -0.03 | -0.08 | 0.05 | 45 | 45 | -0.076 | ohne Befund |
| 12 | baseline | 90 | 89 | 0 | 0.21 | 0.12 | 0.04 | 0.10 | 45 | 45 | 0.004 | ohne Befund |
| 12 | medium | 90 | 89 | 0 | 0.21 | -0.04 | -0.09 | 0.04 | 45 | 45 | 0.003 | ohne Befund |
| 12 | stress | 90 | 89 | 0 | 0.21 | 0.12 | 0.09 | 0.03 | 45 | 45 | 0.026 | ohne Befund |
| 13 | baseline | 90 | 89 | 0 | 0.21 | -0.08 | -0.08 | 0.01 | 45 | 45 | 0.000 | ohne Befund |
| 13 | medium | 90 | 89 | 0 | 0.21 | -0.14 | -0.15 | 0.01 | 45 | 45 | -0.003 | ohne Befund |
| 13 | stress | 90 | 89 | 0 | 0.21 | 0.00 | -0.02 | 0.02 | 45 | 45 | -0.001 | ohne Befund |

### Block 1, je Test, working_set_peak_bytes_total

| Nr. | Laststufe | gültige Paare | Nachbarpaare | fehlende Läufe | Grenze | Autokorrelation roh | trendbereinigt | Trendanteil | Beobachtungen 1. Hälfte | Beobachtungen 2. Hälfte | Änderung des Medians (MiB) | Einordnung |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | baseline | 90 | 89 | 0 | 0.21 | 0.96 | 0.93 | 0.79 | 45 | 45 | -3.7 | Reststruktur |
| 1 | medium | 90 | 89 | 0 | 0.21 | 0.81 | 0.47 | 0.70 | 45 | 45 | -2.2 | Reststruktur |
| 1 | stress | 90 | 89 | 0 | 0.21 | 0.29 | 0.19 | 0.15 | 45 | 45 | -0.6 | nur linearer Trend |
| 2 | baseline | 90 | 89 | 0 | 0.21 | 0.92 | 0.29 | 0.91 | 45 | 45 | 1.9 | Reststruktur |
| 2 | medium | 90 | 89 | 0 | 0.21 | 0.89 | 0.73 | 0.70 | 45 | 45 | 2.8 | Reststruktur |
| 2 | stress | 90 | 89 | 0 | 0.21 | 0.20 | 0.20 | 0.00 | 45 | 45 | 0.3 | ohne Befund |
| 3 | baseline | 90 | 89 | 0 | 0.21 | 0.96 | 0.80 | 0.98 | 45 | 45 | -10.6 | Reststruktur |
| 3 | medium | 90 | 89 | 0 | 0.21 | 0.95 | 0.77 | 0.89 | 45 | 45 | -6.8 | Reststruktur |
| 3 | stress | 90 | 89 | 0 | 0.21 | 0.93 | 0.42 | 0.96 | 45 | 45 | -10.8 | Reststruktur |
| 4 | baseline | 90 | 89 | 0 | 0.21 | 0.89 | 0.12 | 0.89 | 45 | 45 | 1.8 | nur linearer Trend |
| 4 | medium | 90 | 89 | 0 | 0.21 | 0.86 | 0.64 | 0.70 | 45 | 45 | 2.0 | Reststruktur |
| 4 | stress | 90 | 89 | 0 | 0.21 | 0.37 | 0.37 | 0.00 | 45 | 45 | 0.1 | Reststruktur |
| 5 | baseline | 90 | 89 | 0 | 0.21 | 0.65 | -0.02 | 0.69 | 45 | 45 | -0.8 | nur linearer Trend |
| 5 | medium | 90 | 89 | 0 | 0.21 | 0.57 | 0.57 | 0.02 | 45 | 45 | 0.0 | Reststruktur |
| 5 | stress | 90 | 89 | 0 | 0.21 | 0.04 | 0.04 | 0.00 | 45 | 45 | -0.3 | ohne Befund |
| 6 | baseline | 90 | 89 | 0 | 0.21 | 0.81 | 0.45 | 0.69 | 45 | 45 | -1.7 | Reststruktur |
| 6 | medium | 90 | 89 | 0 | 0.21 | 0.11 | 0.11 | 0.00 | 45 | 45 | -0.2 | ohne Befund |
| 6 | stress | 90 | 89 | 0 | 0.21 | 0.29 | 0.26 | 0.03 | 45 | 45 | 0.4 | Reststruktur |
| 7 | baseline | 90 | 89 | 0 | 0.21 | 0.95 | 0.83 | 0.96 | 45 | 45 | -7.3 | Reststruktur |
| 7 | medium | 90 | 89 | 0 | 0.21 | 0.97 | 0.77 | 0.99 | 45 | 45 | -8.2 | Reststruktur |
| 7 | stress | 90 | 89 | 0 | 0.21 | 0.96 | 0.64 | 1.00 | 45 | 45 | -10.5 | Reststruktur |
| 8 | baseline | 90 | 89 | 0 | 0.21 | 0.05 | 0.05 | 0.00 | 45 | 45 | 0.1 | ohne Befund |
| 8 | medium | 90 | 89 | 0 | 0.21 | -0.11 | -0.11 | 0.00 | 45 | 45 | 0.0 | ohne Befund |
| 8 | stress | 90 | 89 | 0 | 0.21 | -0.05 | -0.05 | 0.00 | 45 | 45 | -0.0 | ohne Befund |
| 9 | baseline | 90 | 89 | 0 | 0.21 | 0.88 | 0.77 | 0.57 | 45 | 45 | 3.7 | Reststruktur |
| 9 | medium | 90 | 89 | 0 | 0.21 | 0.50 | 0.47 | 0.05 | 45 | 45 | 1.1 | Reststruktur |
| 9 | stress | 90 | 89 | 0 | 0.21 | 0.34 | 0.31 | 0.08 | 45 | 45 | -0.7 | Reststruktur |
| 10 | baseline | 90 | 89 | 0 | 0.21 | 0.91 | 0.59 | 0.86 | 45 | 45 | -2.3 | Reststruktur |
| 10 | medium | 90 | 89 | 0 | 0.21 | 0.70 | 0.57 | 0.43 | 45 | 45 | 0.8 | Reststruktur |
| 10 | stress | 90 | 89 | 0 | 0.21 | 0.48 | 0.38 | 0.15 | 45 | 45 | -0.5 | Reststruktur |
| 11 | baseline | 90 | 89 | 0 | 0.21 | 0.97 | 0.67 | 0.96 | 45 | 45 | -10.4 | Reststruktur |
| 11 | medium | 90 | 89 | 0 | 0.21 | 0.97 | 0.82 | 0.88 | 45 | 45 | -8.4 | Reststruktur |
| 11 | stress | 90 | 89 | 0 | 0.21 | 0.91 | 0.17 | 0.92 | 45 | 45 | -9.9 | nur linearer Trend |
| 12 | baseline | 90 | 89 | 0 | 0.21 | 0.52 | 0.00 | 0.55 | 45 | 45 | 0.7 | nur linearer Trend |
| 12 | medium | 90 | 89 | 0 | 0.21 | 0.88 | 0.78 | 0.58 | 45 | 45 | -0.9 | Reststruktur |
| 12 | stress | 90 | 89 | 0 | 0.21 | 0.37 | 0.37 | 0.00 | 45 | 45 | -0.0 | Reststruktur |
| 13 | baseline | 90 | 89 | 0 | 0.21 | 0.96 | 0.94 | 0.78 | 45 | 45 | 3.6 | Reststruktur |
| 13 | medium | 90 | 89 | 0 | 0.21 | 0.86 | 0.56 | 0.78 | 45 | 45 | 2.4 | Reststruktur |
| 13 | stress | 90 | 89 | 0 | 0.21 | 0.19 | -0.03 | 0.21 | 45 | 45 | 0.2 | ohne Befund |

### Block 1, je Test, connect_mean_ms

| Nr. | Laststufe | gültige Paare | Nachbarpaare | fehlende Läufe | Grenze | Autokorrelation roh | trendbereinigt | Trendanteil | Beobachtungen 1. Hälfte | Beobachtungen 2. Hälfte | Änderung des Medians (ms) | Einordnung |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | baseline | 90 | 89 | 0 | 0.21 | -0.10 | -0.11 | 0.01 | 45 | 45 | 0.100 | ohne Befund |
| 1 | medium | 90 | 89 | 0 | 0.21 | -0.16 | -0.20 | 0.04 | 45 | 45 | -0.060 | ohne Befund |
| 1 | stress | 90 | 89 | 0 | 0.21 | 0.13 | 0.13 | 0.00 | 45 | 45 | 0.014 | ohne Befund |
| 2 | baseline | 90 | 89 | 0 | 0.21 | 0.10 | 0.09 | 0.02 | 45 | 45 | 0.100 | ohne Befund |
| 2 | medium | 90 | 89 | 0 | 0.21 | -0.22 | -0.23 | 0.00 | 45 | 45 | 0.020 | ohne Befund |
| 2 | stress | 90 | 89 | 0 | 0.21 | -0.22 | -0.28 | 0.05 | 45 | 45 | -0.016 | ohne Befund |
| 3 | baseline | 90 | 89 | 0 | 0.21 | -0.08 | -0.08 | 0.01 | 45 | 45 | -0.100 | ohne Befund |
| 3 | medium | 90 | 89 | 0 | 0.21 | -0.16 | -0.16 | 0.00 | 45 | 45 | -0.020 | ohne Befund |
| 3 | stress | 90 | 89 | 0 | 0.21 | -0.03 | -0.19 | 0.14 | 45 | 45 | -0.030 | ohne Befund |
| 4 | baseline | 90 | 89 | 0 | 0.21 | 0.03 | 0.00 | 0.02 | 45 | 45 | -0.100 | ohne Befund |
| 4 | medium | 90 | 89 | 0 | 0.21 | -0.05 | -0.06 | 0.00 | 45 | 45 | -0.040 | ohne Befund |
| 4 | stress | 90 | 89 | 0 | 0.21 | 0.11 | 0.08 | 0.04 | 45 | 45 | -0.002 | ohne Befund |
| 5 | baseline | 90 | 89 | 0 | 0.21 | -0.05 | -0.06 | 0.02 | 45 | 45 | 0.100 | ohne Befund |
| 5 | medium | 90 | 89 | 0 | 0.21 | -0.11 | -0.11 | 0.00 | 45 | 45 | 0.000 | ohne Befund |
| 5 | stress | 90 | 89 | 0 | 0.21 | -0.12 | -0.13 | 0.00 | 45 | 45 | -0.004 | ohne Befund |
| 6 | baseline | 90 | 89 | 0 | 0.21 | -0.11 | -0.11 | 0.00 | 45 | 45 | 0.000 | ohne Befund |
| 6 | medium | 90 | 89 | 0 | 0.21 | 0.07 | 0.07 | 0.00 | 45 | 45 | -0.040 | ohne Befund |
| 6 | stress | 90 | 89 | 0 | 0.21 | 0.16 | 0.16 | 0.00 | 45 | 45 | -0.018 | ohne Befund |
| 7 | baseline | 90 | 89 | 0 | 0.21 | 0.08 | 0.08 | 0.01 | 45 | 45 | 0.000 | ohne Befund |
| 7 | medium | 90 | 89 | 0 | 0.21 | 0.08 | 0.05 | 0.03 | 45 | 45 | -0.060 | ohne Befund |
| 7 | stress | 90 | 89 | 0 | 0.21 | -0.25 | -0.25 | 0.00 | 45 | 45 | 0.008 | ohne Befund |
| 8 | baseline | 90 | 89 | 0 | 0.21 | -0.06 | -0.07 | 0.01 | 45 | 45 | -0.100 | ohne Befund |
| 8 | medium | 90 | 89 | 0 | 0.21 | 0.08 | 0.06 | 0.03 | 45 | 45 | 0.000 | ohne Befund |
| 8 | stress | 90 | 89 | 0 | 0.21 | -0.14 | -0.14 | 0.00 | 45 | 45 | -0.002 | ohne Befund |
| 9 | baseline | 90 | 89 | 0 | 0.21 | 0.01 | -0.03 | 0.05 | 45 | 45 | 0.100 | ohne Befund |
| 9 | medium | 90 | 89 | 0 | 0.21 | 0.07 | 0.06 | 0.01 | 45 | 45 | 0.020 | ohne Befund |
| 9 | stress | 90 | 89 | 0 | 0.21 | -0.19 | -0.19 | 0.00 | 45 | 45 | -0.012 | ohne Befund |
| 10 | baseline | 90 | 89 | 0 | 0.21 | -0.44 | -0.44 | 0.00 | 45 | 45 | -0.100 | ohne Befund |
| 10 | medium | 90 | 89 | 0 | 0.21 | -0.04 | -0.09 | 0.04 | 45 | 45 | -0.060 | ohne Befund |
| 10 | stress | 90 | 89 | 0 | 0.21 | 0.04 | -0.03 | 0.06 | 45 | 45 | 0.036 | ohne Befund |
| 11 | baseline | 90 | 89 | 0 | 0.21 | -0.04 | -0.06 | 0.02 | 45 | 45 | -0.100 | ohne Befund |
| 11 | medium | 90 | 89 | 0 | 0.21 | 0.04 | 0.04 | 0.00 | 45 | 45 | 0.020 | ohne Befund |
| 11 | stress | 90 | 89 | 0 | 0.21 | -0.03 | -0.16 | 0.11 | 45 | 45 | -0.054 | ohne Befund |
| 12 | baseline | 90 | 89 | 0 | 0.21 | 0.02 | 0.02 | 0.01 | 45 | 45 | 0.200 | ohne Befund |
| 12 | medium | 90 | 89 | 0 | 0.21 | -0.08 | -0.10 | 0.03 | 45 | 45 | 0.060 | ohne Befund |
| 12 | stress | 90 | 89 | 0 | 0.21 | 0.00 | -0.02 | 0.02 | 45 | 45 | 0.018 | ohne Befund |
| 13 | baseline | 90 | 89 | 0 | 0.21 | 0.13 | 0.10 | 0.03 | 45 | 45 | -0.100 | ohne Befund |
| 13 | medium | 90 | 89 | 0 | 0.21 | 0.03 | -0.02 | 0.05 | 45 | 45 | 0.020 | ohne Befund |
| 13 | stress | 90 | 89 | 0 | 0.21 | -0.03 | -0.04 | 0.01 | 45 | 45 | -0.012 | ohne Befund |

### Block 1, Prozesslaufzeiten

Von 39 Kampagnen liefen 8 mit mindestens einem Prozess weiter, der schon in einer früheren Kampagne dieses Blocks lief. Dienste mit mehr als einem Start innerhalb einer Kampagne: 0.

## Hypothesen (vorab festgelegt, DECISIONS.md 5.18)

| Nr. | Hypothese | Vergleiche | Messgröße | Laststufe | Bestätigt, wenn … |
|---|---|---|---|---|---|
| H1 | Für SSE benötigt PHP-FPM bei 500 Clients ein Vielfaches des Speichers von Node.js. | 1, 3 | working_set_peak_bytes_total | stress | Vergleiche 1 und 3 bei 500 Clients: Working Set (Variante und Redis) von PHP mindestens das Doppelte von Node.js, Unterschied signifikant. |
| H2 | Bei 10 Clients sind die Latenzunterschiede höchstens klein (|δ| < 0,33). | 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13 | latency_mean_ms | baseline | Alle 13 Vergleiche bei 10 Clients: |δ| < 0,33 bei der Latenz. Nicht bestätigt, sobald ein Vergleich |δ| ≥ 0,33 zusammen mit einem signifikanten Unterschied zeigt. |
| H3 | Von 10 zu 500 Clients wachsen die Latenzunterschiede zwischen PHP und Node.js; die Richtung ist offen. | 1, 2, 3, 4 | latency_mean_ms | baseline, stress | Vergleiche 1–4: Betrag der Median-Differenz der Latenz bei 500 Clients größer als bei 10 Clients und bei 500 Clients signifikant. Cliff's Delta wird hier nicht verwendet, weil es bei gleichbleibendem Unterschied schon bei 10 Clients nahe seinem Maximum liegt. |
| H4 | In der Skalierungsreihe erreicht PHP-FPM/SSE als erste Variante eine harte Grenze; Node.js und die PHP-WebSocket-Server werden allmählich langsamer. | – | served_ratio, latency_mean_ms | Skalierungsreihe | Die PHP-FPM-Varianten mit SSE (php-minimal-sse, php-laravel-sse und php-laravel-sse-queue) haben die niedrigsten Kapazitätsgrenzen aller Varianten, und ihr Anteil bedienter Clients fällt zwischen zwei aufeinanderfolgenden Stufen um mindestens 5 Prozentpunkte (harte Grenze). Die Node.js-Varianten und die PHP-WebSocket-Server zeigen bis zur selben Stufe keinen solchen Sprung. |
| H5 | Der Framework-Effekt ist bei der Event-Latenz klein, beim Verbindungsaufbau und beim Speicher aber bei Laravel deutlich größer als bei Express. | 5, 6, 7, 8 | latency_mean_ms, connect_mean_ms, working_set_peak_bytes_total | alle | Vergleiche 5–8: |δ| < 0,33 bei der Latenz auf allen Laststufen. Bei Verbindungsaufbau und Working Set ist die Median-Differenz Laravel gegen Minimalumsetzung größer als Express gegen Minimalumsetzung bei gleichem Transport und gleicher Laststufe, und der Laravel-Effekt ist signifikant. |
| H6 | php-laravel/WS hat durchgehend höhere Latenz als node-express/WS (zusätzlicher interner HTTP-Aufruf Listener → Reverb). | 4 | latency_mean_ms | alle | Vergleich 4: php-laravel-ws auf allen drei Laststufen mit signifikant höherer Latenz. |
| H7 | Die Queue erhöht die Latenz in beiden Stacks, bei Laravel stärker als bei BullMQ. | 9, 10 | latency_mean_ms | alle | Vergleiche 9 und 10: Die Variante mit Queue hat auf allen Laststufen eine signifikant höhere Latenz, und die Median-Differenz ist bei Laravel (Vergleich 10) größer als bei BullMQ (Vergleich 9). |
| H8 | Bei PHP/SSE trägt Redis einen wesentlichen Teil der Gesamt-CPU, bei allen anderen Zellen nur einen geringen. | 1, 3, 7 | cpu_seconds_redis / cpu_seconds_total | stress | Bei 500 Clients, Median des Redis-Anteils an der gesamten CPU-Zeit über alle gültigen Läufe der Variante in Block 1: mindestens 25 % für alle PHP-FPM-Varianten mit SSE (php-minimal-sse, php-laravel-sse und php-laravel-sse-queue, „wesentlich") und unter 10 % für alle übrigen Varianten („gering"). |
| H9 | Bei Node.js, wo beide Transporte dasselbe Laufzeitmodell nutzen, verursacht SSE weniger Overhead als WebSockets: weniger CPU-Zeit und ein kleineres Working Set bei gleicher Last (Erwartung aus dem Exposé). | 12 | cpu_seconds_total, working_set_peak_bytes_total | alle | Vergleich 12: SSE mit signifikant niedrigerer CPU-Zeit und kleinerem Working Set auf allen Laststufen. |
| H10 | Bei PHP bestimmt das Laufzeitmodell den Transportvergleich: PHP-FPM/SSE (ein Worker je Verbindung) benötigt bei 500 Clients ein Vielfaches des Speichers des Ratchet-WebSocket-Servers (eine Ereignisschleife). | 13 | working_set_peak_bytes_total | stress | Vergleich 13 bei 500 Clients: Working Set von SSE mindestens das Doppelte von WebSocket, Unterschied signifikant. |
| H11 | Bei hohen Event-Raten erreichen die WebSocket-Varianten eine höhere nachhaltige Rate als die SSE-Varianten mit derselben Sprache und derselben Framework-Wahl (Erwartung aus dem Exposé). | – | höchste nachhaltige Event-Rate | Sättigungstest | In allen vier Paaren aus SSE- und WebSocket-Variante gleicher Sprache und Framework-Wahl erreicht die WebSocket-Variante die höhere nachhaltige Rate. Unentschieden bei Gleichstand, etwa wenn beide die höchste Stufe erreichen. |

Allgemeine Entscheidungsregeln:

- G1: Eine gerichtete Aussage gilt als gezeigt, wenn der Test nach Holm signifikant ist und die Median-Differenz in die vorhergesagte Richtung zeigt.
- G2: Eine Aussage über keinen oder höchstens einen kleinen Unterschied wird über das Effektmaß geprüft (|δ| < 0,33), nicht über fehlende Signifikanz.
- G3: „Vielfaches" bedeutet ein Verhältnis der Mediane von mindestens 2.
- G4: Betrifft eine Hypothese mehrere Vergleiche oder Laststufen, ist sie bestätigt, wenn die Bedingung in allen Fällen erfüllt ist, und nicht bestätigt, wenn mindestens ein Fall das Gegenteil zeigt. Sonst ist sie unentschieden, ebenso wenn ein benötigter Vergleich weniger als 20 verwertbare Paare hat oder fehlt.

## Bewertung der Hypothesen (G1 bis G4)

Jede Hypothese ist in Fälle zerlegt. Ein Fall ist erfüllt, zeigt das Gegenteil oder ist unklar (fehlt, weniger als 20 verwertbare Paare, nicht signifikant oder Gleichstand). Nach G4 ist eine Hypothese bestätigt, wenn alle Fälle erfüllt sind, nicht bestätigt, wenn mindestens ein Fall das Gegenteil zeigt, und sonst unentschieden. Was je Art von Fall als Gegenteil gilt, legt DECISIONS.md 5.18 fest.

| Nr. | Ergebnis | erfüllt | Gegenteil | unklar |
|---|---|---|---|---|
| H1 | bestätigt | 2 | 0 | 0 |
| H2 | nicht bestätigt | 8 | 5 | 0 |
| H3 | bestätigt | 4 | 0 | 0 |
| H4 | unentschieden | 0 | 0 | 1 |
| H5 | nicht bestätigt | 18 | 5 | 1 |
| H6 | bestätigt | 3 | 0 | 0 |
| H7 | nicht bestätigt | 8 | 1 | 0 |
| H8 | nicht bestätigt | 7 | 3 | 0 |
| H9 | nicht bestätigt | 1 | 5 | 0 |
| H10 | bestätigt | 1 | 0 | 0 |
| H11 | unentschieden | 0 | 0 | 1 |

### H1: bestätigt

Für SSE benötigt PHP-FPM bei 500 Clients ein Vielfaches des Speichers von Node.js.

| Fall | Ergebnis | Werte |
|---|---|---|
| Vergleich 1, Working Set bei 500 Clients | erfüllt | Verhältnis der Mediane 7.35, p (Holm) < 0.001 |
| Vergleich 3, Working Set bei 500 Clients | erfüllt | Verhältnis der Mediane 19.11, p (Holm) < 0.001 |

### H2: nicht bestätigt

Bei 10 Clients sind die Latenzunterschiede höchstens klein (|δ| < 0,33).

| Fall | Ergebnis | Werte |
|---|---|---|
| Vergleich 1, Latenz bei 10 Clients | erfüllt | δ 0.031, p (Holm) 1.000 |
| Vergleich 2, Latenz bei 10 Clients | erfüllt | δ -0.029, p (Holm) 1.000 |
| Vergleich 3, Latenz bei 10 Clients | erfüllt | δ 0.013, p (Holm) 1.000 |
| Vergleich 4, Latenz bei 10 Clients | gegenteil | δ -1.000, p (Holm) < 0.001 |
| Vergleich 5, Latenz bei 10 Clients | erfüllt | δ 0.088, p (Holm) 1.000 |
| Vergleich 6, Latenz bei 10 Clients | erfüllt | δ -0.063, p (Holm) 1.000 |
| Vergleich 7, Latenz bei 10 Clients | erfüllt | δ -0.146, p (Holm) 1.000 |
| Vergleich 8, Latenz bei 10 Clients | gegenteil | δ -1.000, p (Holm) < 0.001 |
| Vergleich 9, Latenz bei 10 Clients | gegenteil | δ -1.000, p (Holm) < 0.001 |
| Vergleich 10, Latenz bei 10 Clients | gegenteil | δ -1.000, p (Holm) < 0.001 |
| Vergleich 11, Latenz bei 10 Clients | gegenteil | δ -0.449, p (Holm) < 0.001 |
| Vergleich 12, Latenz bei 10 Clients | erfüllt | δ 0.081, p (Holm) 1.000 |
| Vergleich 13, Latenz bei 10 Clients | erfüllt | δ -0.115, p (Holm) 1.000 |

### H3: bestätigt

Von 10 zu 500 Clients wachsen die Latenzunterschiede zwischen PHP und Node.js; die Richtung ist offen.

| Fall | Ergebnis | Werte |
|---|---|---|
| Vergleich 1, Latenz | erfüllt | |Median-Diff| 0.001 bei 10 und 2.208 bei 500 Clients, p (Holm) < 0.001 |
| Vergleich 2, Latenz | erfüllt | |Median-Diff| 0.005 bei 10 und 0.711 bei 500 Clients, p (Holm) < 0.001 |
| Vergleich 3, Latenz | erfüllt | |Median-Diff| 0.001 bei 10 und 2.138 bei 500 Clients, p (Holm) < 0.001 |
| Vergleich 4, Latenz | erfüllt | |Median-Diff| 2.065 bei 10 und 2.350 bei 500 Clients, p (Holm) < 0.001 |

### H4: unentschieden

In der Skalierungsreihe erreicht PHP-FPM/SSE als erste Variante eine harte Grenze; Node.js und die PHP-WebSocket-Server werden allmählich langsamer.

| Fall | Ergebnis | Werte |
|---|---|---|
| Skalierungsreihe | unklar | series.json fehlt |

### H5: nicht bestätigt

Der Framework-Effekt ist bei der Event-Latenz klein, beim Verbindungsaufbau und beim Speicher aber bei Laravel deutlich größer als bei Express.

| Fall | Ergebnis | Werte |
|---|---|---|
| Vergleich 5, Latenz, baseline | erfüllt | δ 0.088, p (Holm) 1.000 |
| Vergleich 5, Latenz, medium | erfüllt | δ -0.077, p (Holm) 1.000 |
| Vergleich 5, Latenz, stress | unklar | δ -0.344, p (Holm) 0.183, nicht signifikant |
| Vergleich 6, Latenz, baseline | erfüllt | δ -0.063, p (Holm) 1.000 |
| Vergleich 6, Latenz, medium | erfüllt | δ -0.047, p (Holm) 1.000 |
| Vergleich 6, Latenz, stress | gegenteil | δ -0.684, p (Holm) < 0.001 |
| Vergleich 7, Latenz, baseline | erfüllt | δ -0.146, p (Holm) 1.000 |
| Vergleich 7, Latenz, medium | erfüllt | δ -0.016, p (Holm) 1.000 |
| Vergleich 7, Latenz, stress | gegenteil | δ -0.375, p (Holm) 0.003 |
| Vergleich 8, Latenz, baseline | gegenteil | δ -1.000, p (Holm) < 0.001 |
| Vergleich 8, Latenz, medium | gegenteil | δ -1.000, p (Holm) < 0.001 |
| Vergleich 8, Latenz, stress | gegenteil | δ -1.000, p (Holm) < 0.001 |
| SSE, connect_mean_ms, baseline: Laravel-Effekt größer als Express-Effekt | erfüllt | Effekt 5.900 gegenüber 0.100 |
| SSE, connect_mean_ms, medium: Laravel-Effekt größer als Express-Effekt | erfüllt | Effekt 5.220 gegenüber 0.060 |
| SSE, connect_mean_ms, stress: Laravel-Effekt größer als Express-Effekt | erfüllt | Effekt 5.018 gegenüber 0.038 |
| SSE, working_set_peak_bytes_total, baseline: Laravel-Effekt größer als Express-Effekt | erfüllt | Effekt 734019584.000 gegenüber 2273280.000 |
| SSE, working_set_peak_bytes_total, medium: Laravel-Effekt größer als Express-Effekt | erfüllt | Effekt 736960512.000 gegenüber 1445888.000 |
| SSE, working_set_peak_bytes_total, stress: Laravel-Effekt größer als Express-Effekt | erfüllt | Effekt 734416896.000 gegenüber 2451456.000 |
| WS, connect_mean_ms, baseline: Laravel-Effekt größer als Express-Effekt | erfüllt | Effekt 0.300 gegenüber 0.000 |
| WS, connect_mean_ms, medium: Laravel-Effekt größer als Express-Effekt | erfüllt | Effekt 0.300 gegenüber 0.020 |
| WS, connect_mean_ms, stress: Laravel-Effekt größer als Express-Effekt | erfüllt | Effekt 0.329 gegenüber 0.023 |
| WS, working_set_peak_bytes_total, baseline: Laravel-Effekt größer als Express-Effekt | erfüllt | Effekt 54554624.000 gegenüber -4370432.000 |
| WS, working_set_peak_bytes_total, medium: Laravel-Effekt größer als Express-Effekt | erfüllt | Effekt 56750080.000 gegenüber 1064960.000 |
| WS, working_set_peak_bytes_total, stress: Laravel-Effekt größer als Express-Effekt | erfüllt | Effekt 56606720.000 gegenüber 1243136.000 |

### H6: bestätigt

php-laravel/WS hat durchgehend höhere Latenz als node-express/WS (zusätzlicher interner HTTP-Aufruf Listener → Reverb).

| Fall | Ergebnis | Werte |
|---|---|---|
| Vergleich 4, Latenz, baseline | erfüllt | Median-Diff -2.065, p (Holm) < 0.001 |
| Vergleich 4, Latenz, medium | erfüllt | Median-Diff -2.251, p (Holm) < 0.001 |
| Vergleich 4, Latenz, stress | erfüllt | Median-Diff -2.350, p (Holm) < 0.001 |

### H7: nicht bestätigt

Die Queue erhöht die Latenz in beiden Stacks, bei Laravel stärker als bei BullMQ.

| Fall | Ergebnis | Werte |
|---|---|---|
| Vergleich 9, Latenz, baseline | erfüllt | Median-Diff -0.938, p (Holm) < 0.001 |
| Vergleich 9, Latenz, medium | erfüllt | Median-Diff -1.152, p (Holm) < 0.001 |
| Vergleich 9, Latenz, stress | erfüllt | Median-Diff -1.251, p (Holm) < 0.001 |
| Vergleich 10, Latenz, baseline | erfüllt | Median-Diff -1.132, p (Holm) < 0.001 |
| Vergleich 10, Latenz, medium | erfüllt | Median-Diff -1.057, p (Holm) < 0.001 |
| Vergleich 10, Latenz, stress | erfüllt | Median-Diff -1.337, p (Holm) < 0.001 |
| baseline: Queue-Effekt Laravel größer als BullMQ | erfüllt | Effekt 1.132 gegenüber 0.938 |
| medium: Queue-Effekt Laravel größer als BullMQ | gegenteil | Effekt 1.057 gegenüber 1.152 |
| stress: Queue-Effekt Laravel größer als BullMQ | erfüllt | Effekt 1.337 gegenüber 1.251 |

### H8: nicht bestätigt

Bei PHP/SSE trägt Redis einen wesentlichen Teil der Gesamt-CPU, bei allen anderen Zellen nur einen geringen.

| Fall | Ergebnis | Werte |
|---|---|---|
| node-minimal-sse, unter 10 % | erfüllt | Median 5.0 % aus 270 Läufen |
| php-minimal-sse, mindestens 25 % | gegenteil | Median 23.2 % aus 270 Läufen |
| node-minimal-ws, unter 10 % | erfüllt | Median 5.6 % aus 270 Läufen |
| php-minimal-ws, unter 10 % | erfüllt | Median 7.1 % aus 270 Läufen |
| node-express-sse, unter 10 % | erfüllt | Median 5.0 % aus 270 Läufen |
| php-laravel-sse, mindestens 25 % | gegenteil | Median 13.5 % aus 270 Läufen |
| node-express-ws, unter 10 % | erfüllt | Median 5.2 % aus 180 Läufen |
| php-laravel-ws, unter 10 % | erfüllt | Median 4.5 % aus 180 Läufen |
| node-express-sse-queue, unter 10 % | erfüllt | Median 7.8 % aus 180 Läufen |
| php-laravel-sse-queue, mindestens 25 % | gegenteil | Median 14.2 % aus 180 Läufen |

### H9: nicht bestätigt

Bei Node.js, wo beide Transporte dasselbe Laufzeitmodell nutzen, verursacht SSE weniger Overhead als WebSockets: weniger CPU-Zeit und ein kleineres Working Set bei gleicher Last (Erwartung aus dem Exposé).

| Fall | Ergebnis | Werte |
|---|---|---|
| Vergleich 12, cpu_seconds_total, baseline | erfüllt | Median-Diff -0.003, p (Holm) < 0.001 |
| Vergleich 12, cpu_seconds_total, medium | gegenteil | Median-Diff 0.006, p (Holm) 0.015 |
| Vergleich 12, cpu_seconds_total, stress | gegenteil | Median-Diff 0.128, p (Holm) < 0.001 |
| Vergleich 12, working_set_peak_bytes_total, baseline | gegenteil | Median-Diff 3627008.000, p (Holm) < 0.001 |
| Vergleich 12, working_set_peak_bytes_total, medium | gegenteil | Median-Diff 4368384.000, p (Holm) < 0.001 |
| Vergleich 12, working_set_peak_bytes_total, stress | gegenteil | Median-Diff 7122944.000, p (Holm) < 0.001 |

### H10: bestätigt

Bei PHP bestimmt das Laufzeitmodell den Transportvergleich: PHP-FPM/SSE (ein Worker je Verbindung) benötigt bei 500 Clients ein Vielfaches des Speichers des Ratchet-WebSocket-Servers (eine Ereignisschleife).

| Fall | Ergebnis | Werte |
|---|---|---|
| Vergleich 13, Working Set bei 500 Clients | erfüllt | Verhältnis der Mediane 11.59, p (Holm) < 0.001 |

### H11: unentschieden

Bei hohen Event-Raten erreichen die WebSocket-Varianten eine höhere nachhaltige Rate als die SSE-Varianten mit derselben Sprache und derselben Framework-Wahl (Erwartung aus dem Exposé).

| Fall | Ergebnis | Werte |
|---|---|---|
| Sättigungstest | unklar | series.json fehlt |

### Wortlaut für die Arbeit (englisch)

General decision rules:

- G1: A directional claim is supported if the test is significant after Holm correction and the median difference points in the predicted direction.
- G2: A claim of no difference or at most a small difference is assessed with the effect size (|δ| < 0.33), not with the absence of significance.
- G3: "A multiple" means a ratio of the medians of at least 2.
- G4: If a hypothesis covers several comparisons or load levels, it is supported if the condition holds in all cases and not supported if at least one case shows the opposite. Otherwise it is undecided, as it is when a required comparison has fewer than 20 valid pairs or is missing.

Replication: A result is replicated if block 2 shows the same direction of the median difference and the 95% confidence intervals of both blocks overlap. The effect size category is reported but is not a condition.

- **H1:** With Server-Sent Events, PHP-FPM requires a multiple of the memory that Node.js requires at 500 clients.
  *Supported if:* Comparisons 1 and 3 at 500 clients: the working set (variant and Redis) of PHP is at least twice that of Node.js, and the difference is significant.
- **H2:** At 10 clients, the latency differences are at most small (|δ| < 0.33).
  *Supported if:* All 13 comparisons at 10 clients: |δ| < 0.33 for the latency. Not supported as soon as one comparison shows |δ| ≥ 0.33 together with a significant difference.
- **H3:** From 10 to 500 clients, the latency differences between PHP and Node.js increase. The direction of the difference is open.
  *Supported if:* Comparisons 1 to 4: the absolute median difference of the latency is larger at 500 clients than at 10 clients and significant at 500 clients. Cliff's delta is not used here because it approaches its maximum already at 10 clients when a difference is consistent.
- **H4:** In the scaling series, PHP-FPM with Server-Sent Events is the first variant to reach a hard limit. The Node.js variants and the PHP WebSocket servers slow down gradually.
  *Supported if:* The PHP-FPM variants with Server-Sent Events (php-minimal-sse, php-laravel-sse and php-laravel-sse-queue) have the lowest capacity limits of all variants, and their served ratio drops by at least 5 percentage points between two consecutive steps (hard limit). The Node.js variants and the PHP WebSocket servers show no such drop up to the same step.
- **H5:** The framework effect is small for the event latency. For the connection setup time and the memory, it is considerably larger with Laravel than with Express.
  *Supported if:* Comparisons 5 to 8: |δ| < 0.33 for the latency at all load levels. For the connection setup time and the working set, the median difference between Laravel and the minimal implementation is larger than between Express and the minimal implementation at the same transport and load level, and the Laravel effect is significant.
- **H6:** The framework-based PHP WebSocket variant (php-laravel-ws) has a consistently higher latency than the framework-based Node.js WebSocket variant (node-express-ws), because every event passes through an additional internal HTTP call from the listener to Reverb.
  *Supported if:* Comparison 4: php-laravel-ws has a significantly higher latency at all three load levels.
- **H7:** The message queue increases the latency in both stacks, more so with Laravel than with BullMQ.
  *Supported if:* Comparisons 9 and 10: the queue variant has a significantly higher latency at all load levels, and the median difference is larger for Laravel (comparison 10) than for BullMQ (comparison 9).
- **H8:** With PHP and Server-Sent Events, Redis accounts for a substantial share of the total CPU time. For all other variants, its share is small.
  *Supported if:* At 500 clients, median share of Redis in the total CPU time over all valid runs of the variant in block 1: at least 25% for all PHP-FPM variants with Server-Sent Events (php-minimal-sse, php-laravel-sse and php-laravel-sse-queue, substantial) and below 10% for all other variants (small).
- **H9:** With Node.js, where both transports use the same runtime model, Server-Sent Events cause less overhead than WebSockets, that is, less CPU time and a smaller working set at the same load (expectation from the proposal).
  *Supported if:* Comparison 12: Server-Sent Events have a significantly lower CPU time and a significantly smaller working set at all load levels.
- **H10:** With PHP, the runtime model determines the transport comparison. PHP-FPM with Server-Sent Events (one worker per connection) requires a multiple of the memory of the Ratchet WebSocket server (one event loop) at 500 clients.
  *Supported if:* Comparison 13 at 500 clients: the working set of Server-Sent Events is at least twice that of WebSockets, and the difference is significant.
- **H11:** At high event rates, the WebSocket variants reach a higher maximum sustainable event rate than the Server-Sent Events variants with the same language and the same framework choice (expectation from the proposal).
  *Supported if:* In all four pairs of a Server-Sent Events variant and a WebSocket variant with the same language and framework choice, the WebSocket variant reaches the higher maximum sustainable event rate. Undecided in case of a tie, for example when both reach the highest step.

## Hinweise

- ohne --series, H4 und H11 bleiben unentschieden
