#!/usr/bin/env node
// Test-Orchestrierung für Mehrfachdurchläufe + Auswertung (Prompt Teil 2,
// Aufgabe 4). Convenience-Tool, KEIN Prototyp-Code — läuft bewusst lokal
// mit Node statt in Docker, weil es selbst `docker compose` steuert
// (nginx-Ziel umschalten, k6-Läufe starten). Das ist eine bewusste Ausnahme
// vom "alles in Docker"-Prinzip aus DECISIONS.md Abschnitt 2, das sich auf
// die Prototypen/Messungen selbst bezieht, nicht auf dieses Steuer-Skript.
//
// Aufruf: node run.js campaign.json
//
// campaign.json (siehe campaign.example.json):
//   script         k6-Skript unter k6/scripts/, z.B. "sse-feasibility.js"
//   metric         Name der k6-Trend-Metrik, die ausgewertet wird
//                  (z.B. "sse_event_latency_ms" oder "ws_event_latency_ms")
//   configs        Liste der zu vergleichenden Konfigurationen:
//                  [{ name, host, port }, ...] — host/port sind
//                  SUT_HOST/SUT_PORT für den Front-Proxy (infra/nginx)
//   runsPerConfig  100–1000, siehe DECISIONS.md/README
//   warmupRuns     erste N Durchläufe pro Konfiguration von der Auswertung
//                  ausgeschlossen (JIT/OPcache-Warmup, Connection-Pooling,
//                  OS-Filesystem-Cache — siehe README)
//   vus, holdSeconds  an k6 durchgereicht (K6_VUS, K6_HOLD_SECONDS)
//   pauseMinMs, pauseMaxMs  Pause zwischen Durchläufen, gleichverteilt

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, unlinkSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const RESULTS_DIR = path.join(REPO_ROOT, 'results');

function run(cmd, args, extraEnv = {}) {
  const result = spawnSync(cmd, args, {
    cwd: REPO_ROOT,
    env: { ...process.env, ...extraEnv },
    encoding: 'utf-8',
  });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

function compose(args, extraEnv = {}) {
  return run('docker', ['compose', ...args], extraEnv);
}

// Aufgabe 4, letzter Punkt: vor JEDEM Lauf prüfen, ob k6/x/sse aktiv ist —
// schützt vor genau dem stillen Versionskonflikt aus DECISIONS.md Abschnitt 3
// (z.B. nach einem Image-Rebuild, der den Versions-Pin verliert).
function preflightK6Version() {
  const { status, stdout, stderr } = compose(['--profile', 'load', 'run', '--rm', 'k6', 'version']);
  if (status !== 0 || !stdout.includes('k6/x/sse')) {
    console.error('ABBRUCH: k6-Image hat die erwartete xk6-sse-Extension nicht aktiv.');
    console.error('Siehe DECISIONS.md Abschnitt 3 — vermutlich hat ein Image-Rebuild den');
    console.error('Versions-Pin in k6/Dockerfile verloren (k6 v1.2.1 + xk6-sse v0.1.12).');
    console.error('--- k6 version Ausgabe ---');
    console.error(stdout, stderr);
    process.exit(1);
  }
  return stdout.trim();
}

function switchSut(config) {
  const { status, stderr } = compose(['up', '-d', '--force-recreate', 'nginx'], {
    SUT_HOST: config.host,
    SUT_PORT: String(config.port),
  });
  if (status !== 0) {
    console.error(`ABBRUCH: nginx konnte nicht auf ${config.name} (${config.host}:${config.port}) umgeschaltet werden.`);
    console.error(stderr);
    process.exit(1);
  }
  // Kurz auf Nginx warten, statt eine feste Sleep-Zeit zu raten.
  for (let attempt = 0; attempt < 20; attempt++) {
    const { status: healthStatus } = compose(['exec', '-T', 'nginx', 'wget', '-qO-', '--timeout=1', 'http://127.0.0.1/healthz']);
    if (healthStatus === 0) return;
    sleepSync(200);
  }
  console.error(`ABBRUCH: nginx antwortet nach Umschalten auf ${config.name} nicht auf /healthz.`);
  process.exit(1);
}

function randomPause(minMs, maxMs) {
  return minMs + Math.random() * (maxMs - minMs);
}

function sleepSync(ms) {
  const { Atomics, SharedArrayBuffer, Int32Array } = globalThis;
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function percentile(sortedAsc, p) {
  if (sortedAsc.length === 0) return null;
  const idx = Math.min(sortedAsc.length - 1, Math.ceil((p / 100) * sortedAsc.length) - 1);
  return sortedAsc[Math.max(0, idx)];
}

function stats(values) {
  const sorted = [...values].filter((v) => v != null).sort((a, b) => a - b);
  return {
    n: sorted.length,
    median: percentile(sorted, 50),
    p99: percentile(sorted, 99),
    max: sorted[sorted.length - 1] ?? null,
  };
}

function runOnce({ config, script, metric, vus, holdSeconds, k6VersionInfo, runIndexForConfig }) {
  const tmpName = `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}.json`;
  const { status, stderr } = compose(
    ['--profile', 'load', 'run', '--rm', 'k6', 'run', `--summary-export=/results/${tmpName}`, `scripts/${script}`],
    { K6_TARGET_BASE_URL: 'http://nginx', K6_VUS: String(vus), K6_HOLD_SECONDS: String(holdSeconds) }
  );

  const tmpPath = path.join(RESULTS_DIR, tmpName);
  if (status !== 0 || !existsSync(tmpPath)) {
    console.error(`Warnung: k6-Lauf für ${config.name} (Run ${runIndexForConfig}) fehlgeschlagen, wird übersprungen.`);
    console.error(stderr);
    return null;
  }

  const summary = JSON.parse(readFileSync(tmpPath, 'utf-8'));
  unlinkSync(tmpPath);

  const metricSummary = summary.metrics?.[metric];
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const finalName = `${timestamp}_${config.name}_${script.replace(/\.js$/, '')}_run${String(runIndexForConfig).padStart(4, '0')}.json`;
  const finalPath = path.join(RESULTS_DIR, finalName);

  const enriched = {
    _meta: {
      config: config.name,
      script,
      run_index_for_config: runIndexForConfig,
      k6_version_info: k6VersionInfo,
      recorded_at: new Date().toISOString(),
    },
    summary,
  };
  writeFileSync(finalPath, JSON.stringify(enriched, null, 2));

  return {
    file: finalName,
    avg: metricSummary?.avg ?? null,
    p95: metricSummary?.['p(95)'] ?? null,
    max: metricSummary?.max ?? null,
  };
}

function main() {
  const campaignPath = process.argv[2];
  if (!campaignPath) {
    console.error('Aufruf: node run.js <campaign.json>');
    process.exit(1);
  }
  const campaign = JSON.parse(readFileSync(path.resolve(campaignPath), 'utf-8'));
  const {
    script, metric, configs, runsPerConfig,
    warmupRuns = 5, vus = 50, holdSeconds = 60,
    pauseMinMs = 100, pauseMaxMs = 500,
  } = campaign;

  if (!configs || configs.length < 2) {
    console.error('campaign.json braucht mindestens 2 Konfigurationen (alternierendes A/B-Design).');
    process.exit(1);
  }

  mkdirSync(RESULTS_DIR, { recursive: true });

  console.log(`Preflight: prüfe k6/xk6-sse-Version ...`);
  const k6VersionInfo = preflightK6Version();
  console.log(k6VersionInfo);

  // Alternierendes Design (A, B, A, B, ...) statt blockweise: schützt vor
  // Zeit-Drift-Effekten (z.B. steigende Last auf dem Host über die Zeit,
  // thermisches Throttling), die sonst systematisch nur eine Konfiguration
  // träfen, wenn sie komplett am Stück gemessen würde.
  const perConfigRunCount = configs.map(() => 0);
  const perConfigResults = configs.map(() => []);
  const totalIterations = runsPerConfig * configs.length;
  let currentConfigIdx = -1;

  for (let i = 0; i < totalIterations; i++) {
    const configIdx = i % configs.length;
    const config = configs[configIdx];
    perConfigRunCount[configIdx] += 1;
    const runIndexForConfig = perConfigRunCount[configIdx];

    if (configIdx !== currentConfigIdx) {
      console.log(`--> Umschalten auf ${config.name} (${config.host}:${config.port})`);
      switchSut(config);
      currentConfigIdx = configIdx;
    }

    console.log(`[${i + 1}/${totalIterations}] ${config.name} Run ${runIndexForConfig}/${runsPerConfig}${runIndexForConfig <= warmupRuns ? ' (Warm-up)' : ''}`);
    preflightK6Version(); // vor JEDEM Lauf, siehe Aufgabe 4
    const result = runOnce({ config, script, metric, vus, holdSeconds, k6VersionInfo, runIndexForConfig });
    if (result && runIndexForConfig > warmupRuns) {
      perConfigResults[configIdx].push(result);
    }

    if (i < totalIterations - 1) {
      sleepSync(randomPause(pauseMinMs, pauseMaxMs));
    }
  }

  const aggregate = { script, metric, warmupRuns, runsPerConfig, generated_at: new Date().toISOString(), configs: {} };
  configs.forEach((config, idx) => {
    const results = perConfigResults[idx];
    aggregate.configs[config.name] = {
      runs_used: results.length,
      per_run_avg: stats(results.map((r) => r.avg)),
      per_run_p95: stats(results.map((r) => r.p95)),
      per_run_max: stats(results.map((r) => r.max)),
    };
  });

  const aggregateFile = path.join(
    RESULTS_DIR,
    `${new Date().toISOString().replace(/[:.]/g, '-')}_aggregate_${script.replace(/\.js$/, '')}.json`
  );
  writeFileSync(aggregateFile, JSON.stringify(aggregate, null, 2));
  console.log(`\nFertig. Aggregierte Auswertung: ${aggregateFile}`);
  console.log(JSON.stringify(aggregate, null, 2));
}

main();
