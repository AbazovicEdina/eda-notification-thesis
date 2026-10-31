#!/usr/bin/env node
// Orchestration of the measurement campaigns (DECISIONS.md 5.6–5.9, 5.16–5.19).
//
// A campaign measures cells from cells.json over one or more load levels,
// with two or more configurations in the alternating design A, B, A, B.
// Each run produces a complete JSON file (k6 result, delivery, connection
// setup, resources of cell, Redis and load generator, context), plus a
// running campaign log (JSON Lines) and, at the end, a campaign evaluation
// (aggregate.json). The Holm correction across all campaigns is done
// separately in evaluate.js.
//
// Usage: node tools/orchestrate/run.js <campaign.json>
// Campaign format and phases are described in README.md in this folder.
//
// The script runs directly with Node on the controlling machine (not in
// Docker), because it calls `docker compose` itself. For the SUT side it
// does so locally or, in the two-machine setup, via ssh on the Raspberry Pi
// (DECISIONS.md 5.14). For k6 and the event sources it always runs locally.

import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, comparePaired } from './stats.js';
import { pairByRunIndex } from './pairing.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const RESULTS_DIR = path.join(REPO_ROOT, 'results');
const SUMMARY_TREND_STATS = 'avg,min,med,max,p(90),p(95),p(99)';

// Event sources per cell (cells.json "producer") -> Compose service.
const PRODUCER_SERVICES = {
  pubsub: 'event-simulator',
  bullmq: 'event-simulator-bullmq',
  laravel: 'laravel-producer',
};
// Services without a cell that may run during every campaign. All other
// running services are stopped before the campaign starts
// (DECISIONS.md 5.6.3).
const INFRA_SERVICES = new Set(['redis', 'nginx', 'resource-sampler', ...Object.values(PRODUCER_SERVICES)]);

// Phases (DECISIONS.md 5.9). pilot and main allow statistical evaluation
// (main with block 1 = confirmatory, block 2 = replication). control,
// scaling, saturation and storm are descriptive. storm measures all clients
// connecting at the same moment (DECISIONS.md 5.10).
const PHASES = new Set(['pilot', 'main', 'control', 'scaling', 'saturation', 'storm']);
// Phases in which failed runs are a measurement result and not a reason to
// abort (overload, storm).
const DESCRIPTIVE_PHASES = new Set(['scaling', 'saturation', 'storm']);
const COMPARING_PHASES = new Set(['pilot', 'main']);
// In these phases all clients must be connected by the end of the settle
// time and all cells must run in production mode.
const STRICT_PHASES = new Set(['pilot', 'main', 'control']);

// Measures with a statistical comparison per campaign (families in plan.json).
const TESTED_MEASURES = ['latency_mean_ms', 'cpu_seconds_total', 'working_set_peak_bytes_total', 'connect_mean_ms'];
// Measures for which descriptive statistics are computed per configuration.
const DESCRIBED_MEASURES = [
  'latency_mean_ms', 'latency_median_ms', 'latency_p95_ms', 'latency_p99_ms', 'latency_max_ms',
  'connect_mean_ms', 'connect_p95_ms', 'connected_ratio', 'served_ratio',
  'delivery_ratio', 'events_lost', 'delivered_events_per_s', 'source_rate_eps',
  'cpu_seconds', 'cpu_seconds_redis', 'cpu_seconds_total', 'cpu_seconds_nginx', 'cpu_cores_avg',
  'working_set_peak_bytes', 'working_set_peak_bytes_redis', 'working_set_peak_bytes_total', 'working_set_avg_bytes', 'mem_peak_kernel_bytes',
  'data_received_bytes_per_s', 'connection_errors', 'loadgen_cpu_util_avg', 'loadgen_cpu_util_max',
];
// Mean load of the load generator above which a run in the two-machine
// setup counts as limited by the load tool (DECISIONS.md 5.14).
const LOADGEN_UTIL_LIMIT = 0.8;

class CampaignError extends Error {}

// ---------------------------------------------------------------------------
// Processes
// ---------------------------------------------------------------------------

function exec(cmd, args, { env = {}, timeoutMs = 0 } = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd: REPO_ROOT, env: { ...process.env, ...env }, windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    const timer = timeoutMs ? setTimeout(() => child.kill(), timeoutMs) : null;
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ status: -1, stdout, stderr: `${stderr}${err}` });
    });
    child.on('close', (status) => {
      clearTimeout(timer);
      resolve({ status, stdout, stderr });
    });
    child.stdin.end();
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const shQuote = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;

// SUT side (Redis, front Nginx, cells, sampler) locally or via ssh.
// Load side (k6, event sources, sampler for the load) always locally.
function createSides(sut = {}) {
  const remote = Boolean(sut.ssh);
  if (remote && !sut.repoDir) throw new CampaignError('sut.ssh gesetzt, aber sut.repoDir fehlt');
  const sshArgs = (remoteCmd) => ['-T', '-o', 'BatchMode=yes', sut.ssh, remoteCmd];

  function invocation(args, env = {}) {
    if (!remote) return { cmd: 'docker', args, env };
    const envPart = Object.entries(env).map(([k, v]) => `${k}=${shQuote(v)}`).join(' ');
    const cd = args[0] === 'compose' ? `cd ${shQuote(sut.repoDir)} && ` : '';
    const remoteCmd = `${cd}${envPart ? `env ${envPart} ` : ''}docker ${args.map(shQuote).join(' ')}`;
    return { cmd: 'ssh', args: sshArgs(remoteCmd), env: {} };
  }

  return {
    remote,
    sutCompose(args, env = {}, opts = {}) {
      const inv = invocation(['compose', ...args], env);
      return exec(inv.cmd, inv.args, { ...opts, env: inv.env });
    },
    sutDocker(args) {
      const inv = invocation(args);
      return exec(inv.cmd, inv.args, { env: inv.env });
    },
    sutSpawnCompose(args) {
      const inv = invocation(['compose', ...args]);
      return spawn(inv.cmd, inv.args, { cwd: REPO_ROOT, env: { ...process.env, ...inv.env }, windowsHide: true });
    },
    loadSpawnCompose(args) {
      return spawn('docker', ['compose', ...args], { cwd: REPO_ROOT, env: process.env, windowsHide: true });
    },
    async sutGit() {
      if (!remote) return gitState();
      const r = await exec('ssh', sshArgs(`cd ${shQuote(sut.repoDir)} && git rev-parse HEAD && git status --porcelain`));
      if (r.status !== 0) throw new CampaignError(`Git-Stand auf der SUT-Seite nicht lesbar: ${r.stderr.trim()}`);
      const [head, ...dirty] = r.stdout.split(/\r?\n/).filter(Boolean);
      return { commit: head.trim(), dirty_files: dirty.length };
    },
    // Throttling status via vcgencmd on the host of the SUT side. The sampler in
    // the container reads it from sysfs, but the file is missing on the Pi 5.
    // null locally (single machine, no Pi).
    async sutThrottled() {
      if (!remote) return null;
      const r = await exec('ssh', sshArgs('vcgencmd get_throttled'), { timeoutMs: 15000 });
      const m = r.status === 0 ? r.stdout.match(/throttled=(0x[0-9a-f]+)/i) : null;
      return m ? m[1] : null;
    },
    loadCompose(args, env = {}, opts = {}) {
      return exec('docker', ['compose', ...args], { ...opts, env });
    },
  };
}

async function gitState() {
  const head = await exec('git', ['rev-parse', 'HEAD']);
  const status = await exec('git', ['status', '--porcelain']);
  return { commit: head.stdout.trim() || null, dirty_files: status.stdout.split(/\r?\n/).filter(Boolean).length };
}

// ---------------------------------------------------------------------------
// Load the campaign
// ---------------------------------------------------------------------------

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf-8'));
}

function readEnvFileValue(file, key) {
  const full = path.resolve(REPO_ROOT, file);
  if (!existsSync(full)) return null;
  const m = readFileSync(full, 'utf-8').match(new RegExp(`^${key}=(.*)$`, 'm'));
  return m ? m[1].trim().replace(/^"(.*)"$/, '$1') : null;
}

// Configuration = cell from cells.json, optionally with its own name and its
// own script/metric/env (DECISIONS.md 5.9). Precedence is configuration >
// campaign > cell default.
function resolveConfigs(campaign, cells) {
  return (campaign.configs ?? []).map((entry) => {
    const spec = typeof entry === 'string' ? { cell: entry } : entry;
    const cell = cells[spec.cell];
    if (!cell) throw new CampaignError(`Unbekannte Zelle "${spec.cell}" (siehe cells.json)`);
    const env = { ...(cell.env ?? {}), ...(spec.env ?? {}) };
    const envFromFile = { ...(cell.envFromFile ?? {}), ...(spec.envFromFile ?? {}) };
    for (const [key, src] of Object.entries(envFromFile)) {
      const value = process.env[key] ?? readEnvFileValue(src.file, src.key);
      if (!value) throw new CampaignError(`${key} fehlt: weder als Umgebungsvariable gesetzt noch ${src.key} in ${src.file}`);
      env[key] = value;
    }
    if (!PRODUCER_SERVICES[cell.producer]) throw new CampaignError(`Zelle ${spec.cell}: unbekannte Ereignisquelle "${cell.producer}"`);
    return {
      name: spec.name ?? spec.cell,
      cell: spec.cell,
      language: cell.language,
      variant: cell.variant,
      transport: cell.transport,
      queue: cell.queue,
      services: cell.services,
      front: cell.front,
      producer: cell.producer,
      script: spec.script ?? campaign.script ?? cell.script,
      metric: spec.metric ?? campaign.metric ?? cell.metric,
      metricPrefix: spec.metricPrefix ?? cell.metricPrefix,
      env,
    };
  });
}

function resolveScenarios(campaign) {
  const list = campaign.scenarios ?? [{
    name: campaign.scenarioName ?? 'default',
    vus: campaign.vus,
    holdSeconds: campaign.holdSeconds,
    runsPerConfig: campaign.runsPerConfig,
  }];
  return list.map((s) => {
    for (const key of ['name', 'vus', 'holdSeconds', 'runsPerConfig']) {
      if (s[key] == null) throw new CampaignError(`Laststufe ohne "${key}": ${JSON.stringify(s)}`);
    }
    return { ...s, eventRatePerSecond: s.eventRatePerSecond ?? campaign.eventRatePerSecond ?? 1 };
  });
}

function resolveSettings(campaign) {
  const phase = campaign.phase ?? 'main';
  if (!PHASES.has(phase)) throw new CampaignError(`phase muss eine von ${[...PHASES].join(', ')} sein, nicht "${phase}"`);
  // In descriptive phases beyond capacity, failed runs are measurement results
  // and not a reason to abort (DECISIONS.md 5.9).
  const descriptiveOverload = DESCRIPTIVE_PHASES.has(phase);
  // Spread connects (DECISIONS.md 5.10, option 5). 0 means that all clients
  // connect at the same moment (5.9). The spread must be complete before the
  // end of the settle time.
  const connectSpreadSeconds = campaign.connectSpreadSeconds ?? 0;
  if (!(connectSpreadSeconds >= 0 && connectSpreadSeconds < (campaign.settleSeconds ?? 10))) {
    throw new CampaignError(`connectSpreadSeconds muss mindestens 0 und kleiner als settleSeconds sein, nicht ${connectSpreadSeconds}`);
  }
  if (phase === 'storm' && connectSpreadSeconds !== 0) {
    throw new CampaignError('Phase storm misst den gleichzeitigen Verbindungsaufbau, connectSpreadSeconds muss 0 sein');
  }
  // In the storm the cell restarts before every run (runOnce), so a warm-up
  // would be discarded right away.
  const warmupRuns = campaign.warmupRuns ?? (phase === 'storm' ? 0 : 5);
  if (phase === 'storm' && warmupRuns !== 0) {
    throw new CampaignError('Phase storm startet die Zelle vor jedem Lauf neu, warmupRuns muss 0 sein');
  }
  return {
    name: campaign.name ?? 'kampagne',
    phase,
    block: campaign.block ?? (phase === 'main' ? 1 : null),
    warmupRuns,
    settleSeconds: campaign.settleSeconds ?? 10,
    connectSpreadSeconds,
    // Priming pass before the warm-up (DECISIONS.md 5.9) with as many clients as
    // a static FPM pool has workers (pm.max_children in
    // prototypes/*/fpm-pool.conf), so that every worker has served once.
    // 0 disables the priming pass. It is skipped in the storm.
    primeClients: phase === 'storm' ? 0 : (campaign.primeClients ?? 550),
    primeHoldSeconds: campaign.primeHoldSeconds ?? 5,
    // Wait time after restarting the cell in the storm, so that the start is
    // complete (e.g. all 550 FPM workers forked).
    restartSettleMs: campaign.restartSettleMs ?? 5000,
    pauseMinMs: campaign.pauseMinMs ?? 100,
    pauseMaxMs: campaign.pauseMaxMs ?? 500,
    reportEvery: campaign.reportEvery ?? 0,
    maxFailureRate: campaign.maxFailureRate ?? (descriptiveOverload ? 1 : 0.05),
    minPairs: campaign.minPairs ?? 20,
    requireProduction: campaign.requireProduction ?? STRICT_PHASES.has(phase),
    requireAllConnected: campaign.requireAllConnected ?? STRICT_PHASES.has(phase),
    bootstrapSeed: campaign.bootstrap?.seed ?? 20261016,
    bootstrapResamples: campaign.bootstrap?.resamples ?? 10000,
    resourceIntervalMs: campaign.resourceSampleIntervalMs ?? 250,
    producerSettleMs: campaign.producerSettleMs ?? 3000,
    saturation: {
      minDeliveryRatio: campaign.saturation?.minDeliveryRatio ?? 0.99,
      maxP95LatencyMs: campaign.saturation?.maxP95LatencyMs ?? 1000,
    },
    scaling: {
      minServedRatio: campaign.scaling?.minServedRatio ?? 0.99,
    },
    sut: {
      ssh: campaign.sut?.ssh ?? null,
      repoDir: campaign.sut?.repoDir ?? null,
      pi: campaign.sut?.pi ?? false,
      // without a trailing slash, otherwise the scripts request "//sse"
      targetBaseUrl: (campaign.sut?.targetBaseUrl ?? 'http://nginx').replace(/\/+$/, ''),
      redisHost: campaign.sut?.redisHost ?? null,
    },
  };
}

// ---------------------------------------------------------------------------
// Preflight checks and context
// ---------------------------------------------------------------------------

async function k6Version(sides) {
  const r = await sides.loadCompose(['--profile', 'load', 'run', '--rm', '--no-deps', 'k6', 'version']);
  if (r.status !== 0 || !r.stdout.includes('k6/x/sse')) {
    throw new CampaignError(
      'k6-Image ohne aktive xk6-sse-Extension (DECISIONS.md Abschnitt 3: Versions-Pin in k6/Dockerfile prüfen).\n'
      + `${r.stdout}${r.stderr}`
    );
  }
  return r.stdout.trim();
}

async function samplerInfo(sides) {
  const r = await sides.sutCompose(['--profile', 'tools', 'exec', '-T', 'resource-sampler', 'node', 'sampler.js', 'info']);
  if (r.status !== 0) throw new CampaignError(`resource-sampler info fehlgeschlagen: ${r.stderr.trim() || r.stdout.trim()}`);
  const info = JSON.parse(r.stdout.trim().split(/\r?\n/).pop());
  if (info.throttled == null) {
    info.throttled = await sides.sutThrottled();
    if (info.throttled != null) info.throttled_source = 'vcgencmd';
  }
  return info;
}

function throttleBits(value) {
  if (value == null) return null;
  const n = Number.parseInt(String(value), 16);
  return Number.isNaN(n) ? null : n;
}

// Raspberry Pi firmware: bits 0–3 = currently under-voltage / frequency
// capped / throttled / soft temperature limit, bits 16–19 = the same "since
// boot". A run counts as throttled if current throttling is present at the
// start or at the end, or if a "since boot" bit was newly set during the
// run.
function throttledDuring(start, end) {
  const s = throttleBits(start);
  const e = throttleBits(end);
  if (s == null || e == null) return false;
  return ((s | e) & 0xF) !== 0 || ((e & ~s) & 0xF0000) !== 0;
}

function checkHost(info, settings, log) {
  const problems = [];
  const warnings = [];
  if (!info.cgroup_v2) problems.push('cgroup v2 nicht verfügbar — Ressourcenmessung und Limits nicht möglich');
  if (!info.memory_controller) problems.push('memory-cgroup-Controller fehlt — Speicherlimits wären wirkungslos (infra/pi/README.md, Boot-Parameter)');
  const bits = throttleBits(info.throttled);
  const target = settings.sut.pi ? problems : warnings;
  if (settings.sut.pi && bits == null) problems.push('Drosselstatus nicht lesbar (vcgencmd get_throttled auf dem Pi)');
  if (info.cpu_governor != null && info.cpu_governor !== 'performance') target.push(`CPU-Governor "${info.cpu_governor}" statt "performance"`);
  if (info.swap_total_bytes) target.push(`Swap aktiv (${info.swap_total_bytes} Bytes) — verzerrt Speicher- und Latenzmessung`);
  if (bits != null && (bits & 0xF) !== 0) target.push(`Host aktuell gedrosselt (get_throttled=${info.throttled})`);
  for (const w of warnings) {
    console.warn(`Hinweis: ${w}`);
    log('preflight_warning', { message: w });
  }
  if (problems.length) throw new CampaignError(`Vorabprüfung fehlgeschlagen:\n- ${problems.join('\n- ')}`);
}

function parseComposePs(stdout) {
  const text = stdout.trim();
  if (!text) return [];
  if (text.startsWith('[')) return JSON.parse(text);
  return text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

async function containerIds(sides, services) {
  const r = await sides.sutCompose(['ps', '--format', 'json', ...services]);
  const ids = {};
  for (const row of parseComposePs(r.stdout)) {
    if (row.State === 'running') ids[row.Service] = row.ID;
  }
  return ids;
}

async function inspectContainers(sides, ids) {
  if (ids.length === 0) return [];
  const r = await sides.sutDocker(['inspect', '--format', '{{json .}}', ...ids]);
  return r.stdout.split(/\r?\n/).filter(Boolean).map((line) => {
    const c = JSON.parse(line);
    const env = Object.fromEntries((c.Config?.Env ?? []).map((e) => {
      const i = e.indexOf('=');
      return [e.slice(0, i), e.slice(i + 1)];
    }));
    // Limits actually in effect for the running container (not the Compose
    // file), so that the log documents what the measurement ran with.
    return {
      id: c.Id,
      name: c.Name?.replace(/^\//, ''),
      service: c.Config?.Labels?.['com.docker.compose.service'],
      image: c.Config?.Image,
      image_id: c.Image,
      status: c.State?.Status,
      oom_killed: c.State?.OOMKilled ?? false,
      started_at: c.State?.StartedAt,
      runtime_env: { APP_ENV: env.APP_ENV ?? null, APP_DEBUG: env.APP_DEBUG ?? null, NODE_ENV: env.NODE_ENV ?? null },
      limits: {
        cpus: c.HostConfig?.NanoCpus ? c.HostConfig.NanoCpus / 1e9 : null,
        memory_bytes: c.HostConfig?.Memory || null,
        memory_swap_bytes: c.HostConfig?.MemorySwap || null,
        cgroup_parent: c.HostConfig?.CgroupParent || null,
        nofile: c.HostConfig?.Ulimits?.find((u) => u.Name === 'nofile')?.Soft ?? null,
      },
    };
  });
}

// Operating mode per container (DECISIONS.md 5.5). Node.js via NODE_ENV,
// Laravel via APP_ENV/APP_DEBUG, PHP in general via the loaded php.ini
// (php.ini-production turns display_errors off).
async function productionMode(sides, container) {
  const reasons = [];
  const isPhp = /php/.test(container.image ?? '');
  const isNode = /node/.test(container.image ?? '') || container.runtime_env.NODE_ENV != null;
  if (isNode && !isPhp && container.runtime_env.NODE_ENV !== 'production') reasons.push(`NODE_ENV=${container.runtime_env.NODE_ENV}`);
  if (container.runtime_env.APP_ENV != null && container.runtime_env.APP_ENV !== 'production') reasons.push(`APP_ENV=${container.runtime_env.APP_ENV}`);
  if (container.runtime_env.APP_DEBUG != null && !['false', '0', ''].includes(String(container.runtime_env.APP_DEBUG).toLowerCase())) {
    reasons.push(`APP_DEBUG=${container.runtime_env.APP_DEBUG}`);
  }
  let phpIni = null;
  if (isPhp) {
    const r = await sides.sutDocker(['exec', container.id, 'php', '-r', 'echo php_ini_loaded_file() ?: "keine", "|", ini_get("display_errors") ?: "0";']);
    const [file, displayErrors] = r.stdout.trim().split('|');
    // OPcache as PHP-FPM sees it. The CLI uses opcache.enable_cli instead,
    // so the value is read from the FPM SAPI (php-fpm -i). Only recorded.
    const o = await sides.sutDocker(['exec', container.id, 'sh', '-c', 'php-fpm -i 2>/dev/null | grep -m1 "^opcache.enable =>" || true']);
    const opcache = o.stdout.match(/opcache\.enable => (\w+)/);
    phpIni = { file, display_errors: displayErrors, opcache_enable_fpm: opcache ? opcache[1] : null };
    if (file === 'keine' || !['0', '', 'Off', 'off'].includes(displayErrors)) reasons.push(`php.ini=${file}, display_errors=${displayErrors}`);
  }
  return { production: reasons.length === 0, reasons, php_ini: phpIni };
}

// ---------------------------------------------------------------------------
// Container life cycle
// ---------------------------------------------------------------------------

async function prepareSut(sides, configs, log) {
  const campaignServices = [...new Set(configs.flatMap((c) => c.services))];

  const running = await sides.sutCompose(['ps', '--services', '--status', 'running']);
  const foreign = running.stdout.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
    .filter((s) => !INFRA_SERVICES.has(s) && !campaignServices.includes(s));
  if (foreign.length) {
    console.log(`Stoppe Dienste außerhalb der Kampagne: ${foreign.join(', ')}`);
    const r = await sides.sutCompose(['stop', ...foreign]);
    if (r.status !== 0) throw new CampaignError(`Stoppen fehlgeschlagen: ${r.stderr.trim()}`);
    log('services_stopped', { services: foreign });
  }

  const steps = [
    ['up', '-d', 'redis'],
    ['--profile', 'tools', 'up', '-d', 'resource-sampler'],
    ['up', '-d', ...campaignServices],
  ];
  for (const args of steps) {
    const r = await sides.sutCompose(args, {}, { timeoutMs: 600000 });
    if (r.status !== 0) throw new CampaignError(`docker compose ${args.join(' ')} fehlgeschlagen:\n${r.stderr.trim()}`);
  }
  await switchFront(sides, configs[0]);
  if (sides.remote) {
    // The load of the load generator (DECISIONS.md 5.14) is measured by a
    // sampler on the load side.
    const r = await sides.loadCompose(['--profile', 'tools', 'up', '-d', '--no-deps', 'resource-sampler']);
    if (r.status !== 0) throw new CampaignError(`resource-sampler auf dem Lastgenerator ließ sich nicht starten:\n${r.stderr.trim()}`);
  }
  log('services_started', { services: campaignServices });
  return campaignServices;
}

function frontEnv(config) {
  const f = config.front;
  const env = { SUT_MODE: f.mode, SUT_HOST: f.host, SUT_PORT: String(f.port) };
  if (f.mode === 'fastcgi') {
    env.SUT_FASTCGI_SCRIPT = f.script;
    env.SUT_FASTCGI_SCRIPT_NAME = f.scriptName;
    env.SUT_FASTCGI_ROOT = f.root;
  }
  return env;
}

async function switchFront(sides, config) {
  const r = await sides.sutCompose(['up', '-d', '--force-recreate', '--no-deps', 'nginx'], frontEnv(config));
  if (r.status !== 0) throw new CampaignError(`Front-Nginx ließ sich nicht auf ${config.name} umschalten:\n${r.stderr.trim()}`);
  // Reachability. Any HTTP response of the cell counts (WS servers answer a
  // plain GET request with 4xx, for example). Only 502/503/504 mean that Nginx
  // cannot reach the cell.
  for (let attempt = 0; attempt < 60; attempt++) {
    const h = await sides.sutCompose(['exec', '-T', 'nginx', 'sh', '-c', 'wget -S -O /dev/null -T 2 http://127.0.0.1/healthz 2>&1 || true']);
    const m = h.stdout.match(/HTTP\/1\.[01] (\d{3})/);
    if (m && !['502', '503', '504'].includes(m[1])) return;
    await sleep(250);
  }
  throw new CampaignError(`Front-Nginx erreicht ${config.name} (${config.front.mode} ${config.front.host}:${config.front.port}) nicht`);
}

// Storm (DECISIONS.md 5.10). Before every run the cell restarts with fresh
// containers, as after a server restart. All runs therefore start from the
// same state, and a crash in the previous run does not end the campaign but
// is that run's result.
async function restartCell(sides, settings, config, log, runId) {
  const r = await sides.sutCompose(['up', '-d', '--force-recreate', '--no-deps', ...config.services], {}, { timeoutMs: 600000 });
  if (r.status !== 0) throw new CampaignError(`Neustart von ${config.cell} fehlgeschlagen:\n${r.stderr.trim()}`);
  await switchFront(sides, config);
  await sleep(settings.restartSettleMs);
  log('cell_restarted', { run: runId, services: config.services });
}

// docker compose arguments for a k6 run against one configuration.
function k6RunArgs(settings, config, { vus, holdSeconds, connectSpreadSeconds, summaryRel }) {
  const env = {
    K6_TARGET_BASE_URL: settings.sut.targetBaseUrl,
    K6_VUS: String(vus),
    K6_HOLD_SECONDS: String(holdSeconds),
    K6_SETTLE_SECONDS: String(settings.settleSeconds),
    K6_CONNECT_SPREAD_SECONDS: String(connectSpreadSeconds),
    ...config.env,
  };
  const args = ['--profile', 'load', 'run', '--rm', '--no-deps'];
  for (const [k, v] of Object.entries(env)) args.push('-e', `${k}=${v}`);
  args.push('k6', 'run', '--quiet', `--summary-export=/results/${summaryRel}`, `--summary-trend-stats=${SUMMARY_TREND_STATS}`, `scripts/${config.script}`);
  return args;
}

const k6TimeoutMs = (settings, holdSeconds) => (settings.settleSeconds + holdSeconds + 180) * 1000;

// Containers of a cell that crashed or were hit by the OOM killer.
const failedContainers = (containers) => containers
  .filter((c) => c.status !== 'running' || c.oom_killed)
  .map((c) => `${c.service}${c.oom_killed ? '(OOM)' : ''}`);

// Priming pass (DECISIONS.md 5.9). A static FPM pool only takes up a
// worker's memory once that worker has served its first request, and new
// connections go to the workers in turn. Without priming, memory would
// therefore grow from run to run at low client counts until every worker
// has served once. The priming pass connects as many clients as the pool
// has workers, spread over half the settle time. It is not recorded and
// runs the same way for all cells, including Node.js.
async function primeCells(ctx, configs) {
  const { sides, settings, campaignDirName, log } = ctx;
  const vus = settings.primeClients;
  const holdSeconds = settings.primeHoldSeconds;
  for (const config of configs) {
    if (ctx.interrupted) throw new CampaignError('Abbruch auf Anforderung (Strg-C)');
    await useProducerOf(ctx, config);
    process.stdout.write(`Vorlauf ${config.name} mit ${vus} Clients … `);
    await switchFront(sides, config);
    const ids = await containerIds(sides, config.services);
    const summaryRel = `${campaignDirName}/runs/.tmp-prime-${config.name}.json`;
    const summaryPath = path.join(RESULTS_DIR, summaryRel);
    const k6 = await sides.loadCompose(
      k6RunArgs(settings, config, { vus, holdSeconds, connectSpreadSeconds: settings.settleSeconds / 2, summaryRel }),
      {}, { timeoutMs: k6TimeoutMs(settings, holdSeconds) },
    );
    let summary = null;
    if (existsSync(summaryPath)) {
      summary = readJson(summaryPath);
      unlinkSync(summaryPath);
    }
    const m = extractMeasures(summary, config, { vus, holdSeconds }, null, null);
    const missing = config.services.filter((s) => !ids[s]);
    const failed = [...missing, ...failedContainers(await inspectContainers(sides, Object.values(ids)))];
    log('cell_primed', {
      config: config.name, clients: vus, k6_exit: k6.status, connected_ratio: m.connected_ratio,
      served_ratio: m.served_ratio, checks_failed: m.checks_failed, failed_containers: failed,
    });
    if (failed.length) throw new CampaignError(`Vorlauf: ${config.name} ist mit ${vus} Clients ausgefallen (${failed.join(', ')})`);
    console.log(`bedient ${(100 * (m.served_ratio ?? 0)).toFixed(1)} %`);
  }
}

// Event sources of a load level, at the rate of that level (DECISIONS.md
// 5.17, 5.19). If the configurations of a campaign use different sources
// (queue comparisons 9 to 11), only the source of the configuration being
// measured runs. Redis is measured with every run and would otherwise also do
// the queue work of the other configuration (DECISIONS.md 5.6.3).
async function prepareProducers(ctx, configs, rate) {
  const services = [...new Set(configs.map((c) => PRODUCER_SERVICES[c.producer]))];
  ctx.producers = { services, rate, active: null, created: new Set() };
  await useProducerOf(ctx, configs[0]);
}

// Runs the event source of a configuration and stops the other sources of the
// campaign. Does nothing if that source is already running.
async function useProducerOf(ctx, config) {
  const { sides, settings, log } = ctx;
  const p = ctx.producers;
  const service = PRODUCER_SERVICES[config.producer];
  if (p.active === service) return;
  const others = p.services.filter((s) => s !== service);
  if (others.length) await stopProducers(sides, log, others);
  const env = { SIMULATOR_RATE: String(p.rate) };
  if (settings.sut.redisHost) env.SIMULATOR_REDIS_HOST = settings.sut.redisHost;
  // A fresh container at the first start in a load level, so that the rate of
  // this level applies. Afterwards the stopped container is started again.
  const args = ['--profile', 'tools', 'up', '-d'];
  if (!p.created.has(service)) args.push('--force-recreate');
  if (sides.remote) args.push('--no-deps');
  args.push(service);
  const r = await sides.loadCompose(args, env);
  if (r.status !== 0) throw new CampaignError(`Ereignisquelle ${service} ließ sich nicht starten:\n${r.stderr.trim()}`);
  p.created.add(service);
  p.active = service;
  log('producers_started', { services: [service], rate_per_second: p.rate });
  await sleep(settings.producerSettleMs);
}

async function stopProducers(sides, log, services = Object.values(PRODUCER_SERVICES)) {
  await sides.loadCompose(['--profile', 'tools', 'stop', ...services]);
  log('producers_stopped', { services });
}

// ---------------------------------------------------------------------------
// Resource sampler (tools/resource-sampler)
// ---------------------------------------------------------------------------

function startSampler(spawnCompose, groups, { intervalMs, hostCpu = false }) {
  const args = ['--profile', 'tools', 'exec', '-T', 'resource-sampler', 'node', 'sampler.js', 'measure', '--interval-ms', String(intervalMs)];
  for (const [group, ids] of Object.entries(groups)) args.push('--cell', `${group}=${ids.join(',')}`);
  if (hostCpu) args.push('--host-cpu');
  const child = spawnCompose(args);

  const lines = [];
  let buffer = '';
  let stderr = '';
  let exited = false;
  child.stdout.on('data', (d) => {
    buffer += d;
    let idx;
    while ((idx = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (line) lines.push(line);
    }
  });
  child.stderr.on('data', (d) => { stderr += d; });
  child.on('close', () => { exited = true; });
  child.on('error', (err) => { stderr += String(err); exited = true; });

  async function nextMessage(timeoutMs) {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      if (lines.length) return JSON.parse(lines.shift());
      if (exited) {
        if (buffer.trim()) return JSON.parse(buffer.trim());
        throw new Error(`Sampler beendet ohne Ergebnis: ${stderr.trim()}`);
      }
      if (Date.now() > deadline) throw new Error('Sampler antwortet nicht (Timeout)');
      await sleep(50);
    }
  }

  return {
    async ready() {
      const msg = await nextMessage(30000);
      if (!msg.ready) throw new Error(msg.error ?? 'Sampler nicht bereit');
      return msg;
    },
    async stop() {
      child.stdin.end();
      const msg = await nextMessage(30000);
      if (msg.error) throw new Error(msg.error);
      return msg;
    },
    kill() {
      try { child.kill(); } catch { /* already exited */ }
    },
  };
}

// ---------------------------------------------------------------------------
// A single run
// ---------------------------------------------------------------------------

function extractMeasures(summary, config, scenario, resources, loadgen, nginxResources = null) {
  const m = summary?.metrics ?? {};
  const p = config.metricPrefix;
  const lat = m[config.metric] ?? {};
  const connect = m[`${p}_connect_ms`] ?? {};
  const count = (name) => (m[name]?.count ?? null);
  const expected = count(`${p}_events_expected`);
  const unique = count(`${p}_events_unique`);
  const connected = count(`${p}_clients_connected_in_time`) ?? 0;
  const served = count(`${p}_clients_served`) ?? 0;
  const cell = resources?.cells?.[config.cell] ?? {};
  const redis = resources?.cells?.redis ?? {};
  const total = resources?.total ?? {};
  const nginx = nginxResources?.cells?.nginx ?? {};
  return {
    latency_mean_ms: lat.avg ?? null,
    latency_min_ms: lat.min ?? null,
    latency_median_ms: lat.med ?? null,
    latency_p90_ms: lat['p(90)'] ?? null,
    latency_p95_ms: lat['p(95)'] ?? null,
    latency_p99_ms: lat['p(99)'] ?? null,
    latency_max_ms: lat.max ?? null,
    connect_mean_ms: connect.avg ?? null,
    connect_median_ms: connect.med ?? null,
    connect_p95_ms: connect['p(95)'] ?? null,
    connect_max_ms: connect.max ?? null,
    clients: scenario.vus,
    clients_connected_in_time: connected,
    clients_served: served,
    connected_ratio: connected / scenario.vus,
    served_ratio: served / scenario.vus,
    events_received: count(`${p}_events_received`),
    events_unique: unique,
    events_expected: expected,
    events_lost: count(`${p}_events_lost`),
    events_duplicate: count(`${p}_events_duplicate`),
    delivery_ratio: expected ? unique / expected : null,
    delivered_events_per_s: unique == null ? null : unique / scenario.holdSeconds,
    source_rate_eps: m[`${p}_source_rate_eps`]?.med ?? null,
    connection_errors: count(`${p}_connection_errors`) ?? 0,
    checks_passed: m.checks?.passes ?? null,
    checks_failed: m.checks?.fails ?? null,
    data_received_bytes: m.data_received?.count ?? null,
    data_received_bytes_per_s: m.data_received?.rate ?? null,
    data_sent_bytes: m.data_sent?.count ?? null,
    data_sent_bytes_per_s: m.data_sent?.rate ?? null,
    cpu_seconds: cell.cpu_seconds ?? null,
    cpu_cores_avg: cell.cpu_cores_avg ?? null,
    working_set_avg_bytes: cell.working_set_avg_bytes ?? null,
    working_set_peak_bytes: cell.working_set_peak_bytes ?? null,
    mem_peak_bytes: cell.mem_peak_bytes ?? null,
    // exact kernel peak since container start, summed over the containers of the
    // cell. mem_peak_kernel_new shows whether it rose during the run.
    mem_peak_kernel_bytes: cell.mem_peak_lifetime_bytes ?? null,
    mem_peak_kernel_new: cell.mem_peak_lifetime_new ?? null,
    cpu_seconds_redis: redis.cpu_seconds ?? null,
    working_set_peak_bytes_redis: redis.working_set_peak_bytes ?? null,
    cpu_seconds_total: total.cpu_seconds ?? null,
    working_set_peak_bytes_total: total.working_set_peak_bytes ?? null,
    // Descriptive only, not part of the totals (DECISIONS.md 5.6.1).
    cpu_seconds_nginx: nginx.cpu_seconds ?? null,
    working_set_peak_bytes_nginx: nginx.working_set_peak_bytes ?? null,
    loadgen_cpu_util_avg: loadgen?.host?.cpu?.util_avg ?? null,
    loadgen_cpu_util_max: loadgen?.host?.cpu?.util_max_interval ?? null,
  };
}

async function runOnce(ctx, { config, scenario, runIndex, isWarmup }) {
  const { sides, settings, campaignDir, campaignDirName, log } = ctx;
  const runId = `${scenario.name}_${config.name}_run${String(runIndex).padStart(4, '0')}`;
  const record = {
    schema: 'eda-thesis/run/2',
    run: {
      id: runId,
      config: config.name,
      cell: config.cell,
      scenario: scenario.name,
      phase: settings.phase,
      block: settings.block,
      run_index: runIndex,
      warmup: isWarmup,
      valid: false,
      invalid_reason: null,
      started_at: null,
      ended_at: null,
    },
    load: {
      vus: scenario.vus,
      settle_seconds: settings.settleSeconds,
      connect_spread_seconds: settings.connectSpreadSeconds,
      hold_seconds: scenario.holdSeconds,
      event_rate_nominal_per_s: scenario.eventRatePerSecond,
      producer: config.producer,
      script: config.script,
      metric: config.metric,
      target_base_url: settings.sut.targetBaseUrl,
      front_mode: config.front.mode,
      // Only the names of additional variables, never their values (e.g. app keys).
      extra_env_keys: Object.keys(config.env),
    },
    measures: null,
    resources: null,
    loadgen: null,
    nginx: null,
    containers: null,
    context: ctx.context,
    k6_summary: null,
  };
  const invalid = (reason) => {
    if (!record.run.invalid_reason) record.run.invalid_reason = reason;
  };

  if (settings.phase === 'storm') await restartCell(sides, settings, config, log, runId);
  else await switchFront(sides, config);
  await k6Version(sides);

  const ids = await containerIds(sides, config.services);
  const redisId = (await containerIds(sides, ['redis'])).redis;
  const missing = config.services.filter((s) => !ids[s]);
  let sampler = null;
  let loadSampler = null;
  let throttledStart = null;
  if (missing.length || !redisId) {
    invalid(`container_not_running:${[...missing, ...(redisId ? [] : ['redis'])].join(',')}`);
  } else {
    throttledStart = await sides.sutThrottled();
    sampler = startSampler((a) => sides.sutSpawnCompose(a), {
      [config.cell]: config.services.map((s) => ids[s]),
      redis: [redisId],
    }, { intervalMs: settings.resourceIntervalMs });
    try {
      const ready = await sampler.ready();
      if (settings.sut.pi) {
        const slice = `eda_${config.cell.replace(/-/g, '_')}.slice`;
        const outside = Object.values(ready.cgroups).filter((c) => c.cell !== 'redis' && !c.dir.includes(slice));
        if (outside.length) {
          sampler.kill();
          throw new CampaignError(`Container von ${config.cell} liegen nicht im cgroup-Topf ${slice} (docker-compose.pi.yml aktiv?)`);
        }
      }
    } catch (err) {
      if (err instanceof CampaignError) throw err;
      sampler.kill();
      sampler = null;
      invalid(`resource_sampler:${err.message}`);
    }
  }
  let nginxSampler = null;
  if (sampler) {
    // Load of the load generator. Locally the same host also measures the
    // system itself, so the value is only logged.
    loadSampler = startSampler((a) => sides.loadSpawnCompose(a), {}, { intervalMs: 1000, hostCpu: true });
    try {
      await loadSampler.ready();
    } catch (err) {
      loadSampler.kill();
      loadSampler = null;
      log('loadgen_sampler_unavailable', { run: runId, reason: err.message });
    }
    // The front Nginx is outside the budget of the cell and not part of any
    // test family. Its own sampler keeps it out of the total of cell and
    // Redis. It only shows whether Nginx works differently in the fastcgi and
    // the http mode (DECISIONS.md 5.6.1).
    const nginxId = (await containerIds(sides, ['nginx'])).nginx;
    if (nginxId) {
      nginxSampler = startSampler((a) => sides.sutSpawnCompose(a), { nginx: [nginxId] }, { intervalMs: 1000 });
      try {
        await nginxSampler.ready();
      } catch (err) {
        nginxSampler.kill();
        nginxSampler = null;
        log('nginx_sampler_unavailable', { run: runId, reason: err.message });
      }
    }
  }

  const tmpRel = `${campaignDirName}/runs/.tmp-${runId}.json`;
  const tmpPath = path.join(RESULTS_DIR, tmpRel);
  const k6Args = k6RunArgs(settings, config, {
    vus: scenario.vus, holdSeconds: scenario.holdSeconds, connectSpreadSeconds: settings.connectSpreadSeconds, summaryRel: tmpRel,
  });

  record.run.started_at = new Date().toISOString();
  const k6 = await sides.loadCompose(k6Args, {}, { timeoutMs: k6TimeoutMs(settings, scenario.holdSeconds) });
  record.run.ended_at = new Date().toISOString();

  if (sampler) {
    try {
      record.resources = await sampler.stop();
    } catch (err) {
      sampler.kill();
      invalid(`resource_sampler:${err.message}`);
    }
    // If the sampler provides no throttling status (Pi 5), the vcgencmd values
    // taken directly before the start and after the end of the measurement apply.
    const host = record.resources?.host;
    if (host && host.throttled_start == null && host.throttled_end == null) {
      Object.assign(host, { throttled_start: throttledStart, throttled_end: await sides.sutThrottled(), throttled_source: 'vcgencmd' });
    }
  }
  if (loadSampler) {
    try {
      record.loadgen = await loadSampler.stop();
    } catch (err) {
      loadSampler.kill();
      log('loadgen_sampler_failed', { run: runId, reason: err.message });
    }
  }
  if (nginxSampler) {
    try {
      record.nginx = await nginxSampler.stop();
    } catch (err) {
      nginxSampler.kill();
      log('nginx_sampler_failed', { run: runId, reason: err.message });
    }
  }

  // A crash of the cell causes all other findings of the run (no events,
  // error pages) and is therefore listed as the reason first.
  record.containers = await inspectContainers(sides, Object.values(ids));
  const failed = failedContainers(record.containers);
  if (failed.length) record.run.invalid_reason = `sut_container_failed:${failed.join(',')}`;

  if (k6.status !== 0) invalid(`k6_exit_${k6.status}`);
  if (existsSync(tmpPath)) {
    record.k6_summary = readJson(tmpPath);
    unlinkSync(tmpPath);
  } else {
    invalid('no_k6_summary');
  }
  record.measures = extractMeasures(record.k6_summary, config, scenario, record.resources, record.loadgen, record.nginx);
  if (!record.measures.events_unique) invalid('no_events_received');
  if (record.measures.latency_mean_ms == null) invalid('no_latency_metric');
  if (settings.requireAllConnected && record.measures.clients_connected_in_time < scenario.vus) {
    invalid(`clients_not_connected_in_settle:${record.measures.clients_connected_in_time}/${scenario.vus}`);
  }
  // Error page instead of the stream, or failed handshake, for individual
  // clients (exactly one check per client in the k6 script).
  if (settings.requireAllConnected && record.measures.checks_failed > 0) {
    invalid(`http_status_errors:${record.measures.checks_failed}`);
  }
  // Every event reaches a client exactly once. Duplicates mean that a cell
  // receives events that are not meant for it, as happened when both queue
  // cells shared one notification channel (DECISIONS.md 5.19).
  if (settings.requireAllConnected && record.measures.events_duplicate > 0) {
    invalid(`duplicate_events:${record.measures.events_duplicate}`);
  }

  const hostState = record.resources?.host;
  if (hostState && throttledDuring(hostState.throttled_start, hostState.throttled_end)) {
    invalid('host_throttled');
  } else if (hostState && settings.sut.pi && (throttleBits(hostState.throttled_start) == null || throttleBits(hostState.throttled_end) == null)) {
    invalid('host_throttle_unknown');
  }
  if (sides.remote && settings.requireAllConnected && (record.measures.loadgen_cpu_util_avg ?? 0) > LOADGEN_UTIL_LIMIT) {
    invalid(`loadgen_saturated:${record.measures.loadgen_cpu_util_avg.toFixed(2)}`);
  }

  record.run.valid = record.run.invalid_reason == null;
  writeFileSync(path.join(campaignDir, 'runs', `${runId}.json`), JSON.stringify(record, null, 2));

  log('run_finished', {
    run: runId,
    valid: record.run.valid,
    invalid_reason: record.run.invalid_reason,
    warmup: isWarmup,
    latency_mean_ms: record.measures.latency_mean_ms,
    connect_mean_ms: record.measures.connect_mean_ms,
    served_ratio: record.measures.served_ratio,
    delivery_ratio: record.measures.delivery_ratio,
    cpu_seconds_total: record.measures.cpu_seconds_total,
    k6_stderr_tail: record.run.valid ? undefined : k6.stderr.trim().split(/\r?\n/).slice(-5).join('\n'),
  });

  return {
    run_index: runIndex,
    warmup: isWarmup,
    valid: record.run.valid,
    invalid_reason: record.run.invalid_reason,
    measures: record.measures,
  };
}

// ---------------------------------------------------------------------------
// Evaluation of a campaign
// ---------------------------------------------------------------------------

// Seed per comparison from the campaign seed and a label (FNV-1a), so that
// comparisons get independent but reproducible resamples.
function hashSeed(base, label) {
  let h = 0x811c9dc5;
  for (const ch of label) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return (base ^ h) >>> 0;
}

function compareConfigs(runsA, runsB, measure, { seed, resamples, minPairs }) {
  const pairs = pairByRunIndex(runsA, runsB, (r) => r.measures?.[measure]);
  const result = pairs.a.length > 0
    ? comparePaired(pairs.a, pairs.b, { resamples, seed, minPairs })
    : { n_pairs: 0, n_pairs_nonzero: 0, conclusive: false };
  return {
    ...result,
    pairs: { run_indices: pairs.indices, dropped_run_indices: pairs.dropped, a: pairs.a, b: pairs.b },
  };
}

function countReasons(runs) {
  const reasons = {};
  for (const r of runs) {
    if (!r.valid) reasons[r.invalid_reason] = (reasons[r.invalid_reason] ?? 0) + 1;
  }
  return reasons;
}

function aggregateScenario(scenario, configs, comparisons, results, settings) {
  const agg = {
    vus: scenario.vus,
    settle_seconds: settings.settleSeconds,
    connect_spread_seconds: settings.connectSpreadSeconds,
    hold_seconds: scenario.holdSeconds,
    event_rate_nominal_per_s: scenario.eventRatePerSecond,
    runs_per_config: scenario.runsPerConfig,
    warmup_runs: settings.warmupRuns,
    configs: {},
    comparisons: [],
  };
  // In overload phases invalid runs also count with their values (e.g. share
  // of served clients), otherwise only valid runs.
  const usable = (r) => r.valid || DESCRIPTIVE_PHASES.has(settings.phase);
  for (const config of configs) {
    const all = results[config.name];
    const measured = all.filter((r) => !r.warmup);
    const valid = measured.filter((r) => r.valid);
    agg.configs[config.name] = {
      cell: config.cell,
      runs_measured: measured.length,
      runs_valid: valid.length,
      runs_invalid: measured.length - valid.length,
      invalid_reasons: countReasons(measured),
      warmup_invalid: all.filter((r) => r.warmup && !r.valid).length,
      describe: Object.fromEntries(DESCRIBED_MEASURES.map((m) => [m, describe(measured.filter(usable).map((r) => r.measures?.[m]))])),
    };
  }
  if (COMPARING_PHASES.has(settings.phase)) {
    for (const [nameA, nameB] of comparisons) {
      const runsA = results[nameA].filter((r) => !r.warmup);
      const runsB = results[nameB].filter((r) => !r.warmup);
      const entry = {
        a: nameA,
        b: nameB,
        cell_a: configs.find((c) => c.name === nameA).cell,
        cell_b: configs.find((c) => c.name === nameB).cell,
        measures: {},
      };
      for (const measure of TESTED_MEASURES) {
        entry.measures[measure] = compareConfigs(runsA, runsB, measure, {
          seed: hashSeed(settings.bootstrapSeed, `${scenario.name}|${nameA}|${nameB}|${measure}`),
          resamples: settings.bootstrapResamples,
          minPairs: settings.minPairs,
        });
      }
      agg.comparisons.push(entry);
    }
  }
  return agg;
}

// Saturation (DECISIONS.md 5.17). Highest rate up to which a configuration
// delivers at least minDeliveryRatio in the median on EVERY level and keeps
// a median p95 latency of at most maxP95LatencyMs.
function saturationSummary(scenarios, configs, scenarioAggs, criteria) {
  const byRate = [...scenarios].sort((x, y) => x.eventRatePerSecond - y.eventRatePerSecond);
  const summary = { criteria, configs: {} };
  for (const config of configs) {
    const steps = byRate.filter((s) => scenarioAggs[s.name]).map((s) => {
      const d = scenarioAggs[s.name].configs[config.name].describe;
      const delivery = d.delivery_ratio.median;
      const p95 = d.latency_p95_ms.median;
      const pass = delivery != null && p95 != null && delivery >= criteria.minDeliveryRatio && p95 <= criteria.maxP95LatencyMs;
      return {
        scenario: s.name,
        rate_per_s: s.eventRatePerSecond,
        delivery_ratio_median: delivery,
        latency_p95_median_ms: p95,
        cpu_cores_avg_median: d.cpu_cores_avg.median,
        pass,
      };
    });
    let maxSustainable = null;
    for (const step of steps) {
      if (!step.pass) break;
      maxSustainable = step.rate_per_s;
    }
    summary.configs[config.name] = { steps, max_sustainable_rate_per_s: maxSustainable };
  }
  return summary;
}

// Scaling (DECISIONS.md 5.9, H4). Per client count the share of served
// clients, latency and resources. Capacity limit = smallest client count at
// which fewer than minServedRatio of the clients are served in the median.
function scalingSummary(scenarios, configs, scenarioAggs, criteria) {
  const byVus = [...scenarios].sort((x, y) => x.vus - y.vus);
  const summary = { criteria, configs: {} };
  for (const config of configs) {
    const steps = byVus.filter((s) => scenarioAggs[s.name]).map((s) => {
      const d = scenarioAggs[s.name].configs[config.name].describe;
      return {
        scenario: s.name,
        clients: s.vus,
        runs: d.latency_mean_ms.n,
        served_ratio_median: d.served_ratio.median,
        connect_mean_median_ms: d.connect_mean_ms.median,
        latency_mean_median_ms: d.latency_mean_ms.median,
        latency_p95_median_ms: d.latency_p95_ms.median,
        cpu_cores_avg_median: d.cpu_cores_avg.median,
        working_set_peak_total_median_bytes: d.working_set_peak_bytes_total.median,
        // Range of the runs per level for the error bars of the figures (DECISIONS.md 5.25)
        served_ratio_min: d.served_ratio.min,
        served_ratio_max: d.served_ratio.max,
        latency_mean_min_ms: d.latency_mean_ms.min,
        latency_mean_max_ms: d.latency_mean_ms.max,
        working_set_peak_total_min_bytes: d.working_set_peak_bytes_total.min,
        working_set_peak_total_max_bytes: d.working_set_peak_bytes_total.max,
      };
    });
    const limit = steps.find((st) => st.served_ratio_median == null || st.served_ratio_median < criteria.minServedRatio);
    summary.configs[config.name] = { steps, first_clients_below_criterion: limit?.clients ?? null };
  }
  return summary;
}

// Storm (phase storm, DECISIONS.md 5.10). Per cell, how many clients were
// connected in time and served when all connected at once, how long the
// connection setup took, the most memory the cell used and why runs were
// invalid (e.g. OOM).
function stormSummary(scenarios, configs, scenarioAggs) {
  const summary = { configs: {} };
  for (const config of configs) {
    summary.configs[config.name] = scenarios.filter((s) => scenarioAggs[s.name]).map((s) => {
      const c = scenarioAggs[s.name].configs[config.name];
      const d = c.describe;
      return {
        scenario: s.name,
        clients: s.vus,
        runs: c.runs_measured,
        runs_valid: c.runs_valid,
        invalid_reasons: c.invalid_reasons,
        connected_ratio_median: d.connected_ratio.median,
        served_ratio_median: d.served_ratio.median,
        served_ratio_min: d.served_ratio.min,
        connect_mean_median_ms: d.connect_mean_ms.median,
        latency_mean_median_ms: d.latency_mean_ms.median,
        working_set_peak_total_max_bytes: d.working_set_peak_bytes_total.max,
        mem_peak_kernel_max_bytes: d.mem_peak_kernel_bytes.max,
      };
    });
  }
  return summary;
}

// Interim state of the latency comparisons (DECISIONS.md 5.9). In the pilot
// it serves to choose the number of repetitions, in the main campaign only as
// a check, never as a stopping criterion.
function interimReport(scenario, comparisons, results, settings, runIndex) {
  const entries = [];
  for (const [nameA, nameB] of comparisons) {
    const cmp = compareConfigs(
      results[nameA].filter((r) => !r.warmup),
      results[nameB].filter((r) => !r.warmup),
      'latency_mean_ms',
      { seed: hashSeed(settings.bootstrapSeed, `interim|${scenario.name}|${nameA}|${nameB}`), resamples: 2000, minPairs: settings.minPairs }
    );
    if (cmp.n_pairs < 2) continue;
    const entry = {
      scenario: scenario.name,
      comparison: `${nameA} vs. ${nameB}`,
      after_run_index: runIndex,
      n_pairs: cmp.n_pairs,
      median_diff_ms: cmp.median_diff,
      median_diff_ci95: cmp.median_diff_ci95,
      ci_width_ms: cmp.median_diff_ci95[1] - cmp.median_diff_ci95[0],
      cliffs_delta: cmp.cliffs_delta,
      cliffs_magnitude: cmp.cliffs_magnitude,
      p_unadjusted: cmp.wilcoxon.p,
    };
    entries.push(entry);
    console.log(`   Zwischenstand ${entry.comparison}: n=${entry.n_pairs}, Median-Diff ${entry.median_diff_ms?.toFixed(3)} ms `
      + `[${entry.median_diff_ci95[0]?.toFixed(3)}, ${entry.median_diff_ci95[1]?.toFixed(3)}], δ=${entry.cliffs_delta.toFixed(3)} (${entry.cliffs_magnitude})`);
  }
  return entries;
}

// ---------------------------------------------------------------------------
// Procedure
// ---------------------------------------------------------------------------

async function runScenario(ctx, scenario, configs, comparisons, interim) {
  const { settings, sides, log } = ctx;
  const spread = settings.connectSpreadSeconds ? `, Verbindungsaufbau über ${settings.connectSpreadSeconds} s verteilt` : '';
  const restart = settings.phase === 'storm' ? ', Neustart der Zelle vor jedem Lauf' : '';
  console.log(`\n=== Laststufe "${scenario.name}": ${scenario.vus} Clients, ${settings.settleSeconds} s + ${scenario.holdSeconds} s, `
    + `${scenario.eventRatePerSecond} Events/s, ${scenario.runsPerConfig} Läufe je Konfiguration${spread}${restart} ===`);
  log('scenario_started', { scenario });
  await prepareProducers(ctx, configs, scenario.eventRatePerSecond);
  // Once per campaign before the first warm-up. The cells then keep running
  // until the end of the campaign.
  if (settings.primeClients > 0 && !ctx.primed) {
    await primeCells(ctx, configs);
    ctx.primed = true;
  }

  const results = Object.fromEntries(configs.map((c) => [c.name, []]));
  const measuredRuns = Math.max(0, scenario.runsPerConfig - settings.warmupRuns);
  const allowedFailures = Math.max(1, Math.floor(settings.maxFailureRate * measuredRuns));
  ctx.partialResults = results;

  for (let runIndex = 1; runIndex <= scenario.runsPerConfig; runIndex++) {
    for (const config of configs) {
      if (ctx.interrupted) throw new CampaignError('Abbruch auf Anforderung (Strg-C)');
      const isWarmup = runIndex <= settings.warmupRuns;
      await useProducerOf(ctx, config);
      process.stdout.write(`[${scenario.name}] ${config.name} Lauf ${runIndex}/${scenario.runsPerConfig}${isWarmup ? ' (Warm-up)' : ''} … `);
      const result = await runOnce(ctx, { config, scenario, runIndex, isWarmup });
      results[config.name].push(result);
      const m = result.measures;
      const summary = `Latenz-Mittel ${m.latency_mean_ms?.toFixed(3)} ms, Aufbau ${m.connect_mean_ms?.toFixed(1)} ms, `
        + `bedient ${(100 * (m.served_ratio ?? 0)).toFixed(1)} %, Zustellung ${(100 * (m.delivery_ratio ?? 0)).toFixed(2)} %`;
      console.log(result.valid ? `ok (${summary})` : `UNGÜLTIG: ${result.invalid_reason} (${summary})`);

      const failures = results[config.name].filter((r) => !r.warmup && !r.valid).length;
      if (settings.maxFailureRate < 1 && failures > allowedFailures) {
        throw new CampaignError(
          `${config.name}: ${failures} ungültige Läufe in "${scenario.name}" — erlaubt sind ${allowedFailures} `
          + `(maxFailureRate ${settings.maxFailureRate}). Die Ergebnisse dieser Laststufe sind nicht belastbar.`
        );
      }
      await sleep(settings.pauseMinMs + Math.random() * (settings.pauseMaxMs - settings.pauseMinMs));
    }

    if (settings.reportEvery && runIndex > settings.warmupRuns && (runIndex - settings.warmupRuns) % settings.reportEvery === 0) {
      const entries = interimReport(scenario, comparisons, results, settings, runIndex);
      interim.push(...entries);
      if (entries.length) log('interim_report', { entries });
    }
  }
  return results;
}

function printSummary(aggregate) {
  for (const [name, s] of Object.entries(aggregate.scenarios)) {
    console.log(`\n${name}:`);
    for (const [cfg, c] of Object.entries(s.configs)) {
      const d = c.describe;
      console.log(`  ${cfg}: ${c.runs_valid}/${c.runs_measured} gültig, Latenz-Mittel ${d.latency_mean_ms.median?.toFixed(3)} ms, `
        + `Aufbau ${d.connect_mean_ms.median?.toFixed(1)} ms, bedient ${((d.served_ratio.median ?? 0) * 100).toFixed(1)} %, `
        + `CPU Zelle+Redis ${d.cpu_seconds_total.median?.toFixed(3)} s (Redis ${d.cpu_seconds_redis.median?.toFixed(3)} s)`);
    }
    for (const cmp of s.comparisons) {
      const l = cmp.measures.latency_mean_ms;
      if (!l.wilcoxon) continue;
      console.log(`  ${cmp.a} vs. ${cmp.b}: n=${l.n_pairs}${l.conclusive ? '' : ' (nicht aussagekräftig)'}, Median-Diff ${l.median_diff?.toFixed(3)} ms `
        + `[${l.median_diff_ci95[0]?.toFixed(3)}, ${l.median_diff_ci95[1]?.toFixed(3)}], δ=${l.cliffs_delta.toFixed(3)} (${l.cliffs_magnitude}), `
        + `p (unkorrigiert) = ${l.wilcoxon.p.toPrecision(3)}`);
    }
  }
  if (aggregate.saturation) {
    console.log('\nSättigung (höchste nachhaltige Rate):');
    for (const [cfg, s] of Object.entries(aggregate.saturation.configs)) {
      console.log(`  ${cfg}: ${s.max_sustainable_rate_per_s ?? '— (bereits die niedrigste Stufe nicht erfüllt)'} Events/s`);
    }
  }
  if (aggregate.storm) {
    console.log('\nAnsturm (gleichzeitiger Verbindungsaufbau):');
    for (const [cfg, steps] of Object.entries(aggregate.storm.configs)) {
      for (const st of steps) {
        const peak = st.mem_peak_kernel_max_bytes == null ? '–' : `${(st.mem_peak_kernel_max_bytes / 2 ** 20).toFixed(0)} MiB`;
        const reasons = Object.keys(st.invalid_reasons);
        console.log(`  ${cfg}, ${st.clients} Clients: ${st.runs_valid}/${st.runs} gültig, rechtzeitig verbunden ${((st.connected_ratio_median ?? 0) * 100).toFixed(1)} %, `
          + `Spitze laut Kernel ${peak}${reasons.length ? `, ungültig wegen ${reasons.join(', ')}` : ''}`);
      }
    }
  }
  if (aggregate.scaling) {
    console.log('\nSkalierung (erste Clientzahl unter dem Kriterium):');
    for (const [cfg, s] of Object.entries(aggregate.scaling.configs)) {
      console.log(`  ${cfg}: ${s.first_clients_below_criterion ?? 'auf keiner Stufe'}`);
    }
  }
}

async function main() {
  const campaignPath = process.argv[2];
  if (!campaignPath) {
    console.error('Aufruf: node tools/orchestrate/run.js <kampagne.json>');
    process.exit(1);
  }
  const campaign = readJson(path.resolve(campaignPath));
  const cells = readJson(path.join(__dirname, 'cells.json'));
  const settings = resolveSettings(campaign);
  const configs = resolveConfigs(campaign, cells);
  const scenarios = resolveScenarios(campaign);
  const minConfigs = COMPARING_PHASES.has(settings.phase) ? 2 : 1;
  if (configs.length < minConfigs) {
    throw new CampaignError(`Phase "${settings.phase}" braucht mindestens ${minConfigs} Konfiguration(en).`);
  }
  const names = new Set(configs.map((c) => c.name));
  if (names.size !== configs.length) throw new CampaignError('Konfigurationsnamen müssen eindeutig sein.');
  const comparisons = COMPARING_PHASES.has(settings.phase)
    ? (campaign.comparisons ?? configs.flatMap((a, i) => configs.slice(i + 1).map((b) => [a.name, b.name])))
    : [];
  for (const [a, b] of comparisons) {
    if (!names.has(a) || !names.has(b)) throw new CampaignError(`Vergleich ${a} vs. ${b}: unbekannte Konfiguration`);
  }
  if (settings.phase === 'saturation' && new Set(scenarios.map((s) => s.vus)).size !== 1) {
    throw new CampaignError('Sättigungskampagnen variieren nur die Event-Rate; alle Laststufen brauchen dieselbe Clientzahl.');
  }
  if (settings.phase === 'main' && ![1, 2].includes(settings.block)) {
    throw new CampaignError('Hauptkampagnen brauchen "block": 1 (konfirmatorisch) oder 2 (Replikation).');
  }

  const startedAt = new Date();
  const campaignDirName = `${startedAt.toISOString().replace(/[:.]/g, '-')}_${settings.name}`;
  const campaignDir = path.join(RESULTS_DIR, campaignDirName);
  mkdirSync(path.join(campaignDir, 'runs'), { recursive: true });
  writeFileSync(path.join(campaignDir, 'campaign.json'), JSON.stringify(campaign, null, 2));
  const logFile = path.join(campaignDir, 'campaign.log.jsonl');
  const log = (event, data = {}) => appendFileSync(logFile, `${JSON.stringify({ t: new Date().toISOString(), event, ...data })}\n`);

  const sides = createSides(settings.sut);
  const ctx = { sides, settings, campaignDir, campaignDirName, log, context: null, interrupted: false, partialResults: null, primed: false, producers: null };
  process.on('SIGINT', () => {
    if (ctx.interrupted) process.exit(130);
    ctx.interrupted = true;
    console.log('\nAbbruch angefordert — die Kampagne endet nach dem laufenden Lauf (erneut Strg-C: sofort).');
  });
  process.on('SIGTERM', () => { ctx.interrupted = true; });

  console.log(`Kampagne "${settings.name}" (${settings.phase}${settings.block ? `, Block ${settings.block}` : ''}) -> ${path.relative(REPO_ROOT, campaignDir)}`);
  log('campaign_started', { name: settings.name, phase: settings.phase, block: settings.block, configs: configs.map((c) => c.name), scenarios: scenarios.map((s) => s.name) });

  const aggregate = {
    schema: 'eda-thesis/aggregate/2',
    name: settings.name,
    phase: settings.phase,
    block: settings.block,
    campaign_dir: campaignDirName,
    started_at: startedAt.toISOString(),
    finished_at: null,
    aborted: false,
    abort_reason: null,
    settings,
    configs: configs.map(({ env, ...rest }) => ({ ...rest, extra_env_keys: Object.keys(env) })),
    comparisons,
    tested_measures: TESTED_MEASURES,
    note: 'p-Werte hier unkorrigiert; Holm-Korrektur über alle Kampagnen in evaluate.js (DECISIONS.md 5.15).',
    context: null,
    scenarios: {},
    interim: [],
    saturation: null,
    scaling: null,
  };

  let currentScenario = null;
  try {
    const loadGit = await gitState();
    const sutGit = await sides.sutGit();
    if (sides.remote && loadGit.commit !== sutGit.commit) {
      throw new CampaignError(`Code-Stand verschieden: Lastgenerator ${loadGit.commit}, SUT-Seite ${sutGit.commit}`);
    }
    console.log('Vorabprüfung: k6-Extension …');
    const k6 = await k6Version(sides);
    console.log('Container vorbereiten …');
    const services = await prepareSut(sides, configs, log);
    const hostInfo = await samplerInfo(sides);
    checkHost(hostInfo, settings, log);
    const containers = await inspectContainers(sides, Object.values(await containerIds(sides, services)));
    const modes = {};
    for (const c of containers) modes[c.service] = await productionMode(sides, c);
    const notProduction = Object.entries(modes).filter(([, m]) => !m.production);
    if (notProduction.length) {
      const msg = `Nicht im Produktionsbetrieb: ${notProduction.map(([s, m]) => `${s} (${m.reasons.join(', ')})`).join('; ')}`;
      if (settings.requireProduction) throw new CampaignError(`${msg} — Pilot-, Haupt- und Kontrollkampagnen verlangen Produktionsbetrieb (DECISIONS.md 5.5).`);
      console.warn(`Hinweis: ${msg}`);
      log('preflight_warning', { message: msg });
    }

    // Campaign file relative to the repository. If it lies outside, only the
    // file name is logged (no local paths in the log). The content is in
    // campaign.json of the results directory anyway.
    const relCampaign = path.relative(REPO_ROOT, path.resolve(campaignPath));
    const campaignFile = relCampaign.startsWith('..') || path.isAbsolute(relCampaign) ? path.basename(campaignPath) : relCampaign;
    ctx.context = {
      campaign: { name: settings.name, phase: settings.phase, block: settings.block, dir: campaignDirName, file: campaignFile },
      topology: sides.remote ? 'zwei Rechner (SUT-Seite per ssh)' : 'ein Rechner',
      git: { load: loadGit, sut: sutGit },
      k6_version: k6,
      sut_host: hostInfo,
      containers: Object.fromEntries(containers.map((c) => [c.service, {
        image: c.image, image_id: c.image_id, limits: c.limits, runtime_env: c.runtime_env, mode: modes[c.service],
      }])),
      orchestrator: { node: process.version, platform: process.platform },
    };
    aggregate.context = ctx.context;
    log('context', ctx.context);

    for (const scenario of scenarios) {
      currentScenario = scenario;
      const results = await runScenario(ctx, scenario, configs, comparisons, aggregate.interim);
      aggregate.scenarios[scenario.name] = aggregateScenario(scenario, configs, comparisons, results, settings);
      log('scenario_finished', { scenario: scenario.name });
      currentScenario = null;
    }
  } catch (err) {
    aggregate.aborted = true;
    aggregate.abort_reason = err.message;
    log('campaign_aborted', { reason: err.message });
    console.error(`\nABBRUCH: ${err.message}`);
    if (!(err instanceof CampaignError)) console.error(err.stack);
    // Runs already measured in the aborted load level stay visible but do not
    // count as a complete load level.
    if (currentScenario && ctx.partialResults) {
      aggregate.scenarios[currentScenario.name] = {
        ...aggregateScenario(currentScenario, configs, comparisons, ctx.partialResults, settings),
        incomplete: true,
      };
    }
  } finally {
    await stopProducers(sides, log).catch(() => {});
  }

  const complete = Object.fromEntries(Object.entries(aggregate.scenarios).filter(([, s]) => !s.incomplete));
  if (settings.phase === 'saturation' && Object.keys(complete).length) {
    aggregate.saturation = saturationSummary(scenarios, configs, complete, settings.saturation);
  }
  if (settings.phase === 'scaling' && Object.keys(complete).length) {
    aggregate.scaling = scalingSummary(scenarios, configs, complete, settings.scaling);
  }
  if (settings.phase === 'storm' && Object.keys(complete).length) {
    aggregate.storm = stormSummary(scenarios, configs, complete);
  }
  aggregate.finished_at = new Date().toISOString();
  writeFileSync(path.join(campaignDir, 'aggregate.json'), JSON.stringify(aggregate, null, 2));
  log('campaign_finished', { aborted: aggregate.aborted });
  console.log(`\nAuswertung: ${path.relative(REPO_ROOT, path.join(campaignDir, 'aggregate.json'))}`);
  printSummary(aggregate);
  process.exit(aggregate.aborted ? 2 : 0);
}

main().catch((err) => {
  console.error(err instanceof CampaignError ? `ABBRUCH: ${err.message}` : err);
  process.exit(1);
});
