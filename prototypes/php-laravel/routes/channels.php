<?php

// Kanal "scans" (siehe App\Events\ScanReceived) ist öffentlich — keine
// Autorisierung hier nötig. Bewusst ohne privaten Kanal/Auth-Roundtrip,
// damit WS strukturell mit den anderen drei Konfigurationen vergleichbar
// bleibt (kein zusätzlicher Auth-Schritt, der nur PHP/Laravel beträfe).
