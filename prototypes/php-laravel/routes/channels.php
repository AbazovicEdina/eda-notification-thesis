<?php

// The channel "scans" (see App\Events\ScanReceived) is public, so no
// authorization is needed here. Deliberately without a private channel or
// auth round trip, so that WS stays structurally comparable with the other
// three configurations (no extra auth step that would affect only PHP/Laravel).
