# BullMQ-Grundgerüst

Baustein für die vollständige Lokato-Pipeline, bewusst getrennt von `../sse.js` und `../ws.js`:

- `producer.js` legt einen Test-Job in die Queue `scan-events`.
- `worker.js` nimmt Jobs entgegen, verarbeitet sie minimal (Platzhalter) und veröffentlicht das Ergebnis als Notification auf dem Redis-Pub/Sub-Kanal `notifications`.

Die gemessenen SSE/WS-Endpunkte sind nicht an die Queue angeschlossen, sondern abonnieren `scan-events` direkt (DECISIONS.md 5.4). Der Vergleich node-minimal gegenüber node-express zeigt damit ausschließlich den Overhead von Express, nicht zusätzlich den einer Queue (DECISIONS.md 5.7). In einem vollständigen Lokato-Prototyp würden die Endpunkte stattdessen `notifications` abonnieren, sobald die Ingestion über eine Queue läuft.

Ausführen:

```bash
docker compose --profile node-express-queue run --rm node-express-worker
docker compose --profile node-express-queue run --rm node-express-producer
```
