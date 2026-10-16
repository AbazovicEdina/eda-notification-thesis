// Isolierter Redis-Pub/Sub-Durchsatztest — OHNE jede Anwendungslogik
// (kein PHP, kein Node-Prototyp, kein Nginx). Zweck: bei einer späteren
// Grenze in den echten Messungen unterscheiden können, ob sie von Redis
// selbst kommt oder vom jeweiligen Anwendungs-Stack (Prompt Teil 2,
// Aufgabe 10). CLIENTS simuliert die Anzahl gleichzeitiger SSE/WS-Clients
// als direkte Redis-Subscriber; ein separater Publisher sendet im
// EVENT_INTERVAL_MS-Takt, wie tools/event-simulator.
import { createClient } from 'redis';
import { writeFileSync, mkdirSync } from 'node:fs';

const REDIS_HOST = process.env.REDIS_HOST || 'redis';
const REDIS_PORT = Number(process.env.REDIS_PORT || 6379);
const CHANNEL = process.env.EVENT_CHANNEL || 'scan-events';
const CLIENTS = Number(process.env.CLIENTS || 50);
const HOLD_SECONDS = Number(process.env.HOLD_SECONDS || 60);
const EVENT_INTERVAL_MS = Number(process.env.EVENT_INTERVAL_MS || 1000);
const RESULTS_DIR = process.env.RESULTS_DIR || '/results';

function percentile(sorted, p) {
  if (sorted.length === 0) return null;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

async function main() {
  const url = `redis://${REDIS_HOST}:${REDIS_PORT}`;
  const latencies = [];

  const subscribers = await Promise.all(
    Array.from({ length: CLIENTS }, async () => {
      const client = createClient({ url });
      await client.connect();
      await client.subscribe(CHANNEL, (message) => {
        const { ts } = JSON.parse(message);
        latencies.push(Date.now() - ts);
      });
      return client;
    })
  );
  console.log(`redis-baseline: ${CLIENTS} Subscriber verbunden auf "${CHANNEL}"`);

  const publisher = createClient({ url });
  await publisher.connect();
  let seq = 0;
  const publishTimer = setInterval(() => {
    seq += 1;
    publisher.publish(CHANNEL, JSON.stringify({ seq, ts: Date.now() }));
  }, EVENT_INTERVAL_MS);

  await new Promise((resolve) => setTimeout(resolve, HOLD_SECONDS * 1000));
  clearInterval(publishTimer);
  await new Promise((resolve) => setTimeout(resolve, EVENT_INTERVAL_MS * 2)); // letzte Events noch abholen

  await Promise.all(subscribers.map((c) => c.quit()));
  await publisher.quit();

  const sorted = [...latencies].sort((a, b) => a - b);
  const summary = {
    timestamp: new Date().toISOString(),
    clients: CLIENTS,
    hold_seconds: HOLD_SECONDS,
    event_interval_ms: EVENT_INTERVAL_MS,
    events_published: seq,
    events_received: latencies.length,
    expected_received: seq * CLIENTS,
    latency_ms: {
      min: sorted[0] ?? null,
      avg: sorted.length ? sorted.reduce((a, b) => a + b, 0) / sorted.length : null,
      median: percentile(sorted, 50),
      p95: percentile(sorted, 95),
      p99: percentile(sorted, 99),
      max: sorted[sorted.length - 1] ?? null,
    },
  };

  console.log(JSON.stringify(summary, null, 2));

  mkdirSync(RESULTS_DIR, { recursive: true });
  const filename = `${RESULTS_DIR}/${summary.timestamp.replace(/[:.]/g, '-')}_redis-baseline_${CLIENTS}clients.json`;
  writeFileSync(filename, JSON.stringify(summary, null, 2));
  console.log(`redis-baseline: Ergebnis geschrieben nach ${filename}`);
}

main().catch((err) => {
  console.error('redis-baseline: Fehler:', err);
  process.exit(1);
});
