# event-simulator

Ersetzt die RFID/ESP32/MQTT-Hardware aus Lokato für die Lasttests. Der Simulator sendet Events `{"seq":n,"ts":<ms-epoch>}` mit fester Rate und setzt den Zeitstempel `ts` beim Publish; dort beginnt die Ende-zu-Ende-Messung (DECISIONS.md 5.4). Die laufende Nummer `seq` dient der Verlustzählung in k6 (DECISIONS.md 5.17).

Der Takt folgt einem absoluten Zeitplan (Start + seq · Intervall). Die tatsächliche Rate entspricht damit der eingestellten, auch wenn ein Publish-Vorgang Zeit benötigt. Bei Verzug wird ohne Pause nachgeholt.

| Variable | Standard | Bedeutung |
| --- | --- | --- |
| `RATE_PER_SECOND` | 1 | Events pro Sekunde (Compose: `SIMULATOR_RATE`) |
| `COUNT` | 0 | Anzahl Events, 0 = unbegrenzt bis zum Stoppen |
| `MODE` | `pubsub` | `pubsub` (Redis-Kanal) oder `queue` (BullMQ-Queue `scan-events`) |
| `REDIS_HOST`, `REDIS_PORT` | `redis`, 6379 | Compose: `SIMULATOR_REDIS_HOST`, `SIMULATOR_REDIS_PORT`; auf dem separaten Lastgenerator die Adresse des Pi |
| `EVENT_CHANNEL` | `scan-events` | Redis-Kanal, den alle Prototypen abonnieren |

Bei Messkampagnen startet `tools/orchestrate` den Simulator pro Laststufe mit der festgelegten Rate. Manuell:

```bash
# Pub/Sub für die gemessenen SSE/WS-Endpunkte
docker compose --profile tools run --rm -e RATE_PER_SECOND=5 -e COUNT=100 event-simulator

# BullMQ-Queue zum Testen der Queue-Grundgerüste (node-express/queue, php-laravel ProcessScanEvent)
docker compose --profile tools run --rm -e MODE=queue -e COUNT=10 event-simulator
```

Beim Beenden gibt der Simulator die Zahl der gesendeten Events und die erreichte Rate aus.
