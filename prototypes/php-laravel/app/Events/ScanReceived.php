<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;

// ShouldBroadcastNow statt ShouldBroadcast: der Versand läuft synchron, ohne
// Queue-Umweg. app/Console/Commands/ScanListenCommand.php ist bereits der
// eine dedizierte Prozess für diesen Pfad (DECISIONS.md 5.4) — ein
// zusätzlicher Queue-Hop würde nur unnötige Latenz zwischen
// Redis-Subscription und WS-Zustellung einführen.
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
