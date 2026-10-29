// WebSocket load test specifically for Laravel Reverb (cell php-laravel/WS).
//
// Reverb speaks the Pusher Channels protocol, not raw JSON like the other
// WS cells (k6/scripts/ws-skeleton.js). This is a difference of library
// choice, not a test artifact, and is to be discussed in the thesis. Reverb
// clients receive pusher:connection_established after the handshake and
// have to subscribe to the channel before broadcasts arrive. Reverb is
// reached through the same front Nginx as all other cells (location /app/
// in infra/nginx). Measurement window, delivery and connection setup as in
// the other scripts (k6/lib/config.js, k6/lib/delivery.js). The completed
// WebSocket handshake counts as connection setup.
import ws from 'k6/ws';
import { check } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { BASE_URL, holdScenario, measurementWindow, staggerStart } from '../lib/config.js';
import { deliveryMetrics, newTracker, markConnected, track, flush } from '../lib/delivery.js';

const eventLatency = new Trend('ws_event_latency_ms');
const eventsReceived = new Counter('ws_events_received');
const delivery = deliveryMetrics('ws');

const REVERB_APP_KEY = __ENV.K6_REVERB_APP_KEY;
const CHANNEL = __ENV.REVERB_CHANNEL || 'scans';

export const options = holdScenario();

export default function () {
  staggerStart();
  const url = `${BASE_URL.replace(/^http/, 'ws')}/app/${REVERB_APP_KEY}?protocol=7&client=k6&version=1.0`;
  const window = measurementWindow();
  const tracker = newTracker();

  const response = ws.connect(url, {}, (socket) => {
    socket.on('open', () => markConnected(delivery, tracker, window));
    socket.on('message', (raw) => {
      const message = JSON.parse(raw);

      if (message.event === 'pusher:connection_established') {
        socket.send(JSON.stringify({ event: 'pusher:subscribe', data: { channel: CHANNEL } }));
        return;
      }

      if (message.event === 'scan') {
        const now = Date.now();
        if (now < window.start || now >= window.end) return;
        const data = JSON.parse(message.data); // Pusher envelope, "data" is a JSON string
        eventLatency.add(now - data.ts);
        eventsReceived.add(1);
        track(tracker, data);
      }
    });

    socket.setTimeout(() => socket.close(), Math.max(0, window.end - Date.now()));
  });

  flush(delivery, tracker);
  check(response, { 'WS-Handshake: HTTP 101': (r) => r && r.status === 101 });
}
