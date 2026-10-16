// Minimaler SSE-Endpunkt für die xk6-sse-Machbarkeitsprüfung (DECISIONS.md
// Abschnitt 3) — Hilfswerkzeug, NICHT Teil der Prototypen. Sendet pro Verbindung alle EVENT_INTERVAL_MS ein
// Event mit Server-Zeitstempel, damit k6 die Zustell-Latenz messen kann.
const http = require('http');

const PORT = Number(process.env.PORT || 8081);
const INTERVAL_MS = Number(process.env.EVENT_INTERVAL_MS || 1000);

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
    'Connection': 'keep-alive',
  });

  let seq = 0;
  const timer = setInterval(() => {
    seq += 1;
    res.write(`event: tick\ndata: {"seq":${seq},"ts":${Date.now()}}\n\n`);
  }, INTERVAL_MS);

  req.on('close', () => clearInterval(timer));
});

server.listen(PORT, () => {
  console.log(`sse-feasibility: listening on :${PORT}, interval ${INTERVAL_MS}ms`);
});
