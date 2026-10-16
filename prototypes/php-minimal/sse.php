<?php
// Minimaler SSE-Endpunkt: reines PHP, kein Framework.
// Läuft unter PHP-FPM — ein Worker pro offener Verbindung (DECISIONS.md 5.5).
// Eine Redis-Subscription pro Prozess (DECISIONS.md 5.4), da hier "Prozess"
// gleich "eine Client-Verbindung" ist (FPM-Modell), ist das auch die einzige
// im Rahmen dieser einen Verbindung nötige Subscription.

header('Content-Type: text/event-stream');
header('Cache-Control: no-cache');
header('Connection: keep-alive');

$channel = getenv('EVENT_CHANNEL') ?: 'scan-events';

$redis = new Redis();
$redis->connect(getenv('REDIS_HOST') ?: 'redis', (int) (getenv('REDIS_PORT') ?: 6379));

$redis->subscribe([$channel], function (Redis $redis, string $channel, string $message) {
    $event = json_decode($message, true);
    $event['sut_ts'] = (int) round(microtime(true) * 1000); // optionaler zweiter Zeitstempel, siehe DECISIONS.md 5.4
    echo "data: " . json_encode($event) . "\n\n";
    if (connection_aborted()) {
        exit;
    }
    // ob_flush() nur, wenn php.ini output_buffering einen Puffer angelegt hat
    // (Default hängt von der php.ini ab) — ohne die Prüfung wirft ob_flush()
    // sonst eine Notice, wenn kein aktiver Puffer existiert.
    if (ob_get_level() > 0) {
        ob_flush();
    }
    flush();
});
