// Creates a single test job in the BullMQ queue "scan-events", for trying
// out and verifying the worker. For real load tests tools/event-simulator
// takes over this role.
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

// In ES modules BullMQ 6 expects a ready ioredis connection.
const connection = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: Number(process.env.REDIS_PORT || 6379),
});

const queue = new Queue('scan-events', { connection });
await queue.add('scan', { seq: 1, ts: Date.now() });
console.log('scan-events: 1 Test-Job hinzugefügt');
await queue.close();
await connection.quit();
