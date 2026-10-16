// Simulierter Scan-Event-Generator — ersetzt die echte RFID/ESP32/MQTT-
// Hardware aus Lokato für die Lasttests. Setzt den Zeitstempel `ts` beim
// Publish (DECISIONS.md 5.4: das ist der Start der Ende-zu-Ende-Messung).
// Zwei Modi:
//   pubsub (Standard) — publiziert direkt auf EVENT_CHANNEL, das alle vier
//                        SSE/WS-Prototypen abonnieren.
//   queue             — legt Jobs in die BullMQ-Queue "scan-events", zum
//                        Testen des Queue-Grundgerüsts (node-express/queue,
//                        php-laravel ProcessScanEvent) — siehe dortige
//                        READMEs zur Abgrenzung von den SSE/WS-Pfaden.
import { createClient } from 'redis';
import { Queue } from 'bullmq';

const MODE = process.env.MODE || 'pubsub';
const REDIS_HOST = process.env.REDIS_HOST || 'redis';
const REDIS_PORT = Number(process.env.REDIS_PORT || 6379);
const CHANNEL = process.env.EVENT_CHANNEL || 'scan-events';
const RATE_PER_SECOND = Number(process.env.RATE_PER_SECOND || 1);
const COUNT = Number(process.env.COUNT || 0); // 0 = unbegrenzt, bis SIGINT/SIGTERM

const intervalMs = 1000 / RATE_PER_SECOND;

function nextPayload(seq) {
  return { seq, ts: Date.now() };
}

async function runPubsub() {
  const client = createClient({ url: `redis://${REDIS_HOST}:${REDIS_PORT}` });
  await client.connect();
  await publishLoop((seq) => client.publish(CHANNEL, JSON.stringify(nextPayload(seq))));
  await client.quit();
}

async function runQueue() {
  const queue = new Queue('scan-events', { connection: { host: REDIS_HOST, port: REDIS_PORT } });
  await publishLoop((seq) => queue.add('scan', nextPayload(seq)));
  await queue.close();
}

async function publishLoop(publish) {
  let seq = 0;
  let stop = false;
  process.on('SIGINT', () => { stop = true; });
  process.on('SIGTERM', () => { stop = true; });

  while (!stop && (COUNT === 0 || seq < COUNT)) {
    seq += 1;
    await publish(seq);
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  console.log(`event-simulator: ${seq} Events gesendet (Modus: ${MODE}, Kanal/Queue: ${CHANNEL})`);
}

(MODE === 'queue' ? runQueue() : runPubsub()).catch((err) => {
  console.error('event-simulator: Fehler:', err);
  process.exit(1);
});
