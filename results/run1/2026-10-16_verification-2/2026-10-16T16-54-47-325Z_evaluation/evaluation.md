# Gesamtauswertung

Erzeugt: 2026-10-16T16:54:47.325Z · Signifikanzniveau α = 0,05 · Holm-Korrektur je Familie über alle geplanten Tests · konfirmatorisch: Block 1

Vorzeichen: Differenz = A − B. Negative Werte bedeuten, dass A kleiner (bei Latenz, CPU und Speicher: besser) ist.

## latency_mean_ms (primär, Block 1, m = 33)

Mittelwert der Event-Latenz pro Lauf im Messfenster (DECISIONS.md 5.8)

| Nr. | A vs. B | Laststufe | Paare | Median-Diff [95-%-KI] | Cliff's δ | r (rangbiserial) | p | p (Holm) | signifikant | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | node-minimal-sse vs. php-minimal-sse | baseline | 2 | 0,450 [0,220; 0,680] | 1,000 (groß) | 1,000 | 0,500 | 1,000 | nein | nicht aussagekräftig |
| 1 | node-minimal-sse vs. php-minimal-sse | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 1 | node-minimal-sse vs. php-minimal-sse | stress | – | – | – | – | – | 1,000 | nein | fehlt |
| 2 | node-minimal-ws vs. php-minimal-ws | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 2 | node-minimal-ws vs. php-minimal-ws | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 2 | node-minimal-ws vs. php-minimal-ws | stress | – | – | – | – | – | 1,000 | nein | fehlt |
| 3 | node-express-sse vs. php-laravel-sse | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 3 | node-express-sse vs. php-laravel-sse | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 3 | node-express-sse vs. php-laravel-sse | stress | – | – | – | – | – | 1,000 | nein | fehlt |
| 4 | node-express-ws vs. php-laravel-ws | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 4 | node-express-ws vs. php-laravel-ws | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 4 | node-express-ws vs. php-laravel-ws | stress | – | – | – | – | – | 1,000 | nein | fehlt |
| 5 | node-minimal-sse vs. node-express-sse | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 5 | node-minimal-sse vs. node-express-sse | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 5 | node-minimal-sse vs. node-express-sse | stress | – | – | – | – | – | 1,000 | nein | fehlt |
| 6 | node-minimal-ws vs. node-express-ws | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 6 | node-minimal-ws vs. node-express-ws | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 6 | node-minimal-ws vs. node-express-ws | stress | – | – | – | – | – | 1,000 | nein | fehlt |
| 7 | php-minimal-sse vs. php-laravel-sse | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 7 | php-minimal-sse vs. php-laravel-sse | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 7 | php-minimal-sse vs. php-laravel-sse | stress | – | – | – | – | – | 1,000 | nein | fehlt |
| 8 | php-minimal-ws vs. php-laravel-ws | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 8 | php-minimal-ws vs. php-laravel-ws | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 8 | php-minimal-ws vs. php-laravel-ws | stress | – | – | – | – | – | 1,000 | nein | fehlt |
| 9 | node-express-sse vs. node-express-sse-queue | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 9 | node-express-sse vs. node-express-sse-queue | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 9 | node-express-sse vs. node-express-sse-queue | stress | – | – | – | – | – | 1,000 | nein | fehlt |
| 10 | php-laravel-sse vs. php-laravel-sse-queue | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 10 | php-laravel-sse vs. php-laravel-sse-queue | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 10 | php-laravel-sse vs. php-laravel-sse-queue | stress | – | – | – | – | – | 1,000 | nein | fehlt |
| 11 | node-express-sse-queue vs. php-laravel-sse-queue | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 11 | node-express-sse-queue vs. php-laravel-sse-queue | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 11 | node-express-sse-queue vs. php-laravel-sse-queue | stress | – | – | – | – | – | 1,000 | nein | fehlt |

## cpu_seconds_total (sekundär, Block 1, m = 33)

CPU-Zeit von Zelle und Redis pro Lauf (DECISIONS.md 5.16)

| Nr. | A vs. B | Laststufe | Paare | Median-Diff [95-%-KI] | Cliff's δ | r (rangbiserial) | p | p (Holm) | signifikant | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | node-minimal-sse vs. php-minimal-sse | baseline | 2 | 0,011 [-0,006; 0,028] | 0,000 (vernachlässigbar) | 0,333 | 1,000 | 1,000 | nein | nicht aussagekräftig |
| 1 | node-minimal-sse vs. php-minimal-sse | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 1 | node-minimal-sse vs. php-minimal-sse | stress | – | – | – | – | – | 1,000 | nein | fehlt |
| 2 | node-minimal-ws vs. php-minimal-ws | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 2 | node-minimal-ws vs. php-minimal-ws | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 2 | node-minimal-ws vs. php-minimal-ws | stress | – | – | – | – | – | 1,000 | nein | fehlt |
| 3 | node-express-sse vs. php-laravel-sse | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 3 | node-express-sse vs. php-laravel-sse | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 3 | node-express-sse vs. php-laravel-sse | stress | – | – | – | – | – | 1,000 | nein | fehlt |
| 4 | node-express-ws vs. php-laravel-ws | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 4 | node-express-ws vs. php-laravel-ws | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 4 | node-express-ws vs. php-laravel-ws | stress | – | – | – | – | – | 1,000 | nein | fehlt |
| 5 | node-minimal-sse vs. node-express-sse | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 5 | node-minimal-sse vs. node-express-sse | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 5 | node-minimal-sse vs. node-express-sse | stress | – | – | – | – | – | 1,000 | nein | fehlt |
| 6 | node-minimal-ws vs. node-express-ws | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 6 | node-minimal-ws vs. node-express-ws | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 6 | node-minimal-ws vs. node-express-ws | stress | – | – | – | – | – | 1,000 | nein | fehlt |
| 7 | php-minimal-sse vs. php-laravel-sse | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 7 | php-minimal-sse vs. php-laravel-sse | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 7 | php-minimal-sse vs. php-laravel-sse | stress | – | – | – | – | – | 1,000 | nein | fehlt |
| 8 | php-minimal-ws vs. php-laravel-ws | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 8 | php-minimal-ws vs. php-laravel-ws | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 8 | php-minimal-ws vs. php-laravel-ws | stress | – | – | – | – | – | 1,000 | nein | fehlt |
| 9 | node-express-sse vs. node-express-sse-queue | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 9 | node-express-sse vs. node-express-sse-queue | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 9 | node-express-sse vs. node-express-sse-queue | stress | – | – | – | – | – | 1,000 | nein | fehlt |
| 10 | php-laravel-sse vs. php-laravel-sse-queue | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 10 | php-laravel-sse vs. php-laravel-sse-queue | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 10 | php-laravel-sse vs. php-laravel-sse-queue | stress | – | – | – | – | – | 1,000 | nein | fehlt |
| 11 | node-express-sse-queue vs. php-laravel-sse-queue | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 11 | node-express-sse-queue vs. php-laravel-sse-queue | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 11 | node-express-sse-queue vs. php-laravel-sse-queue | stress | – | – | – | – | – | 1,000 | nein | fehlt |

## working_set_peak_bytes_total (sekundär, Block 1, m = 33)

Spitze des Speicher-Working-Sets von Zelle und Redis pro Lauf (DECISIONS.md 5.16)

| Nr. | A vs. B | Laststufe | Paare | Median-Diff [95-%-KI] | Cliff's δ | r (rangbiserial) | p | p (Holm) | signifikant | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | node-minimal-sse vs. php-minimal-sse | baseline | 2 | -211879936,000 [-213524480,000; -210235392,000] | -1,000 (groß) | -1,000 | 0,500 | 1,000 | nein | nicht aussagekräftig |
| 1 | node-minimal-sse vs. php-minimal-sse | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 1 | node-minimal-sse vs. php-minimal-sse | stress | – | – | – | – | – | 1,000 | nein | fehlt |
| 2 | node-minimal-ws vs. php-minimal-ws | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 2 | node-minimal-ws vs. php-minimal-ws | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 2 | node-minimal-ws vs. php-minimal-ws | stress | – | – | – | – | – | 1,000 | nein | fehlt |
| 3 | node-express-sse vs. php-laravel-sse | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 3 | node-express-sse vs. php-laravel-sse | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 3 | node-express-sse vs. php-laravel-sse | stress | – | – | – | – | – | 1,000 | nein | fehlt |
| 4 | node-express-ws vs. php-laravel-ws | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 4 | node-express-ws vs. php-laravel-ws | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 4 | node-express-ws vs. php-laravel-ws | stress | – | – | – | – | – | 1,000 | nein | fehlt |
| 5 | node-minimal-sse vs. node-express-sse | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 5 | node-minimal-sse vs. node-express-sse | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 5 | node-minimal-sse vs. node-express-sse | stress | – | – | – | – | – | 1,000 | nein | fehlt |
| 6 | node-minimal-ws vs. node-express-ws | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 6 | node-minimal-ws vs. node-express-ws | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 6 | node-minimal-ws vs. node-express-ws | stress | – | – | – | – | – | 1,000 | nein | fehlt |
| 7 | php-minimal-sse vs. php-laravel-sse | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 7 | php-minimal-sse vs. php-laravel-sse | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 7 | php-minimal-sse vs. php-laravel-sse | stress | – | – | – | – | – | 1,000 | nein | fehlt |
| 8 | php-minimal-ws vs. php-laravel-ws | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 8 | php-minimal-ws vs. php-laravel-ws | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 8 | php-minimal-ws vs. php-laravel-ws | stress | – | – | – | – | – | 1,000 | nein | fehlt |
| 9 | node-express-sse vs. node-express-sse-queue | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 9 | node-express-sse vs. node-express-sse-queue | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 9 | node-express-sse vs. node-express-sse-queue | stress | – | – | – | – | – | 1,000 | nein | fehlt |
| 10 | php-laravel-sse vs. php-laravel-sse-queue | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 10 | php-laravel-sse vs. php-laravel-sse-queue | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 10 | php-laravel-sse vs. php-laravel-sse-queue | stress | – | – | – | – | – | 1,000 | nein | fehlt |
| 11 | node-express-sse-queue vs. php-laravel-sse-queue | baseline | – | – | – | – | – | 1,000 | nein | fehlt |
| 11 | node-express-sse-queue vs. php-laravel-sse-queue | medium | – | – | – | – | – | 1,000 | nein | fehlt |
| 11 | node-express-sse-queue vs. php-laravel-sse-queue | stress | – | – | – | – | – | 1,000 | nein | fehlt |

## Replikation (Block 2 gegen Block 1)

Beschreibender Abgleich ohne eigene Signifikanzaussage: gleiche Richtung der Median-Differenz, gleiche Effektklasse (Cliff's δ), überlappende 95-%-Konfidenzintervalle.

| Messgröße | verglichen | gleiche Richtung | gleiche Effektklasse | KI überlappen |
|---|---|---|---|---|
| latency_mean_ms | 1 | 1 | 1 | 1 |
| cpu_seconds_total | 1 | 0 | 0 | 0 |
| working_set_peak_bytes_total | 1 | 1 | 1 | 0 |

## Hypothesen (vorab festgelegt, DECISIONS.md 5.18)

| Nr. | Hypothese | Vergleiche | Messgröße | Laststufe |
|---|---|---|---|---|
| H1 | Für SSE benötigt PHP-FPM bei 500 Clients ein Vielfaches des Speichers von Node.js. | 1, 3 | working_set_peak_bytes_total | stress |
| H2 | Bei 10 Clients sind die Latenzunterschiede höchstens klein (|δ| < 0,33). | 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 | latency_mean_ms | baseline |
| H3 | Von 10 zu 500 Clients wachsen die Latenzunterschiede zwischen PHP und Node.js; die Richtung ist offen. | 1, 2, 3, 4 | latency_mean_ms | baseline, stress |
| H4 | In der Skalierungsreihe erreicht PHP-FPM/SSE als erste Variante eine harte Grenze; Node.js und die PHP-WebSocket-Server werden allmählich langsamer. | – | served_ratio, latency_mean_ms | Skalierungsreihe |
| H5 | Der Framework-Effekt ist bei der Event-Latenz klein, beim Verbindungsaufbau und beim Speicher aber bei Laravel deutlich größer als bei Express. | 5, 6, 7, 8 | latency_mean_ms, connect_mean_ms, working_set_peak_bytes_total | alle |
| H6 | php-laravel/WS hat durchgehend höhere Latenz als node-express/WS (zusätzlicher interner HTTP-Aufruf Listener → Reverb). | 4 | latency_mean_ms | alle |
| H7 | Die Queue erhöht die Latenz in beiden Stacks, bei Laravel stärker als bei BullMQ. | 9, 10 | latency_mean_ms | alle |
| H8 | Bei PHP/SSE trägt Redis einen wesentlichen Teil der Gesamt-CPU, bei allen anderen Zellen nur einen geringen. | 1, 3, 7 | cpu_seconds_redis / cpu_seconds_total | stress |

Die Bewertung jeder Hypothese (bestätigt, nicht bestätigt, unentschieden) erfolgt in der Arbeit anhand der Tabellen oben, der Skalierungs- und der Sättigungsreihe.

## Hinweise

- 2026-10-16T16-50-22-506Z_mini-control: Phase "control" — nicht Teil der konfirmatorischen Auswertung
