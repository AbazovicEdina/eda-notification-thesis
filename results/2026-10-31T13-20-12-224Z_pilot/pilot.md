# Auswertung des Pilots

Kriterium (DECISIONS.md 5.9): Vorzeichen und Effektklasse von Cliff's Delta ändern sich nicht mehr, und das 95-%-Konfidenzintervall der Median-Differenz wird je weiterem Zwischenstand um weniger als 10 % schmaler. Mindestens ein späterer Zwischenstand bestätigt das. Mindestens 20 Paare.

## Je Laststufe

| Laststufe | Paare im Pilot | stabil ab (größter Wert) | nicht stabil im Pilot |
|---|---|---|---|
| baseline | 100 | 90 | – |
| medium | 60 | – | php-minimal-sse vs. php-laravel-sse |
| stress | 40 | – | php-minimal-sse vs. php-laravel-sse, php-laravel-sse vs. php-laravel-sse-queue |

## Je Vergleich

### node-express-ws vs. php-laravel-ws, baseline

Stabil ab 90 Paaren.

| Paare | Median-Differenz (ms) | Breite 95-%-KI (ms) | Cliff's Delta | Effektklasse |
|---|---|---|---|---|
| 10 | -2.148 | 0.055 | -1.000 | groß |
| 20 | -2.162 | 0.058 | -1.000 | groß |
| 30 | -2.174 | 0.059 | -1.000 | groß |
| 40 | -2.192 | 0.063 | -1.000 | groß |
| 50 | -2.186 | 0.042 | -1.000 | groß |
| 60 | -2.188 | 0.047 | -1.000 | groß |
| 70 | -2.188 | 0.042 | -1.000 | groß |
| 80 | -2.195 | 0.042 | -1.000 | groß |
| 90 | -2.200 | 0.033 | -1.000 | groß |
| 100 | -2.200 | 0.031 | -1.000 | groß |

### node-minimal-sse vs. php-minimal-sse, baseline

Stabil ab 70 Paaren.

| Paare | Median-Differenz (ms) | Breite 95-%-KI (ms) | Cliff's Delta | Effektklasse |
|---|---|---|---|---|
| 10 | 0.050 | 0.207 | 0.160 | klein |
| 20 | 0.082 | 0.079 | 0.265 | klein |
| 30 | 0.037 | 0.090 | 0.221 | klein |
| 40 | 0.023 | 0.102 | 0.101 | vernachlässigbar |
| 50 | 0.023 | 0.091 | 0.114 | vernachlässigbar |
| 60 | 0.018 | 0.094 | 0.060 | vernachlässigbar |
| 70 | 0.007 | 0.067 | 0.014 | vernachlässigbar |
| 80 | 0.005 | 0.062 | 0.003 | vernachlässigbar |
| 90 | 0.009 | 0.070 | 0.034 | vernachlässigbar |
| 100 | 0.009 | 0.069 | 0.053 | vernachlässigbar |

### php-laravel-sse vs. php-laravel-sse-queue, baseline

Stabil ab 80 Paaren.

| Paare | Median-Differenz (ms) | Breite 95-%-KI (ms) | Cliff's Delta | Effektklasse |
|---|---|---|---|---|
| 10 | -1.205 | 0.227 | -1.000 | groß |
| 20 | -1.145 | 0.230 | -1.000 | groß |
| 30 | -1.167 | 0.179 | -1.000 | groß |
| 40 | -1.122 | 0.188 | -1.000 | groß |
| 50 | -1.101 | 0.158 | -1.000 | groß |
| 60 | -1.117 | 0.134 | -1.000 | groß |
| 70 | -1.122 | 0.087 | -1.000 | groß |
| 80 | -1.127 | 0.072 | -1.000 | groß |
| 90 | -1.127 | 0.088 | -1.000 | groß |
| 100 | -1.137 | 0.083 | -1.000 | groß |

### php-minimal-sse vs. php-laravel-sse, baseline

Stabil ab 90 Paaren.

| Paare | Median-Differenz (ms) | Breite 95-%-KI (ms) | Cliff's Delta | Effektklasse |
|---|---|---|---|---|
| 10 | 0.023 | 0.177 | -0.150 | klein |
| 20 | 0.033 | 0.153 | -0.063 | vernachlässigbar |
| 30 | -0.007 | 0.114 | -0.132 | vernachlässigbar |
| 40 | 0.008 | 0.106 | -0.055 | vernachlässigbar |
| 50 | 0.000 | 0.097 | -0.064 | vernachlässigbar |
| 60 | 0.008 | 0.085 | 0.011 | vernachlässigbar |
| 70 | 0.012 | 0.077 | 0.005 | vernachlässigbar |
| 80 | 0.007 | 0.082 | -0.054 | vernachlässigbar |
| 90 | 0.007 | 0.073 | -0.056 | vernachlässigbar |
| 100 | 0.007 | 0.072 | -0.062 | vernachlässigbar |

### node-express-ws vs. php-laravel-ws, medium

Stabil ab 30 Paaren.

| Paare | Median-Differenz (ms) | Breite 95-%-KI (ms) | Cliff's Delta | Effektklasse |
|---|---|---|---|---|
| 10 | -2.228 | 0.135 | -1.000 | groß |
| 20 | -2.261 | 0.068 | -1.000 | groß |
| 30 | -2.251 | 0.059 | -1.000 | groß |
| 40 | -2.258 | 0.058 | -1.000 | groß |
| 50 | -2.258 | 0.063 | -1.000 | groß |
| 60 | -2.262 | 0.059 | -1.000 | groß |

### node-minimal-sse vs. php-minimal-sse, medium

Stabil ab 50 Paaren.

| Paare | Median-Differenz (ms) | Breite 95-%-KI (ms) | Cliff's Delta | Effektklasse |
|---|---|---|---|---|
| 10 | 0.030 | 0.224 | 0.340 | mittel |
| 20 | 0.030 | 0.168 | 0.365 | mittel |
| 30 | 0.055 | 0.096 | 0.444 | mittel |
| 40 | 0.048 | 0.073 | 0.333 | mittel |
| 50 | 0.048 | 0.060 | 0.321 | klein |
| 60 | 0.036 | 0.062 | 0.229 | klein |

### php-laravel-sse vs. php-laravel-sse-queue, medium

Stabil ab 50 Paaren.

| Paare | Median-Differenz (ms) | Breite 95-%-KI (ms) | Cliff's Delta | Effektklasse |
|---|---|---|---|---|
| 10 | -1.153 | 0.190 | -1.000 | groß |
| 20 | -1.122 | 0.136 | -1.000 | groß |
| 30 | -1.142 | 0.111 | -1.000 | groß |
| 40 | -1.126 | 0.082 | -1.000 | groß |
| 50 | -1.122 | 0.072 | -1.000 | groß |
| 60 | -1.103 | 0.066 | -1.000 | groß |

### php-minimal-sse vs. php-laravel-sse, medium

Im Pilot nicht stabil (Intervall wird noch um 25 % schmaler).

| Paare | Median-Differenz (ms) | Breite 95-%-KI (ms) | Cliff's Delta | Effektklasse |
|---|---|---|---|---|
| 10 | -0.047 | 0.114 | -0.420 | mittel |
| 20 | -0.015 | 0.104 | -0.105 | vernachlässigbar |
| 30 | -0.025 | 0.071 | -0.136 | vernachlässigbar |
| 40 | -0.013 | 0.072 | -0.031 | vernachlässigbar |
| 50 | -0.013 | 0.069 | -0.046 | vernachlässigbar |
| 60 | -0.011 | 0.052 | -0.003 | vernachlässigbar |

### node-express-ws vs. php-laravel-ws, stress

Stabil ab 30 Paaren.

| Paare | Median-Differenz (ms) | Breite 95-%-KI (ms) | Cliff's Delta | Effektklasse |
|---|---|---|---|---|
| 10 | -2.600 | 1.294 | -1.000 | groß |
| 20 | -2.132 | 1.025 | -0.955 | groß |
| 30 | -2.075 | 0.672 | -0.964 | groß |
| 40 | -2.075 | 0.614 | -0.974 | groß |

### node-minimal-sse vs. php-minimal-sse, stress

Stabil ab 30 Paaren.

| Paare | Median-Differenz (ms) | Breite 95-%-KI (ms) | Cliff's Delta | Effektklasse |
|---|---|---|---|---|
| 10 | 3.303 | 1.723 | 1.000 | groß |
| 20 | 2.317 | 1.785 | 1.000 | groß |
| 30 | 2.170 | 1.000 | 1.000 | groß |
| 40 | 2.253 | 1.041 | 1.000 | groß |

### php-laravel-sse vs. php-laravel-sse-queue, stress

Im Pilot nicht stabil (Intervall wird noch um 13 % schmaler).

| Paare | Median-Differenz (ms) | Breite 95-%-KI (ms) | Cliff's Delta | Effektklasse |
|---|---|---|---|---|
| 10 | -1.228 | 0.412 | -1.000 | groß |
| 20 | -1.188 | 0.316 | -1.000 | groß |
| 30 | -1.222 | 0.250 | -1.000 | groß |
| 40 | -1.182 | 0.218 | -1.000 | groß |

### php-minimal-sse vs. php-laravel-sse, stress

Im Pilot nicht stabil (Intervall wird noch um 12 % schmaler).

| Paare | Median-Differenz (ms) | Breite 95-%-KI (ms) | Cliff's Delta | Effektklasse |
|---|---|---|---|---|
| 10 | 0.175 | 0.859 | 0.060 | vernachlässigbar |
| 20 | 0.148 | 0.621 | -0.085 | vernachlässigbar |
| 30 | 0.075 | 0.498 | -0.082 | vernachlässigbar |
| 40 | -0.002 | 0.441 | -0.125 | vernachlässigbar |

Mittlere Dauer eines Laufs einschließlich Pausen und Vorlauf: 76.3 s.

Geschätzte Dauer eines Blocks mit baseline 90, medium 90, stress 90 Läufen je Konfiguration und 5 Warm-up-Läufen: 7410 Läufe, 157 h (6.5 Tage).
