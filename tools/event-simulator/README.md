# event-simulator

Ersetzt die echte RFID/ESP32/MQTT-Hardware aus Lokato für die Lasttests.
Setzt den Zeitstempel `ts` beim Publish/Enqueue (DECISIONS.md 5.4 — das
markiert den Start der Ende-zu-Ende-Messung).

```bash
# Direktes Pub/Sub (Standard) — für die gemessenen SSE/WS-Endpunkte
docker compose --profile tools run --rm -e RATE_PER_SECOND=5 -e COUNT=100 event-simulator

# BullMQ-Queue statt Pub/Sub — zum Testen der Queue-Grundgerüste
# (node-express/queue, php-laravel ProcessScanEvent), siehe deren READMEs
docker compose --profile tools run --rm -e MODE=queue -e COUNT=10 event-simulator
```

`COUNT=0` (Default) läuft unbegrenzt, bis der Container gestoppt wird
(`docker compose stop event-simulator` bzw. Ctrl-C bei `run` im Vordergrund).
