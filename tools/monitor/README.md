# monitor

Protokolliert `docker stats` (CPU, Speicher, Netz, Block-I/O) als CSV-Datei unter `results/`. Das Werkzeug dient der manuellen Beobachtung, z. B. bei der Fehlersuche. Für Messungen erfasst `tools/resource-sampler` CPU und Speicher pro Lauf, exakter und mit geringerer Eigenlast (DECISIONS.md 5.16).

Das Werkzeug läuft direkt mit Node.js, weil es die Docker-CLI aufruft.

```bash
# Containernamen: docker compose ps (Spalte NAME)
node tools/monitor/monitor.js eda-thesis-node-minimal-sse-1
```

Mehrere Container (kommagetrennt), eigenes Intervall und Ziel:

```bash
node tools/monitor/monitor.js eda-thesis-php-laravel-reverb-1,eda-thesis-php-laravel-listener-1 \
  --interval-ms=2000 --out=results/beobachtung.csv
```

Das Werkzeug läuft bis Strg-C oder bis ein überwachter Container nicht mehr existiert. `docker stats --no-stream` benötigt selbst ein bis drei Sekunden pro Aufruf; `--interval-ms` ist daher ein Mindestabstand, kein exakter Takt.
