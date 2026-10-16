// Optionale Benachrichtigung während des Dauerbetriebs (DECISIONS.md 5.14):
// Ist NOTIFY_URL gesetzt, wird jede Nachricht als HTTP-POST mit reinem Text
// dorthin geschickt. Das passt z. B. zu einem eigenen ntfy-Thema
// (https://ntfy.sh/<thema>), dessen App Nachrichten aufs Handy bringt. Ohne
// NOTIFY_URL geschieht nichts.
//
// NOTIFY_URL stammt aus der Umgebung oder, falls dort nicht gesetzt, aus der
// .env im Repository-Wurzelverzeichnis. So gilt der Wert auch für cron-Jobs
// und systemd-Dienste ohne eigene Umgebungsvariable.
//
// Gesendet werden nur Kampagnennamen, Zähler und Statusmeldungen — keine
// Messdaten, keine Konfiguration, keine Schlüssel. Ein Fehler beim Senden
// wird gemeldet, unterbricht aber nie die Messung.
//
// HTTP-Header dürfen nur ASCII enthalten; Titel mit Umlauten werden daher
// nach RFC 2047 kodiert (von ntfy unterstützt).

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
