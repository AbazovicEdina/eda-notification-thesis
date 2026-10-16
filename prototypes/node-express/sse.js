// SSE-Endpunkt mit Express — inhaltlich identisch zu prototypes/node-minimal/sse.js,
// damit der einzige Unterschied zwischen den beiden Node-Varianten der
// Framework-Overhead von Express ist, nicht eine andere Event-Quelle
// (dieselbe Redis-Subscription auf "scan-events", eine pro Prozess, siehe
// DECISIONS.md 5.4). Die BullMQ-Queue in queue/ ist ein separater Baustein
// für die volle Lokato-Pipeline (siehe queue/README.md) und speist diesen
// Endpunkt bewusst NICHT — sonst würde die Messung Framework-Overhead und
// Queue-Overhead vermischen.
import express from 'express';
import { createClient } from 'redis';

const PORT = process.env.PORT || 8080;
const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';
const CHANNEL = process.env.EVENT_CHANNEL || 'scan-events';

const clients = new Set();

const subscriber = createClient({ url: REDIS_URL });
await subscriber.connect();
await subscriber.subscribe(CHANNEL, (message) => {
  const event = JSON.parse(message);
  event.sut_ts = Date.now();
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of clients) res.write(payload);
});

const app = express();

app.get('/healthz', (req, res) => res.send('ok'));

app.get('/sse', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  clients.add(res);
  req.on('close', () => clients.delete(res));
});

app.listen(PORT, () => console.log(`node-express sse: listening on :${PORT}`));
