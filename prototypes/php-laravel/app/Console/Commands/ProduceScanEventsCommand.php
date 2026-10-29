<?php

namespace App\Console\Commands;

use App\Jobs\ProcessScanEvent;
use Illuminate\Console\Command;

// Creates scan events at a fixed rate as Laravel jobs in the queue
// "scan-events" (queue axis, DECISIONS.md 5.19). Counterpart of the event
// simulator in "queue" mode (BullMQ), which plays the same role for the Node
// side. Laravel jobs have their own format that only Laravel itself can
// create.
//
// Event format as in tools/event-simulator, a Lokato scan plus the
// measurement fields seq (sequence number) and ts (timestamp when queued).
// Timing follows an absolute schedule (start + seq · interval).
class ProduceScanEventsCommand extends Command
{
    protected $signature = 'scan:produce {--rate= : Events pro Sekunde (Standard: RATE_PER_SECOND bzw. 1)}';

    protected $description = 'Reiht Scan-Events mit fester Rate in die Queue scan-events ein (Lasttest)';

    public function handle(): int
    {
        $rate = (float) ($this->option('rate') ?? getenv('RATE_PER_SECOND') ?: 1);
        $intervalNs = (int) (1e9 / $rate);
        $stop = false;
        $this->trap([SIGTERM, SIGINT], function () use (&$stop) {
            $stop = true;
        });

        $this->info("scan:produce: {$rate} Events/s in Queue scan-events");
        $startedAt = hrtime(true);
        $seq = 0;
        while (! $stop) {
            $seq++;
            $ts = (int) round(microtime(true) * 1000);
            ProcessScanEvent::dispatch([
                'event' => 'scan',
                'device' => 'R200_3',
                'uid' => 'E28068940000'.strtoupper(str_pad(dechex($seq), 12, '0', STR_PAD_LEFT)),
                'timestamp' => $ts,
                'seq' => $seq,
                'ts' => $ts,
            ])->onQueue('scan-events');

            $waitNs = $startedAt + $seq * $intervalNs - hrtime(true);
            if ($waitNs > 0) {
                usleep((int) ($waitNs / 1000));
            }
        }

        $elapsed = (hrtime(true) - $startedAt) / 1e9;
        $this->info(sprintf('scan:produce: %d Events in %.1f s (%.2f/s)', $seq, $elapsed, $seq / $elapsed));

        return self::SUCCESS;
    }
}
