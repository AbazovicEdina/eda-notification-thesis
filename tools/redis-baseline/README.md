# redis-baseline

Isolierter Redis-Pub/Sub-Durchsatztest — kein PHP, kein Node-Prototyp, kein
Nginx dazwischen. `CLIENTS` direkte Redis-Subscriber (simulieren die Anzahl
gleichzeitiger SSE/WS-Clients), ein Publisher sendet im `EVENT_INTERVAL_MS`-
Takt. Zweck: bei einer Grenze in den echten Messungen unterscheiden können,
ob sie von Redis selbst oder vom jeweiligen Anwendungs-Stack kommt.

```bash
docker compose --profile tools run --rm \
  -e CLIENTS=500 -e HOLD_SECONDS=60 -e EVENT_INTERVAL_MS=1000 \
  redis-baseline
```

Schreibt eine Ergebnis-Zusammenfassung (Latenz min/avg/median/p95/p99/max,
Events erwartet vs. empfangen) nach `results/`.
