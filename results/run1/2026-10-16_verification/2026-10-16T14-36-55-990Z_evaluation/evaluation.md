# Gesamtauswertung

Erzeugt: 2026-10-16T14:36:55.990Z · Signifikanzniveau α = 0,05 · Holm-Korrektur je Familie über alle geplanten Tests

Vorzeichen: Differenz = A − B. Negative Werte bedeuten, dass A kleiner (bei Latenz, CPU und Speicher: besser) ist.

## latency_mean_ms (primär, m = 24)

Mittelwert der Event-Latenz pro Lauf (DECISIONS.md 5.8)

| Nr. | A vs. B | Laststufe | Paare | Median-Diff [95-%-KI] | Cliff's δ | r (rangbiserial) | p | p (Holm) | signifikant | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | node-minimal-sse vs. php-minimal-sse | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 1 | node-minimal-sse vs. php-minimal-sse | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 1 | node-minimal-sse vs. php-minimal-sse | stress | – | – | – | – | – | 1,000 | nein | fehlt |
| 2 | node-minimal-ws vs. php-minimal-ws | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 2 | node-minimal-ws vs. php-minimal-ws | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 2 | node-minimal-ws vs. php-minimal-ws | stress | – | – | – | – | – | 1,000 | nein | fehlt |
| 3 | node-express-sse vs. php-laravel-sse | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 3 | node-express-sse vs. php-laravel-sse | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 3 | node-express-sse vs. php-laravel-sse | stress | – | – | – | – | – | 1,000 | nein | fehlt |
| 4 | node-express-ws vs. php-laravel-ws | baseline | 3 | -1,089 [-1,132; -1,065] | -1,000 (groß) | -1,000 | 0,250 | 1,000 | nein | gemessen |
| 4 | node-express-ws vs. php-laravel-ws | medium | 3 | -0,965 [-1,115; -0,702] | -1,000 (groß) | -1,000 | 0,250 | 1,000 | nein | gemessen |
| 4 | node-express-ws vs. php-laravel-ws | stress | – | – | – | – | – | 1,000 | nein | fehlt |
| 5 | node-minimal-sse vs. node-express-sse | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 5 | node-minimal-sse vs. node-express-sse | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 5 | node-minimal-sse vs. node-express-sse | stress | – | – | – | – | – | 1,000 | nein | fehlt |
| 6 | node-minimal-ws vs. node-express-ws | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 6 | node-minimal-ws vs. node-express-ws | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 6 | node-minimal-ws vs. node-express-ws | stress | – | – | – | – | – | 1,000 | nein | fehlt |
| 7 | php-minimal-sse vs. php-laravel-sse | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 7 | php-minimal-sse vs. php-laravel-sse | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 7 | php-minimal-sse vs. php-laravel-sse | stress | 2 | -1,393 [-1,455; -1,332] | -1,000 (groß) | -1,000 | 0,500 | 1,000 | nein | gemessen |
| 8 | php-minimal-ws vs. php-laravel-ws | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 8 | php-minimal-ws vs. php-laravel-ws | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 8 | php-minimal-ws vs. php-laravel-ws | stress | – | – | – | – | – | 1,000 | nein | fehlt |

## cpu_seconds (sekundär, m = 24)

CPU-Zeit der Zelle pro Lauf (cgroup usage_usec, DECISIONS.md 5.16)

| Nr. | A vs. B | Laststufe | Paare | Median-Diff [95-%-KI] | Cliff's δ | r (rangbiserial) | p | p (Holm) | signifikant | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | node-minimal-sse vs. php-minimal-sse | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 1 | node-minimal-sse vs. php-minimal-sse | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 1 | node-minimal-sse vs. php-minimal-sse | stress | – | – | – | – | – | 1,000 | nein | fehlt |
| 2 | node-minimal-ws vs. php-minimal-ws | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 2 | node-minimal-ws vs. php-minimal-ws | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 2 | node-minimal-ws vs. php-minimal-ws | stress | – | – | – | – | – | 1,000 | nein | fehlt |
| 3 | node-express-sse vs. php-laravel-sse | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 3 | node-express-sse vs. php-laravel-sse | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 3 | node-express-sse vs. php-laravel-sse | stress | – | – | – | – | – | 1,000 | nein | fehlt |
| 4 | node-express-ws vs. php-laravel-ws | baseline | 3 | -0,025 [-0,029; -0,019] | -1,000 (groß) | -1,000 | 0,250 | 1,000 | nein | gemessen |
| 4 | node-express-ws vs. php-laravel-ws | medium | 3 | -0,010 [-0,014; -0,006] | -1,000 (groß) | -1,000 | 0,250 | 1,000 | nein | gemessen |
| 4 | node-express-ws vs. php-laravel-ws | stress | – | – | – | – | – | 1,000 | nein | fehlt |
| 5 | node-minimal-sse vs. node-express-sse | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 5 | node-minimal-sse vs. node-express-sse | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 5 | node-minimal-sse vs. node-express-sse | stress | – | – | – | – | – | 1,000 | nein | fehlt |
| 6 | node-minimal-ws vs. node-express-ws | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 6 | node-minimal-ws vs. node-express-ws | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 6 | node-minimal-ws vs. node-express-ws | stress | – | – | – | – | – | 1,000 | nein | fehlt |
| 7 | php-minimal-sse vs. php-laravel-sse | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 7 | php-minimal-sse vs. php-laravel-sse | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 7 | php-minimal-sse vs. php-laravel-sse | stress | 2 | -2,494 [-2,564; -2,424] | -1,000 (groß) | -1,000 | 0,500 | 1,000 | nein | gemessen |
| 8 | php-minimal-ws vs. php-laravel-ws | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 8 | php-minimal-ws vs. php-laravel-ws | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 8 | php-minimal-ws vs. php-laravel-ws | stress | – | – | – | – | – | 1,000 | nein | fehlt |

## working_set_peak_bytes (sekundär, m = 24)

Spitze des Speicher-Working-Sets der Zelle pro Lauf (DECISIONS.md 5.16)

| Nr. | A vs. B | Laststufe | Paare | Median-Diff [95-%-KI] | Cliff's δ | r (rangbiserial) | p | p (Holm) | signifikant | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | node-minimal-sse vs. php-minimal-sse | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 1 | node-minimal-sse vs. php-minimal-sse | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 1 | node-minimal-sse vs. php-minimal-sse | stress | – | – | – | – | – | 1,000 | nein | fehlt |
| 2 | node-minimal-ws vs. php-minimal-ws | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 2 | node-minimal-ws vs. php-minimal-ws | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 2 | node-minimal-ws vs. php-minimal-ws | stress | – | – | – | – | – | 1,000 | nein | fehlt |
| 3 | node-express-sse vs. php-laravel-sse | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 3 | node-express-sse vs. php-laravel-sse | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 3 | node-express-sse vs. php-laravel-sse | stress | – | – | – | – | – | 1,000 | nein | fehlt |
| 4 | node-express-ws vs. php-laravel-ws | baseline | 3 | -45518848,000 [-46460928,000; -45465600,000] | -1,000 (groß) | -1,000 | 0,250 | 1,000 | nein | gemessen |
| 4 | node-express-ws vs. php-laravel-ws | medium | 3 | -45682688,000 [-45690880,000; -44498944,000] | -1,000 (groß) | -1,000 | 0,250 | 1,000 | nein | gemessen |
| 4 | node-express-ws vs. php-laravel-ws | stress | – | – | – | – | – | 1,000 | nein | fehlt |
| 5 | node-minimal-sse vs. node-express-sse | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 5 | node-minimal-sse vs. node-express-sse | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 5 | node-minimal-sse vs. node-express-sse | stress | – | – | – | – | – | 1,000 | nein | fehlt |
| 6 | node-minimal-ws vs. node-express-ws | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 6 | node-minimal-ws vs. node-express-ws | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 6 | node-minimal-ws vs. node-express-ws | stress | – | – | – | – | – | 1,000 | nein | fehlt |
| 7 | php-minimal-sse vs. php-laravel-sse | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 7 | php-minimal-sse vs. php-laravel-sse | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 7 | php-minimal-sse vs. php-laravel-sse | stress | 2 | -668844032,000 [-669634560,000; -668053504,000] | -1,000 (groß) | -1,000 | 0,500 | 1,000 | nein | gemessen |
| 8 | php-minimal-ws vs. php-laravel-ws | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 8 | php-minimal-ws vs. php-laravel-ws | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 8 | php-minimal-ws vs. php-laravel-ws | stress | – | – | – | – | – | 1,000 | nein | fehlt |
