# monitor

Loggt `docker stats` (CPU/Memory) während eines Testlaufs in eine CSV-Datei
unter `results/` (Prompt Teil 2, Aufgabe 5). Convenience-Tool, kein
Prototyp — läuft lokal mit Node, gleiche Begründung wie
`tools/orchestrate` (siehe dessen README).

```bash
# Container-Namen: docker compose ps (Spalte NAME), z.B. eda-thesis-node-minimal-sse-1
node tools/monitor/monitor.js eda-thesis-node-minimal-sse-1
```

Mehrere Container gleichzeitig (kommagetrennt), eigenes Intervall/Ziel:

```bash
node tools/monitor/monitor.js eda-thesis-php-minimal-fpm-1,eda-thesis-php-minimal-nginx-1 \
  --interval-ms=2000 --out=results/mein-lauf.csv
```

Läuft bis Strg-C oder bis der überwachte Container verschwindet — parallel
zu einem k6-Lauf bzw. `tools/orchestrate` in einem zweiten Terminal starten.

Hinweis: `docker stats --no-stream` braucht selbst ~1–3 Sekunden pro
Aufruf (Docker muss einmal über ein Sample-Fenster mitteln); `--interval-ms`
ist deshalb ein Mindestabstand, kein exaktes Taktintervall.
