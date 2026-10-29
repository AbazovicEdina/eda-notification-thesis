// WebSocket endpoint with Express (as HTTP server for the ws library),
// identical in content to prototypes/node-minimal/ws.js. See sse.js for
// why there is deliberately no Express-specific difference here apart from
// the framework itself.
import express from 'express';
import { WebSocketServer } from 'ws';
import { createClient } from 'redis';

const PORT = process.env.PORT || 8080;
const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';
const CHANNEL = process.env.EVENT_CHANNEL || 'scan-events';

const app = express();
app.get('/healthz', (req, res) => res.send('ok'));

const server = app.listen(PORT, () => console.log(`node-express ws: listening on :${PORT}`));

const wss = new WebSocketServer({ server, path: '/ws' });

const subscriber = createClient({ url: REDIS_URL });
await subscriber.connect();
await subscriber.subscribe(CHANNEL, (message) => {
  const event = JSON.parse(message);
  event.sut_ts = Date.now();
  const payload = JSON.stringify(event);
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) client.send(payload);
  }
});
