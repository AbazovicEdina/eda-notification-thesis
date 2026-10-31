// Minimal WebSocket endpoint with the ws library, without a framework.
// One Redis subscription per process (DECISIONS.md 5.4), distributes
// incoming scan events to all connected WS clients.
import http from 'node:http';
import { WebSocketServer } from 'ws';
import { createClient } from 'redis';

const PORT = process.env.PORT || 8080;
const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';
const CHANNEL = process.env.EVENT_CHANNEL || 'scan-events';

const server = http.createServer((req, res) => {
  if (req.url === '/healthz') {
    res.writeHead(200).end('ok');
    return;
  }
  res.writeHead(404).end();
});

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

server.listen(PORT, () => console.log(`node-minimal ws: listening on :${PORT}`));
