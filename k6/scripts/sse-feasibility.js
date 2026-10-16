// SSE-Lasttest (ursprünglich Machbarkeitsprüfung xk6-sse, inzwischen das
// Messskript für alle vier SSE-Zellen): N VUs halten je eine SSE-Verbindung
// und messen pro Event die Zustell-Latenz (Empfangszeit minus
// Sendezeitstempel `ts` des Event-Simulators) sowie die Zustellung
// (verlorene/doppelte Events, k6/lib/delivery.js).
// Achtung: sse.open() blockiert die VU, solange die Verbindung offen ist —
// geschlossen wird deshalb im Event-Handler, sobald die Haltedauer erreicht ist.
import sse from 'k6/x/sse';
import { check } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { BASE_URL, HOLD_SECONDS, holdScenario } from '../lib/config.js';
import { deliveryMetrics, newTracker, track, flush } from '../lib/delivery.js';

const eventLatency = new Trend('sse_event_latency_ms');
const eventsReceived = new Counter('sse_events_received');
const connectionErrors = new Counter('sse_connection_errors');
const delivery = deliveryMetrics('sse');

export const options = holdScenario();

export default function () {
  const deadline = Date.now() + HOLD_SECONDS * 1000;
  const tracker = newTracker();

  const response = sse.open(`${BASE_URL}/sse`, {}, (client) => {
    client.on('event', (event) => {
      const now = Date.now();
      const data = JSON.parse(event.data);
      eventLatency.add(now - data.ts);
      eventsReceived.add(1);
      track(tracker, data);
      if (now >= deadline) {
        client.close();
      }
    });

    client.on('error', (e) => {
      connectionErrors.add(1);
      console.error(`SSE-Fehler: ${e.error()}`);
      client.close();
    });
  });

  flush(delivery, tracker);
  check(response, { 'SSE-Verbindung: HTTP 200': (r) => r && r.status === 200 });
}
