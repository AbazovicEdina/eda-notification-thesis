// WebSocket load test for the cells with raw JSON over WS (node-minimal,
// node-express, php-minimal, native k6/ws). Same measurement principle as
// the SSE test, measurement window after the settle time, latency =
// receive − ts, delivery and connection setup via k6/lib/delivery.js.
import ws from 'k6/ws';
import { check } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { BASE_URL, holdScenario, measurementWindow, staggerStart } from '../lib/config.js';
import { deliveryMetrics, newTracker, markConnected, track, flush } from '../lib/delivery.js';

const eventLatency = new Trend('ws_event_latency_ms');
const eventsReceived = new Counter('ws_events_received');
const delivery = deliveryMetrics('ws');

export const options = holdScenario();

export default function () {
  staggerStart();
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
