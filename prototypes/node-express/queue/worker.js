// Minimaler BullMQ-Worker: nimmt Scan-Events aus der Queue "scan-events" und
// verarbeitet sie (hier: Platzhalter-Verarbeitung + Veröffentlichung einer
// Notification). Grundgerüst für die volle Lokato-Pipeline — siehe
// README.md in diesem Ordner für die Abgrenzung zu sse.js/ws.js.
import { Worker } from 'bullmq';
import { createClient } from 'redis';

const connection = {
  host: process.env.REDIS_HOST || 'redis',
  port: Number(process.env.REDIS_PORT || 6379),
};

const publisher = createClient({ url: `redis://${connection.host}:${connection.port}` });
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
