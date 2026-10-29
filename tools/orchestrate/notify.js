// Optional notification during unattended operation (DECISIONS.md 5.14).
// If NOTIFY_URL is set, each message is sent there as an HTTP POST with
// plain text. This fits a personal ntfy topic (https://ntfy.sh/<topic>),
// for example, whose app delivers the messages to a phone. Without
// NOTIFY_URL nothing happens.
//
// NOTIFY_URL comes from the environment or, if it is not set there, from
// the .env file in the repository root. That way the value also applies to
// cron jobs and systemd services without their own environment variable.
//
// Only campaign names, counters and status messages are sent, never
// measurement data, configuration or keys. A failure to send is reported
// but never interrupts the measurement.
//
// HTTP headers may only contain ASCII, so titles with umlauts are encoded
// according to RFC 2047 (supported by ntfy).

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const headerValue = (s) => (/^[\x20-\x7E]*$/.test(s) ? s : `=?UTF-8?B?${Buffer.from(s, 'utf-8').toString('base64')}?=`);

const ENV_FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '.env');

function notifyUrl() {
  if (process.env.NOTIFY_URL) return process.env.NOTIFY_URL;
  try {
    const line = readFileSync(ENV_FILE, 'utf-8').split(/\r?\n/).find((l) => l.startsWith('NOTIFY_URL='));
    return line ? line.slice('NOTIFY_URL='.length).trim().replace(/^["']|["']$/g, '') || null : null;
  } catch {
    return null;
  }
}

export async function notify(title, message) {
  const url = notifyUrl();
  if (!url) return false;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Title: headerValue(title), 'Content-Type': 'text/plain; charset=utf-8' },
      body: message,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) console.warn(`Benachrichtigung nicht zugestellt: HTTP ${res.status}`);
    return res.ok;
  } catch (err) {
    console.warn(`Benachrichtigung nicht zugestellt: ${err.message}`);
    return false;
  }
}
