# redis-baseline

Isolierter Test von Redis Pub/Sub ohne Prototyp und ohne Nginx. `CLIENTS` direkte Redis-Subscriber stehen für die gleichzeitigen SSE- bzw. WebSocket-Clients, ein Publisher sendet im Takt von `EVENT_INTERVAL_MS`. Zweck: Zeigt sich in den Messungen eine Grenze, lässt sich unterscheiden, ob sie von Redis oder vom jeweiligen Anwendungs-Stack stammt.

```bash
docker compose --profile tools run --rm \
  -e CLIENTS=500 -e HOLD_SECONDS=60 -e EVENT_INTERVAL_MS=1000 \
  redis-baseline
```

Das Ergebnis (Latenz min/avg/median/p95/p99/max, erwartete und empfangene Events) wird nach `results/` geschrieben.
