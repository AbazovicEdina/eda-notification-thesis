// Optionale Benachrichtigung während des Dauerbetriebs (DECISIONS.md 5.14):
// Ist die Umgebungsvariable NOTIFY_URL gesetzt, wird jede Nachricht als
// HTTP-POST mit reinem Text dorthin geschickt. Das passt z. B. zu einem
// eigenen ntfy-Thema (https://ntfy.sh/<schwer-zu-erratender-name>), dessen
// App Nachrichten aufs Handy bringt. Ohne NOTIFY_URL geschieht nichts.
//
// Gesendet werden nur Kampagnennamen, Zähler und Statusmeldungen — keine
// Messdaten, keine Konfiguration, keine Schlüssel. Ein Fehler beim Senden
// wird gemeldet, unterbricht aber nie die Messung.
//
// HTTP-Header dürfen nur ASCII enthalten; Titel mit Umlauten werden daher
// nach RFC 2047 kodiert (von ntfy unterstützt).
const headerValue = (s) => (/^[\x20-\x7E]*$/.test(s) ? s : `=?UTF-8?B?${Buffer.from(s, 'utf-8').toString('base64')}?=`);

export async function notify(title, message) {
  const url = process.env.NOTIFY_URL;
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
