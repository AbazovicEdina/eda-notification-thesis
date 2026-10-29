<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;

// ShouldBroadcastNow instead of ShouldBroadcast, so sending happens
// synchronously without a detour through a queue.
// app/Console/Commands/ScanListenCommand.php already is the one dedicated
// process for this path (DECISIONS.md 5.4). An additional queue hop would
// only add needless latency between the Redis subscription and WS delivery.
class ScanReceived implements ShouldBroadcastNow
{
    use InteractsWithSockets;

    public function __construct(public array $payload)
    {
    }

    public function broadcastOn(): array
    {
        return [new Channel('scans')];
    }

    public function broadcastAs(): string
    {
        return 'scan';
    }

    public function broadcastWith(): array
    {
        return $this->payload;
    }
}
