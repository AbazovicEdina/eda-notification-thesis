# BullMQ-Queue

Queue-Weg der Zelle node-express/SSE mit Queue (DECISIONS.md 5.19):

- Die Ereignisquelle (`tools/event-simulator`, Modus `queue`) legt Scan-Events als Jobs in die BullMQ-Queue `scan-events`.
- `worker.js` nimmt die Jobs entgegen und veröffentlicht jedes Event unverändert, ergänzt um `processed_ts`, auf dem Redis-Pub/Sub-Kanal `notifications`.
- Der SSE-Endpunkt der Zelle ist derselbe Code wie `../sse.js` und abonniert `notifications` statt `scan-events` (Dienst `node-express-sse-queue` in `docker-compose.yml`).

Die Zelle node-express/SSE ohne Queue abonniert `scan-events` direkt. Der Vergleich beider Zellen (Vergleich 9) zeigt damit den Overhead der Queue; der Vergleich node-minimal gegen node-express zeigt ausschließlich den Overhead von Express (DECISIONS.md 5.7).

`producer.js` legt einen einzelnen Test-Job an, zum manuellen Ausprobieren des Workers:

```bash
docker compose --profile node-express-queue up -d node-express-worker
docker compose --profile node-express-queue run --rm node-express-producer
```
