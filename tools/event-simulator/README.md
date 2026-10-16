# event-simulator

Ersetzt die RFID/ESP32/MQTT-Hardware aus Lokato für die Lasttests. Der Simulator sendet Scan-Events mit fester Rate im Originalformat von Lokato, ergänzt um zwei Messfelder (DECISIONS.md 5.4, 5.21):

```json
{ "event": "scan", "device": "R200_3", "uid": "E28068940000000000000001", "timestamp": 1792168228306, "seq": 1, "ts": 1792168228306 }
```

`ts` ist der Sendezeitpunkt; dort beginnt die Ende-zu-Ende-Messung. `seq` ist die laufende Nummer für die Verlustzählung in k6 (DECISIONS.md 5.17). Die UID variiert pro Event wie bei echten Scans verschiedener Tags.

Der Takt folgt einem absoluten Zeitplan (Start + seq · Intervall). Die tatsächliche Rate entspricht damit der eingestellten, auch wenn ein Sendevorgang Zeit benötigt. Bei Verzug wird ohne Pause nachgeholt.

| Variable | Standard | Bedeutung |
| --- | --- | --- |
| `RATE_PER_SECOND` | 1 | Events pro Sekunde (Compose: `SIMULATOR_RATE`) |
| `COUNT` | 0 | Anzahl Events, 0 = unbegrenzt bis zum Stoppen |
| `MODE` | `pubsub` | `pubsub` (Redis-Kanal) oder `queue` (BullMQ-Queue `scan-events`) |
| `REDIS_HOST`, `REDIS_PORT` | `redis`, 6379 | Compose: `SIMULATOR_REDIS_HOST`, `SIMULATOR_REDIS_PORT`; auf dem separaten Lastgenerator die Adresse des Pi |
| `EVENT_CHANNEL` | `scan-events` | Redis-Kanal, den die Zellen ohne Queue abonnieren |

In `docker-compose.yml` gibt es zwei Dienste aus demselben Image: `event-simulator` (Modus `pubsub`) und `event-simulator-bullmq` (Modus `queue`, für die Zelle node-express/SSE mit Queue). Für die Laravel-Queue übernimmt `scan:produce` dieselbe Rolle (`prototypes/php-laravel`). Bei Messkampagnen startet `tools/orchestrate` pro Laststufe die Quellen, die die Zellen der Kampagne brauchen. Manuell:

```bash
# Pub/Sub für die Zellen ohne Queue
docker compose --profile tools run --rm -e RATE_PER_SECOND=5 -e COUNT=100 event-simulator

# BullMQ-Queue
docker compose --profile tools run --rm -e COUNT=10 event-simulator-bullmq
```

Beim Beenden gibt der Simulator die Zahl der gesendeten Events und die erreichte Rate aus.
