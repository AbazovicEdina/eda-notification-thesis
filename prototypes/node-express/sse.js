// SSE endpoint with Express, identical in content to prototypes/node-minimal/sse.js,
// so that the only difference between the two Node variants is the
// framework overhead of Express and not a different event source (the same
// Redis subscription to "scan-events", one per process, see
// DECISIONS.md 5.4). The BullMQ queue in queue/ is a separate building block
// for the full Lokato pipeline (see queue/README.md) and deliberately does
// NOT feed this endpoint, otherwise the measurement would mix framework
// overhead and queue overhead.
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
  // Send an SSE comment right away (see prototypes/node-minimal/sse.js).
  res.write(': connected\n\n');
  clients.add(res);
  req.on('close', () => clients.delete(res));
});

app.listen(PORT, () => console.log(`node-express sse: listening on :${PORT}`));
