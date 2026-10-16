// Minimaler SSE-Endpunkt: reines http-Modul, kein Framework.
// Eine Redis-Subscription pro Prozess (DECISIONS.md 5.4), verteilt
// eingehende Scan-Events an alle verbundenen SSE-Clients.
import http from 'node:http';
import { createClient } from 'redis';

const PORT = process.env.PORT || 8080;
const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';
const CHANNEL = process.env.EVENT_CHANNEL || 'scan-events';

const clients = new Set();

const subscriber = createClient({ url: REDIS_URL });
await subscriber.connect();
await subscriber.subscribe(CHANNEL, (message) => {
  const event = JSON.parse(message);
  event.sut_ts = Date.now(); // optionaler zweiter Zeitstempel, siehe DECISIONS.md 5.4
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of clients) res.write(payload);
});

const server = http.createServer((req, res) => {
  if (req.url === '/healthz') {
    res.writeHead(200).end('ok');
    return;
  }
  if (req.url !== '/sse') {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  // SSE-Kommentar sofort senden: schickt die Header ab, sodass der Client
  // den Verbindungsaufbau erkennt (DECISIONS.md 5.9). Clients ignorieren ihn.
  res.write(': connected\n\n');
  clients.add(res);
  req.on('close', () => clients.delete(res));
});

server.listen(PORT, () => console.log(`node-minimal sse: listening on :${PORT}`));
