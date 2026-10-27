// Erzeugt einen einzelnen Test-Job in der BullMQ-Queue "scan-events" — zum
// Ausprobieren/Verifizieren des Workers. Für echte Lasttests übernimmt das
// tools/event-simulator.
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

// BullMQ 6 erwartet in ES-Modulen eine fertige ioredis-Verbindung.
const connection = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: Number(process.env.REDIS_PORT || 6379),
});

const queue = new Queue('scan-events', { connection });
await queue.add('scan', { seq: 1, ts: Date.now() });
console.log('scan-events: 1 Test-Job hinzugefügt');
await queue.close();
await connection.quit();
