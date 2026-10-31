<?php
// Minimal SSE endpoint in plain PHP, without a framework.
// Runs under PHP-FPM, one worker per open connection (DECISIONS.md 5.5).
// One Redis subscription per process (DECISIONS.md 5.4). Since a "process"
// equals "one client connection" here (FPM model), this is also the only
// subscription needed for this one connection.

header('Content-Type: text/event-stream');
header('Cache-Control: no-cache');
header('Connection: keep-alive');

$channel = getenv('EVENT_CHANNEL') ?: 'scan-events';

// Send an SSE comment right away. This flushes the response headers, so the
// client detects the connection setup before the first event arrives
// (measure connection setup, DECISIONS.md 5.9). Clients ignore comment
// lines.
echo ": connected\n\n";
if (ob_get_level() > 0) {
    ob_flush();
}
flush();

$redis = new Redis();
$redis->connect(getenv('REDIS_HOST') ?: 'redis', (int) (getenv('REDIS_PORT') ?: 6379));

$redis->subscribe([$channel], function (Redis $redis, string $channel, string $message) {
    $event = json_decode($message, true);
    $event['sut_ts'] = (int) round(microtime(true) * 1000); // optional second timestamp, see DECISIONS.md 5.4
    echo "data: " . json_encode($event) . "\n\n";
    if (connection_aborted()) {
        exit;
    }
    // ob_flush() only if php.ini output_buffering has created a buffer (the
    // default depends on the php.ini). Without this check ob_flush() raises a
    // notice when no buffer is active.
    if (ob_get_level() > 0) {
        ob_flush();
    }
    flush();
});
