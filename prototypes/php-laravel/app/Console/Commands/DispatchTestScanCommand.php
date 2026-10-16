<?php

namespace App\Console\Commands;

use App\Jobs\ProcessScanEvent;
use Illuminate\Console\Command;

class DispatchTestScanCommand extends Command
{
    protected $signature = 'scan:dispatch-test';

    protected $description = 'Legt einen Test-Job in die Queue scan-events (zum Ausprobieren des Workers)';

    public function handle(): void
    {
        ProcessScanEvent::dispatch(['seq' => 1, 'ts' => (int) round(microtime(true) * 1000)])
            ->onQueue('scan-events');
        $this->info('scan-events: 1 Test-Job hinzugefügt');
    }
}
