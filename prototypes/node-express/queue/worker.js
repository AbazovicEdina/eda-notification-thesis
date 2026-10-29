// Minimal BullMQ worker. Takes scan events from the queue "scan-events" and
// processes them (here a placeholder step plus publishing a notification).
// Basic structure for the full Lokato pipeline, see README.md in this
// folder for how it differs from sse.js and ws.js.
import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { createClient } from 'redis';

const host = process.env.REDIS_HOST || 'redis';
const port = Number(process.env.REDIS_PORT || 6379);

// BullMQ 6 no longer ships ioredis itself and expects a ready connection in
// ES modules. BullMQ requires maxRetriesPerRequest: null for the blocking
// calls of the worker (BullMQ documentation, Connections).
const connection = new Redis({ host, port, maxRetriesPerRequest: null });

const publisher = createClient({ url: `redis://${host}:${port}` });
await publisher.connect();

const worker = new Worker(
  'scan-events',
  async (job) => {
    const notification = { ...job.data, processed_ts: Date.now() };
    await publisher.publish('notifications', JSON.stringify(notification));
    return notification;
  },
  { connection }
);

worker.on('completed', (job) => console.log(`scan-events: Job ${job.id} verarbeitet`));
worker.on('failed', (job, err) => console.error(`scan-events: Job ${job?.id} fehlgeschlagen:`, err));
