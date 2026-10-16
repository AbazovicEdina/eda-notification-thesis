// WebSocket-Lasttest für die Zellen mit rohem JSON über WS (node-minimal,
// node-express, php-minimal; natives k6/ws). Gleiches Messprinzip wie beim
// SSE-Test: Messfenster nach der Einschwingzeit, Latenz = Empfang − ts,
// Zustellung und Verbindungsaufbau über k6/lib/delivery.js.
import ws from 'k6/ws';
import { check } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { BASE_URL, holdScenario, measurementWindow } from '../lib/config.js';
import { deliveryMetrics, newTracker, markConnected, track, flush } from '../lib/delivery.js';

const eventLatency = new Trend('ws_event_latency_ms');
const eventsReceived = new Counter('ws_events_received');
const delivery = deliveryMetrics('ws');

export const options = holdScenario();

export default function () {
  const url = `${BASE_URL.replace(/^http/, 'ws')}/ws`;
  const window = measurementWindow();
  const tracker = newTracker();

  const response = ws.connect(url, {}, (socket) => {
    socket.on('open', () => markConnected(delivery, tracker, window));
    socket.on('message', (message) => {
      const now = Date.now();
      if (now < window.start || now >= window.end) return;
      const data = JSON.parse(message);
      eventLatency.add(now - data.ts);
      eventsReceived.add(1);
      track(tracker, data);
    });
    socket.setTimeout(() => socket.close(), Math.max(0, window.end - Date.now()));
  });

  flush(delivery, tracker);
  check(response, { 'WS-Handshake: HTTP 101': (r) => r && r.status === 101 });
}
