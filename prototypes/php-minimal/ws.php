<?php
// Minimal WebSocket endpoint with Ratchet (ReactPHP), without a framework.
// PHP-FPM cannot hold long-lived WS connections (DECISIONS.md 5.5), so
// Ratchet is the counterpart of Reverb in php-laravel for the minimal
// variant. Runs as its own long-running process (no FPM).
//
// One Redis subscription per process (DECISIONS.md 5.4), through the
// asynchronous client clue/redis-react, so that the subscription runs in
// the same event loop as the Ratchet server instead of blocking the process
// (a blocking phpredis subscribe() would freeze the WS server).

require __DIR__ . '/vendor/autoload.php';

use Clue\React\Redis\Factory as RedisFactory;
use Ratchet\ConnectionInterface;
use Ratchet\Http\HttpServer;
use Ratchet\MessageComponentInterface;
use Ratchet\Server\IoServer;
use Ratchet\WebSocket\WsServer;
use React\EventLoop\Loop;
use React\Socket\SocketServer;

class ScanBroadcaster implements MessageComponentInterface
{
    private \SplObjectStorage $clients;

    public function __construct()
    {
        $this->clients = new \SplObjectStorage();
    }

    public function onOpen(ConnectionInterface $conn): void
    {
        $this->clients->attach($conn);
    }

    public function onMessage(ConnectionInterface $from, $msg): void
    {
        // Clients send nothing, delivery is purely server to client.
    }

    public function onClose(ConnectionInterface $conn): void
    {
        $this->clients->detach($conn);
    }

    public function onError(ConnectionInterface $conn, \Exception $e): void
    {
        $conn->close();
    }

    public function broadcast(string $payload): void
    {
        foreach ($this->clients as $client) {
            $client->send($payload);
        }
    }
}

$channel = getenv('EVENT_CHANNEL') ?: 'scan-events';
$redisHost = getenv('REDIS_HOST') ?: 'redis';
$redisPort = getenv('REDIS_PORT') ?: 6379;
$port = (int) (getenv('PORT') ?: 8080);

$broadcaster = new ScanBroadcaster();

// A single shared event loop for the Redis client and the WS server.
// Otherwise Ratchet's IoServer::factory() creates its OWN new loop
// internally (see Ratchet\Server\IoServer::factory()). The Redis client
// would then run on a loop that is never executed, and the subscription
// would never become active (exactly this error occurred during testing,
// PUBSUB CHANNELS stayed empty although subscribe() was called). Hence the
// manual wiring here instead of the shorthand IoServer::factory(...).
$loop = Loop::get();

// createClient() instead of createLazyClient(). LazyClient is meant for
// short-lived, occasional commands and closes the connection automatically
// after an idle time, which is unsuitable for a permanent pub/sub
// subscription. createClient() returns a promise that resolves only once
// the connection is actually established, so subscribe only inside it.
(new RedisFactory($loop))->createClient("redis://{$redisHost}:{$redisPort}")->then(function ($redis) use ($channel, $broadcaster) {
    $redis->subscribe($channel);
    $redis->on('message', function (string $chan, string $message) use ($broadcaster) {
        $event = json_decode($message, true);
        $event['sut_ts'] = (int) round(microtime(true) * 1000); // siehe DECISIONS.md 5.4
        $broadcaster->broadcast(json_encode($event));
    });
});

$socket = new SocketServer("0.0.0.0:{$port}", [], $loop);
$server = new IoServer(new HttpServer(new WsServer($broadcaster)), $socket, $loop);
$server->run();
