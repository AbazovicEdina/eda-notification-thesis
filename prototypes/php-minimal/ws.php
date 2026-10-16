<?php
// Minimaler WebSocket-Endpunkt: Ratchet (ReactPHP), kein Framework.
// PHP-FPM kann keine dauerhaften WS-Verbindungen halten (DECISIONS.md 5.5)
// — Ratchet ist hier das Gegenstück zu Reverb in php-laravel, für die
// Minimalvariante. Läuft als eigener, dauerhafter Prozess (kein FPM).
//
// Eine Redis-Subscription pro Prozess (DECISIONS.md 5.4): über den
// asynchronen Client clue/redis-react, damit das Abonnement im selben
// Event-Loop wie der Ratchet-Server läuft, statt den Prozess zu blockieren
// (ein blockierendes phpredis-subscribe() würde den WS-Server einfrieren).

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
        // Clients senden nichts — reine Server-zu-Client-Zustellung.
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

// Eine einzige, geteilte Event-Loop für Redis-Client und WS-Server: Ratchets
// IoServer::factory() legt sonst intern eine EIGENE, neue Loop an (siehe
// Ratchet\Server\IoServer::factory()) — der Redis-Client liefe dann auf
// einer Loop, die nie tatsächlich ausgeführt wird, und das Abonnement
// würde nie aktiv (genau dieser Fehler trat beim Testen auf: PUBSUB
// CHANNELS blieb leer, obwohl subscribe() aufgerufen wurde). Deshalb hier
// manuell verdrahtet statt der Kurzform IoServer::factory(...).
$loop = Loop::get();

// createClient() statt createLazyClient(): LazyClient ist für kurzlebige,
// gelegentliche Befehle gedacht und schließt die Verbindung nach einer
// Idle-Zeit automatisch wieder — ungeeignet für ein dauerhaftes Pub/Sub-
// Abonnement. createClient() liefert eine Promise, die erst nach
// tatsächlichem Verbindungsaufbau aufgelöst wird; erst darin abonnieren.
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
