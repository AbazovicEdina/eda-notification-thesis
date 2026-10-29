// SSE load test (originally the xk6-sse feasibility check, now the
// measurement script of all SSE cells). N VUs each hold one SSE connection.
// Within the measurement window (after the settle time, k6/lib/config.js)
// the delivery latency is measured per event (receive time minus send
// timestamp `ts`) and delivery is counted (k6/lib/delivery.js). In addition,
// the connection setup time is recorded per connection.
// sse.open() blocks the VU as long as the connection is open. It is closed
// in the event handler as soon as the measurement window ends.
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
  // xk6-sse reports "open" for every response, including an error page from
  // Nginx. It only counts as a connection if the status was 200.
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
