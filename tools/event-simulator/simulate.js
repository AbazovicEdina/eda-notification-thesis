// Simulated scan event generator. Replaces the real RFID/ESP32/MQTT
// hardware of Lokato for the load tests. Sets the timestamp `ts` at publish
// time (DECISIONS.md 5.4, this is the start of the end-to-end measurement).
// Two modes:
//   pubsub (default)  publishes directly on EVENT_CHANNEL, which all SSE/WS
//                     prototypes subscribe to.
//   queue             adds jobs to the BullMQ queue "scan-events" for
//                     testing the queue path (node-express/queue,
//                     php-laravel ProcessScanEvent), see the READMEs there
//                     for how it differs from the SSE/WS paths.
import { createClient } from 'redis';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

const MODE = process.env.MODE || 'pubsub';
const REDIS_HOST = process.env.REDIS_HOST || 'redis';
const REDIS_PORT = Number(process.env.REDIS_PORT || 6379);
const CHANNEL = process.env.EVENT_CHANNEL || 'scan-events';
const RATE_PER_SECOND = Number(process.env.RATE_PER_SECOND || 1);
const COUNT = Number(process.env.COUNT || 0); // 0 = unlimited, until SIGINT/SIGTERM

const intervalMs = 1000 / RATE_PER_SECOND;

// Scan event in the original Lokato format (reader, tag UID, time), extended
// by the measurement fields seq (sequence number, loss counting) and ts
// (send time, start of the latency measurement), DECISIONS.md 5.4, 5.21.
// The UID varies per event, as with real scans of different tags.
function nextPayload(seq) {
  const ts = Date.now();
  return {
    event: 'scan',
    device: 'R200_3',
    uid: `E28068940000${seq.toString(16).toUpperCase().padStart(12, '0')}`,
    timestamp: ts,
    seq,
    ts,
  };
}

async function runPubsub() {
  const client = createClient({ url: `redis://${REDIS_HOST}:${REDIS_PORT}` });
  await client.connect();
  await publishLoop((seq) => client.publish(CHANNEL, JSON.stringify(nextPayload(seq))), { awaitEach: false });
  await client.close();
}

// By default BullMQ keeps every completed job in Redis. Redis is measured
// together with every cell, so its memory would grow over the whole schedule
// and shift the values of all cells measured later (DECISIONS.md 5.20).
// Completed jobs are therefore removed, as the Laravel queue does by default.
const JOB_OPTIONS = { removeOnComplete: true, removeOnFail: 1000 };

// In ES modules BullMQ 6 expects a ready ioredis connection.
async function runQueue() {
  const connection = new Redis({ host: REDIS_HOST, port: REDIS_PORT });
  const queue = new Queue('scan-events', { connection });
  await publishLoop((seq) => queue.add('scan', nextPayload(seq), JOB_OPTIONS));
  await queue.close();
  await connection.quit();
}

// Timing follows an absolute schedule (start + seq · interval) instead of
// "send, then wait a full interval". The latter adds the publish duration to
// every interval, so the actual rate would be systematically below
// RATE_PER_SECOND (DECISIONS.md 5.17). If the process falls behind, it
// catches up without pausing instead of silently lowering the rate.
//
// awaitEach = false (pub/sub, second run of 2026-11-16): the next event does
// not wait for the reply of Redis. Redis answers PUBLISH only after it has
// queued the message for every subscriber, and with one subscription per
// PHP-FPM worker the reply time grows with the number of clients. Waiting
// for it made the send rate depend on Redis in the first run. Commands are
// pipelined by the client, at most MAX_IN_FLIGHT are open at a time.
// awaitEach = true (queue): waits for every job, like scan:produce, which
// pushes synchronously.
const MAX_IN_FLIGHT = 10000;

async function publishLoop(publish, { awaitEach = true } = {}) {
  let seq = 0;
  let stop = false;
  let failures = 0;
  const inFlight = new Set();
  process.on('SIGINT', () => { stop = true; });
  process.on('SIGTERM', () => { stop = true; });

  const startedAt = performance.now();
  console.log(`event-simulator: sende ${RATE_PER_SECOND} Events/s (Modus: ${MODE}, Kanal/Queue: ${CHANNEL}, ${awaitEach ? 'wartet je Event' : 'ohne Warten'})`);
  while (!stop && (COUNT === 0 || seq < COUNT)) {
    seq += 1;
    if (awaitEach) {
      await publish(seq);
    } else {
      const pending = publish(seq)
        .catch((err) => {
          failures += 1;
          if (failures <= 5) console.error('event-simulator: Senden fehlgeschlagen:', err);
        })
        .finally(() => inFlight.delete(pending));
      inFlight.add(pending);
      if (inFlight.size >= MAX_IN_FLIGHT) await Promise.race(inFlight);
    }
    const nextAt = startedAt + seq * intervalMs;
    const waitMs = nextAt - performance.now();
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    } else if (!awaitEach) {
      // Behind schedule: still yield once, so that the client can write the
      // pipelined commands to the socket while the loop catches up.
      await new Promise((resolve) => setImmediate(resolve));
    }
  }
  await Promise.allSettled([...inFlight]);
  const elapsedS = (performance.now() - startedAt) / 1000;
  console.log(`event-simulator: ${seq} Events in ${elapsedS.toFixed(1)}s gesendet (${(seq / elapsedS).toFixed(2)}/s)${failures ? `, ${failures} fehlgeschlagen` : ''}`);
}

(MODE === 'queue' ? runQueue() : runPubsub()).catch((err) => {
  console.error('event-simulator: Fehler:', err);
  process.exit(1);
});
