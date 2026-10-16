// WebSocket-Lasttest für die Zellen mit rohem JSON über WS (node-minimal,
// node-express, php-minimal; natives k6/ws). Gleiches Messprinzip wie beim
// SSE-Test: Event-Payload {"seq":n,"ts":<ms-epoch>}, Latenz = Empfang − ts,
// Zustellung über k6/lib/delivery.js.
import ws from 'k6/ws';
import { check } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { BASE_URL, HOLD_SECONDS, holdScenario } from '../lib/config.js';
import { deliveryMetrics, newTracker, track, flush } from '../lib/delivery.js';

const eventLatency = new Trend('ws_event_latency_ms');
const eventsReceived = new Counter('ws_events_received');
const delivery = deliveryMetrics('ws');

export const options = holdScenario();

export default function () {
  const url = `${BASE_URL.replace(/^http/, 'ws')}/ws`;
  const tracker = newTracker();

  const response = ws.connect(url, {}, (socket) => {
    socket.on('message', (message) => {
      const data = JSON.parse(message);
      eventLatency.add(Date.now() - data.ts);
      eventsReceived.add(1);
      track(tracker, data);
    });
    socket.setTimeout(() => socket.close(), HOLD_SECONDS * 1000);
  });

  flush(delivery, tracker);
  check(response, { 'WS-Handshake: HTTP 101': (r) => r && r.status === 101 });
}
