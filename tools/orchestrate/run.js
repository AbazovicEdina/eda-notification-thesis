#!/usr/bin/env node
// Orchestrierung der Messkampagnen (DECISIONS.md 5.6–5.9, 5.16–5.19).
//
// Eine Kampagne misst Zellen aus cells.json über eine oder mehrere
// Laststufen; bei zwei oder mehr Konfigurationen im alternierenden Design
// A, B, A, B. Pro Lauf entsteht eine vollständige JSON-Datei (k6-Ergebnis,
// Zustellung, Verbindungsaufbau, Ressourcen von Zelle, Redis und
// Lastgenerator, Kontext), dazu ein fortlaufendes Kampagnen-Log (JSON
// Lines) und am Ende eine Kampagnen-Auswertung (aggregate.json). Die
// Holm-Korrektur über alle Kampagnen erfolgt getrennt in evaluate.js.
//
// Aufruf: node tools/orchestrate/run.js <kampagne.json>
// Kampagnenformat und Phasen: README.md in diesem Ordner.
//
// Das Skript läuft direkt mit Node auf dem steuernden Rechner (nicht in
// Docker), weil es selbst `docker compose` aufruft: für die SUT-Seite lokal
// oder im Zwei-Rechner-Aufbau per ssh auf dem Raspberry Pi
// (DECISIONS.md 5.14), für k6 und die Ereignisquellen immer lokal.

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

// Ereignisquellen je Zelle (cells.json "producer") -> Compose-Dienst.
const PRODUCER_SERVICES = {
  pubsub: 'event-simulator',
  bullmq: 'event-simulator-bullmq',
  laravel: 'laravel-producer',
};
// Dienste ohne Zellbezug, die während jeder Kampagne laufen dürfen. Alle
// übrigen laufenden Dienste werden vor Kampagnenbeginn gestoppt
// (DECISIONS.md 5.6.3).
const INFRA_SERVICES = new Set(['redis', 'nginx', 'resource-sampler', ...Object.values(PRODUCER_SERVICES)]);

// Phasen (DECISIONS.md 5.9): pilot und main sind statistisch auswertbar
// (main mit Block 1 = konfirmatorisch, Block 2 = Replikation); control,
// scaling, saturation und storm sind beschreibend. storm misst den
// gleichzeitigen Verbindungsaufbau aller Clients (DECISIONS.md 5.10).
const PHASES = new Set(['pilot', 'main', 'control', 'scaling', 'saturation', 'storm']);
// Phasen, in denen ausgefallene Läufe ein Messergebnis sind und kein
// Abbruchgrund (Überlast, Ansturm).
const DESCRIPTIVE_PHASES = new Set(['scaling', 'saturation', 'storm']);
const COMPARING_PHASES = new Set(['pilot', 'main']);
// In diesen Phasen müssen alle Clients bis zum Ende der Einschwingzeit
// verbunden sein und alle Zellen im Produktionsbetrieb laufen.
const STRICT_PHASES = new Set(['pilot', 'main', 'control']);

// Messgrößen mit statistischem Vergleich je Kampagne (Familien in plan.json).
const TESTED_MEASURES = ['latency_mean_ms', 'cpu_seconds_total', 'working_set_peak_bytes_total', 'connect_mean_ms'];
// Messgrößen, für die pro Konfiguration deskriptive Kennzahlen entstehen.
const DESCRIBED_MEASURES = [
  'latency_mean_ms', 'latency_median_ms', 'latency_p95_ms', 'latency_p99_ms', 'latency_max_ms',
  'connect_mean_ms', 'connect_p95_ms', 'connected_ratio', 'served_ratio',
  'delivery_ratio', 'events_lost', 'delivered_events_per_s', 'source_rate_eps',
  'cpu_seconds', 'cpu_seconds_redis', 'cpu_seconds_total', 'cpu_cores_avg',
  'working_set_peak_bytes', 'working_set_peak_bytes_redis', 'working_set_peak_bytes_total', 'working_set_avg_bytes', 'mem_peak_kernel_bytes',
  'data_received_bytes_per_s', 'connection_errors', 'loadgen_cpu_util_avg', 'loadgen_cpu_util_max',
];
// Mittlere Auslastung des Lastgenerators, ab der ein Lauf im
// Zwei-Rechner-Aufbau als vom Lastwerkzeug begrenzt gilt (DECISIONS.md 5.14).
const LOADGEN_UTIL_LIMIT = 0.8;

class CampaignError extends Error {}

// ---------------------------------------------------------------------------
// Prozesse
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

// SUT-Seite (Redis, Front-Nginx, Zellen, Sampler) lokal oder per ssh;
// Lastseite (k6, Ereignisquellen, Sampler für die Auslastung) immer lokal.
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
    // Drosselstatus per vcgencmd auf dem Host der SUT-Seite. Der Sampler im
    // Container liest ihn aus sysfs, die Datei fehlt aber auf dem Pi 5.
    // Lokal (ein Rechner, kein Pi) null.
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
// Kampagne laden
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

// Konfiguration = Zelle aus cells.json, optional mit eigenem Namen und
// eigenem script/metric/env (DECISIONS.md 5.9). Vorrang: Konfiguration >
// Kampagne > Zellen-Standard.
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
  // In beschreibenden Phasen jenseits der Kapazität sind ausgefallene Läufe
  // Messergebnisse und kein Abbruchgrund (DECISIONS.md 5.9).
  const descriptiveOverload = DESCRIPTIVE_PHASES.has(phase);
  // Verteilter Verbindungsaufbau (DECISIONS.md 5.10, Möglichkeit 5). 0 heißt,
  // alle Clients verbinden sich gleichzeitig (5.9). Die Verteilung muss vor
  // dem Ende der Einschwingzeit abgeschlossen sein.
  const connectSpreadSeconds = campaign.connectSpreadSeconds ?? 0;
  if (!(connectSpreadSeconds >= 0 && connectSpreadSeconds < (campaign.settleSeconds ?? 10))) {
    throw new CampaignError(`connectSpreadSeconds muss mindestens 0 und kleiner als settleSeconds sein, nicht ${connectSpreadSeconds}`);
  }
  if (phase === 'storm' && connectSpreadSeconds !== 0) {
    throw new CampaignError('Phase storm misst den gleichzeitigen Verbindungsaufbau, connectSpreadSeconds muss 0 sein');
  }
  return {
    name: campaign.name ?? 'kampagne',
    phase,
    block: campaign.block ?? (phase === 'main' ? 1 : null),
    warmupRuns: campaign.warmupRuns ?? 5,
    settleSeconds: campaign.settleSeconds ?? 10,
    connectSpreadSeconds,
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
      // ohne abschließenden Schrägstrich, sonst fragen die Skripte "//sse" an
      targetBaseUrl: (campaign.sut?.targetBaseUrl ?? 'http://nginx').replace(/\/+$/, ''),
      redisHost: campaign.sut?.redisHost ?? null,
    },
  };
}

// ---------------------------------------------------------------------------
// Vorabprüfungen und Kontext
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

// Raspberry-Pi-Firmware: Bits 0–3 = aktuell Unterspannung / Takt begrenzt /
// gedrosselt / Temperaturgrenze; Bits 16–19 = dasselbe "seit dem Booten".
// Ein Lauf gilt als gedrosselt, wenn zu Beginn oder am Ende eine aktuelle
// Drosselung anliegt oder während des Laufs ein "seit dem Booten"-Bit neu
// gesetzt wurde.
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
    // Tatsächlich wirksame Limits des laufenden Containers (nicht die
    // Compose-Datei), damit das Log belegt, womit gemessen wurde.
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

// Betriebsmodus je Container (DECISIONS.md 5.5): Node.js über NODE_ENV,
// Laravel über APP_ENV/APP_DEBUG, PHP allgemein über die geladene php.ini
// (php.ini-production setzt display_errors aus).
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
    phpIni = { file, display_errors: displayErrors };
    if (file === 'keine' || !['0', '', 'Off', 'off'].includes(displayErrors)) reasons.push(`php.ini=${file}, display_errors=${displayErrors}`);
  }
  return { production: reasons.length === 0, reasons, php_ini: phpIni };
}

// ---------------------------------------------------------------------------
// Container-Lebenszyklus
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
    // Auslastung des Lastgenerators (DECISIONS.md 5.14) misst ein Sampler
    // auf der Lastseite.
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
  // Erreichbarkeit: jede HTTP-Antwort der Zelle zählt (WS-Server antworten
  // auf einfache GET-Anfragen z. B. mit 4xx); nur 502/503/504 bedeuten,
  // dass Nginx die Zelle nicht erreicht.
  for (let attempt = 0; attempt < 60; attempt++) {
    const h = await sides.sutCompose(['exec', '-T', 'nginx', 'sh', '-c', 'wget -S -O /dev/null -T 2 http://127.0.0.1/healthz 2>&1 || true']);
    const m = h.stdout.match(/HTTP\/1\.[01] (\d{3})/);
    if (m && !['502', '503', '504'].includes(m[1])) return;
    await sleep(250);
  }
  throw new CampaignError(`Front-Nginx erreicht ${config.name} (${config.front.mode} ${config.front.host}:${config.front.port}) nicht`);
}

// Startet alle Ereignisquellen, die die Zellen der Kampagne brauchen, mit
// der Rate der Laststufe (DECISIONS.md 5.17, 5.19).
async function startProducers(sides, settings, configs, rate, log) {
  const services = [...new Set(configs.map((c) => PRODUCER_SERVICES[c.producer]))];
  const env = { SIMULATOR_RATE: String(rate) };
  if (settings.sut.redisHost) env.SIMULATOR_REDIS_HOST = settings.sut.redisHost;
  const args = ['--profile', 'tools', 'up', '-d', '--force-recreate'];
  if (sides.remote) args.push('--no-deps');
  args.push(...services);
  const r = await sides.loadCompose(args, env);
  if (r.status !== 0) throw new CampaignError(`Ereignisquellen ließen sich nicht starten:\n${r.stderr.trim()}`);
  log('producers_started', { services, rate_per_second: rate });
  await sleep(settings.producerSettleMs);
  return services;
}

async function stopProducers(sides, log) {
  await sides.loadCompose(['--profile', 'tools', 'stop', ...Object.values(PRODUCER_SERVICES)]);
  log('producers_stopped');
}

// ---------------------------------------------------------------------------
// Ressourcen-Sampler (tools/resource-sampler)
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
      try { child.kill(); } catch { /* bereits beendet */ }
    },
  };
}

// ---------------------------------------------------------------------------
// Ein Lauf
// ---------------------------------------------------------------------------

function extractMeasures(summary, config, scenario, resources, loadgen) {
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
    // exakter Höchstwert des Kernels seit Containerstart, Summe über die
    // Container der Zelle. mem_peak_kernel_new zeigt, ob er im Lauf gestiegen ist.
    mem_peak_kernel_bytes: cell.mem_peak_lifetime_bytes ?? null,
    mem_peak_kernel_new: cell.mem_peak_lifetime_new ?? null,
    cpu_seconds_redis: redis.cpu_seconds ?? null,
    working_set_peak_bytes_redis: redis.working_set_peak_bytes ?? null,
    cpu_seconds_total: total.cpu_seconds ?? null,
    working_set_peak_bytes_total: total.working_set_peak_bytes ?? null,
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
      // Nur die Namen zusätzlicher Variablen, nie deren Werte (z. B. App-Keys).
      extra_env_keys: Object.keys(config.env),
    },
    measures: null,
    resources: null,
    loadgen: null,
    containers: null,
    context: ctx.context,
    k6_summary: null,
  };
  const invalid = (reason) => {
    if (!record.run.invalid_reason) record.run.invalid_reason = reason;
  };

  await switchFront(sides, config);
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
  if (sampler) {
    // Auslastung des Lastgenerators; lokal misst derselbe Host auch das
    // System selbst, der Wert wird dann nur protokolliert.
    loadSampler = startSampler((a) => sides.loadSpawnCompose(a), {}, { intervalMs: 1000, hostCpu: true });
    try {
      await loadSampler.ready();
    } catch (err) {
      loadSampler.kill();
      loadSampler = null;
      log('loadgen_sampler_unavailable', { run: runId, reason: err.message });
    }
  }

  const tmpRel = `${campaignDirName}/runs/.tmp-${runId}.json`;
  const tmpPath = path.join(RESULTS_DIR, tmpRel);
  const k6Env = {
    K6_TARGET_BASE_URL: settings.sut.targetBaseUrl,
    K6_VUS: String(scenario.vus),
    K6_HOLD_SECONDS: String(scenario.holdSeconds),
    K6_SETTLE_SECONDS: String(settings.settleSeconds),
    K6_CONNECT_SPREAD_SECONDS: String(settings.connectSpreadSeconds),
    ...config.env,
  };
  const k6Args = ['--profile', 'load', 'run', '--rm', '--no-deps'];
  for (const [k, v] of Object.entries(k6Env)) k6Args.push('-e', `${k}=${v}`);
  k6Args.push('k6', 'run', '--quiet', `--summary-export=/results/${tmpRel}`, `--summary-trend-stats=${SUMMARY_TREND_STATS}`, `scripts/${config.script}`);

  record.run.started_at = new Date().toISOString();
  const k6 = await sides.loadCompose(k6Args, {}, { timeoutMs: (settings.settleSeconds + scenario.holdSeconds + 180) * 1000 });
  record.run.ended_at = new Date().toISOString();

  if (sampler) {
    try {
      record.resources = await sampler.stop();
    } catch (err) {
      sampler.kill();
      invalid(`resource_sampler:${err.message}`);
    }
    // Liefert der Sampler keinen Drosselstatus (Pi 5), gelten die Werte
    // von vcgencmd direkt vor dem Start und direkt nach dem Ende der Messung.
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

  if (k6.status !== 0) invalid(`k6_exit_${k6.status}`);
  if (existsSync(tmpPath)) {
    record.k6_summary = readJson(tmpPath);
    unlinkSync(tmpPath);
  } else {
    invalid('no_k6_summary');
  }
  record.measures = extractMeasures(record.k6_summary, config, scenario, record.resources, record.loadgen);
  if (!record.measures.events_unique) invalid('no_events_received');
  if (record.measures.latency_mean_ms == null) invalid('no_latency_metric');
  if (settings.requireAllConnected && record.measures.clients_connected_in_time < scenario.vus) {
    invalid(`clients_not_connected_in_settle:${record.measures.clients_connected_in_time}/${scenario.vus}`);
  }

  record.containers = await inspectContainers(sides, Object.values(ids));
  const failed = record.containers.filter((c) => c.status !== 'running' || c.oom_killed);
  if (failed.length) invalid(`sut_container_failed:${failed.map((c) => `${c.service}${c.oom_killed ? '(OOM)' : ''}`).join(',')}`);

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
// Auswertung einer Kampagne
// ---------------------------------------------------------------------------

// Startwert pro Vergleich aus dem Kampagnen-Seed und einem Label (FNV-1a),
// damit Vergleiche unabhängige, aber reproduzierbare Resamples erhalten.
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
  // In Überlast-Phasen zählen auch ungültige Läufe mit ihren Messwerten
  // (z. B. Anteil bedienter Clients); sonst nur gültige.
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

// Sättigung (DECISIONS.md 5.17): höchste Rate, bis zu der eine
// Konfiguration auf JEDER Stufe im Median mindestens minDeliveryRatio
// zustellt und im Median eine p95-Latenz von höchstens maxP95LatencyMs hält.
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

// Skalierung (DECISIONS.md 5.9, H4): je Clientzahl Anteil bedienter Clients,
// Latenz und Ressourcen; Kapazitätsgrenze = kleinste Clientzahl, bei der im
// Median weniger als minServedRatio der Clients bedient werden.
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
        // Spannweite der Läufe je Stufe für die Fehlerbalken der Abbildungen (DECISIONS.md 5.25)
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

// Ansturm (Phase storm, DECISIONS.md 5.10). Je Zelle, wie viele Clients
// beim gleichzeitigen Verbindungsaufbau rechtzeitig verbunden und bedient
// wurden, wie lange der Aufbau dauerte, wie viel Speicher die Zelle dabei
// höchstens belegte und warum Läufe ungültig waren (z. B. OOM).
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

// Zwischenstand der Latenz-Vergleiche (DECISIONS.md 5.9): dient im Pilot
// der Wahl der Wiederholungszahl, in der Hauptkampagne nur der Kontrolle —
// kein Abbruchkriterium.
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
// Ablauf
// ---------------------------------------------------------------------------

async function runScenario(ctx, scenario, configs, comparisons, interim) {
  const { settings, sides, log } = ctx;
  const spread = settings.connectSpreadSeconds ? `, Verbindungsaufbau über ${settings.connectSpreadSeconds} s verteilt` : '';
  console.log(`\n=== Laststufe "${scenario.name}": ${scenario.vus} Clients, ${settings.settleSeconds} s + ${scenario.holdSeconds} s, `
    + `${scenario.eventRatePerSecond} Events/s, ${scenario.runsPerConfig} Läufe je Konfiguration${spread} ===`);
  log('scenario_started', { scenario });
  await startProducers(sides, settings, configs, scenario.eventRatePerSecond, log);

  const results = Object.fromEntries(configs.map((c) => [c.name, []]));
  const measuredRuns = Math.max(0, scenario.runsPerConfig - settings.warmupRuns);
  const allowedFailures = Math.max(1, Math.floor(settings.maxFailureRate * measuredRuns));
  ctx.partialResults = results;

  for (let runIndex = 1; runIndex <= scenario.runsPerConfig; runIndex++) {
    for (const config of configs) {
      if (ctx.interrupted) throw new CampaignError('Abbruch auf Anforderung (Strg-C)');
      const isWarmup = runIndex <= settings.warmupRuns;
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
  const ctx = { sides, settings, campaignDir, campaignDirName, log, context: null, interrupted: false, partialResults: null };
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

    // Kampagnendatei relativ zum Repository; liegt sie außerhalb, nur der
    // Dateiname (keine lokalen Pfade im Protokoll). Der Inhalt steht ohnehin
    // vollständig in campaign.json des Ergebnisverzeichnisses.
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
    // Bereits gemessene Läufe der abgebrochenen Laststufe bleiben sichtbar,
    // gelten aber nicht als vollständige Laststufe.
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
