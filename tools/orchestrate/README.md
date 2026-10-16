# orchestrate

Steuert Mehrfachdurchläufe von k6-Tests über mehrere Konfigurationen hinweg
und wertet sie aus (Prompt Teil 2, Aufgabe 4). Convenience-Tool, kein
Prototyp — läuft bewusst **lokal mit Node** statt in Docker, weil es selbst
`docker compose` aufruft (nginx-Ziel umschalten, k6-Container starten).
Voraussetzung: Node.js lokal installiert (Ausnahme vom
"alles in Docker"-Prinzip aus DECISIONS.md Abschnitt 2 — das bezieht sich
auf die Prototypen/Messungen, nicht auf dieses Steuer-Skript).

## Verwendung

```bash
cp tools/orchestrate/campaign.example.json tools/orchestrate/campaign.json
# campaign.json anpassen: Konfigurationen, Anzahl Durchläufe, Metrik
node tools/orchestrate/run.js tools/orchestrate/campaign.json
```

Für WebSocket-Tests `script` auf `ws-skeleton.js` (Node-Prototypen) bzw.
`ws-reverb.js` (php-laravel, siehe dortiges README für die nötige
`K6_REVERB_APP_KEY` — bei Bedarf `run.js` um einen zusätzlichen
Env-Parameter je Konfiguration erweitern) und `metric` auf
`ws_event_latency_ms` setzen.

## Was das Skript tut

1. **Preflight vor jedem Lauf**: prüft `k6 version` auf die aktive
   xk6-sse-Extension (DECISIONS.md Abschnitt 3) und bricht mit klarer
   Meldung ab, falls sie fehlt (z. B. nach einem Image-Rebuild ohne den
   Versions-Pin). Die geprüfte Version landet in den Metadaten jedes Laufs.
2. **Alternierendes Design (A, B, A, B, …)** statt blockweise — schützt vor
   Zeit-Drift-Effekten (z. B. steigende Host-Last über die Zeit), die sonst
   systematisch nur eine Konfiguration beträfen.
3. **Warm-up-Ausschluss**: die ersten `warmupRuns` Durchläufe **pro
   Konfiguration** fließen nicht in die Auswertung ein (JIT-/OPcache-Warmup,
   Connection-Pooling, OS-Filesystem-Cache — bei kalten Prozessen bzw.
   Caches sind die ersten Messungen typischerweise langsamer und nicht
   repräsentativ für den eingeschwungenen Zustand).
4. **Zufällige Pause** zwischen den Durchläufen, gleichverteilt zwischen
   `pauseMinMs` und `pauseMaxMs`.
5. **Ergebnis-Dateien** unter `results/` mit Zeitstempel + Konfigurations-
   Kennung + laufender Nummer im Namen — nie überschrieben (siehe
   REVIEW.md Punkt 3.3 aus Session 1, wo genau das einmal passiert ist).
6. **Auswertung**: liest die k6-Summary-JSON jedes nicht-Warm-up-Laufs,
   berechnet für die konfigurierte Metrik pro Konfiguration Median UND
   Tail-Werte (p99, Max) — sowohl über die Pro-Lauf-Durchschnitte als auch
   über die Pro-Lauf-p95/-Max-Werte hinweg. Ergebnis: eine zusätzliche
   `..._aggregate_<script>.json`-Datei.

## Voraussetzung

Alle beteiligten SUT-Container müssen bereits laufen (z. B.
`docker compose --profile node-minimal --profile php-minimal up -d`) —
`run.js` schaltet nur den Front-Proxy (`nginx`) zwischen ihnen um, startet
die SUT-Container selbst nicht.
