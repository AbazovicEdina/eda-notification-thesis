// SSE-Lasttest (ursprünglich Machbarkeitsprüfung xk6-sse, inzwischen das
// Messskript aller SSE-Zellen): N VUs halten je eine SSE-Verbindung. Im
// Messfenster (nach der Einschwingzeit, k6/lib/config.js) wird pro Event die
// Zustell-Latenz gemessen (Empfangszeit minus Sendezeitstempel `ts`) und die
// Zustellung gezählt (k6/lib/delivery.js); dazu kommt pro Verbindung die
// Dauer des Verbindungsaufbaus.
// sse.open() blockiert die VU, solange die Verbindung offen ist; geschlossen
// wird im Event-Handler, sobald das Messfenster endet.
import sse from 'k6/x/sse';
import { check } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { BASE_URL, holdScenario, measurementWindow, staggerStart } from '../lib/config.js';
import { deliveryMetrics, newTracker, markConnected, track, flush } from '../lib/delivery.js';

const eventLatency = new Trend('sse_event_latency_ms');
const eventsReceived = new Counter('sse_events_received');
const connectionErrors = new Counter('sse_connection_errors');
const delivery = deliveryMetrics('sse');

export const options = holdScenario();

export default function () {
  staggerStart();
  const window = measurementWindow();
  const tracker = newTracker();
  // xk6-sse meldet "open" bei jeder Antwort, auch bei einer Fehlerseite von
  // Nginx. Als Verbindung zählt sie erst, wenn der Status 200 war.
  let openedAt = null;

  const response = sse.open(`${BASE_URL}/sse`, {}, (client) => {
    client.on('open', () => {
      if (openedAt === null) openedAt = Date.now();
    });

    client.on('event', (event) => {
      const now = Date.now();
      if (now >= window.end) {
        client.close();
        return;
      }
      if (now < window.start || !event.data) return;
      const data = JSON.parse(event.data);
      eventLatency.add(now - data.ts);
      eventsReceived.add(1);
      track(tracker, data);
    });

    client.on('error', (e) => {
      connectionErrors.add(1);
      console.error(`SSE-Fehler: ${e.error()}`);
      client.close();
    });
  });

  const ok = check(response, { 'SSE-Verbindung: HTTP 200': (r) => r && r.status === 200 });
  if (ok && openedAt !== null) markConnected(delivery, tracker, window, openedAt);
  flush(delivery, tracker);
}
