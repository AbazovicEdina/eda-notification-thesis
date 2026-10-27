// Minimaler BullMQ-Worker: nimmt Scan-Events aus der Queue "scan-events" und
// verarbeitet sie (hier: Platzhalter-Verarbeitung + Veröffentlichung einer
// Notification). Grundgerüst für die volle Lokato-Pipeline — siehe
// README.md in diesem Ordner für die Abgrenzung zu sse.js/ws.js.
import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { createClient } from 'redis';

const host = process.env.REDIS_HOST || 'redis';
const port = Number(process.env.REDIS_PORT || 6379);

// BullMQ 6 bringt ioredis nicht mehr selbst mit und erwartet in ES-Modulen
// eine fertige Verbindung. maxRetriesPerRequest: null verlangt BullMQ für
// die blockierenden Abfragen des Workers (BullMQ-Dokumentation, Connections).
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
