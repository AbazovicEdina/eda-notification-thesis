# BullMQ-Grundgerüst

Baustein für die "volle" Lokato-Pipeline (Prompt Teil 2, Aufgabe 7) —
absichtlich getrennt von `../sse.js` und `../ws.js`:

- `producer.js` legt einen Test-Job in die Queue `scan-events`.
- `worker.js` nimmt Jobs entgegen, verarbeitet sie minimal (Platzhalter) und
  veröffentlicht das Ergebnis als Notification auf dem Redis-Pub/Sub-Kanal
  `notifications`.

Bewusst NICHT an `sse.js`/`ws.js` angeschlossen: Die gemessenen SSE/WS-
Endpunkte abonnieren direkt `scan-events` (DECISIONS.md 5.4), damit der
Vergleich node-minimal vs. node-express ausschließlich den
Express-Framework-Overhead zeigt und nicht zusätzlich Queue-Overhead
vermischt. Ein vollständiger Lokato-Prototyp (außerhalb des Scopes dieser
Arbeit) würde die Endpunkte stattdessen an `notifications` hängen, sobald
die Ingestion-Seite über eine Queue statt direktem Pub/Sub läuft.

Ausführen:

```bash
docker compose --profile node-express run --rm node-express-worker
docker compose --profile node-express run --rm node-express-producer
```
