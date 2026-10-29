#!/usr/bin/env node
// Status report for unattended operation (DECISIONS.md 5.14). Progress of
// the schedule, running campaign, invalid runs, temperature and throttling
// of the test server, load of the load generator, drift of the control
// measurement and free disk space.
//
// Usage:
//   node tools/orchestrate/status.js [--schedule <schedule.json>] [--sut <sut.json>] [--hours 24] [--notify]
//
//   --schedule  progress of this schedule (complete, open, aborted)
//   --sut       file with the sut block of the two-machine setup (as for
//               plan-campaigns.js), additionally queries temperature,
//               throttling status and disk space directly on the test server
//   --hours     time window for runs, temperature and load (default 24)
//   --results   different results directory (default results/)
//   --notify    send a notification on warnings (NOTIFY_URL, notify.js),
//               e.g. from an hourly cron job
//
// Exit code 0 = no warning, 1 = at least one warning.

import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync, statfsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { notify } from './notify.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

// Warning thresholds.
const LIMITS = {
  idleMinutes: 20,     // no activity although the schedule is open
  invalidRate: 0.05,   // share of invalid runs (pilot, main, control)
  tempC: 75,           // temperature of the Pi (throttling starts at about 80 °C)
  diskFreeRatio: 0.10, // free disk space
  loadgenUtil: 0.8,    // mean load of the load generator (as in run.js)
  controlDrift: 0.20,  // deviation of the control measurement from the first value
};
const NON_STRICT_PHASES = new Set(['scaling', 'saturation', 'storm']);

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const RESULTS_DIR = path.resolve(opt('results', path.join(REPO_ROOT, 'results')));
const hours = Number(opt('hours', 24));
const since = Date.now() - hours * 3.6e6;

const lines = [];
const warnings = [];
const out = (s = '') => lines.push(s);
const warn = (s) => {
  warnings.push(s);
  lines.push(`  WARNUNG: ${s}`);
};
const pct = (x) => `${(100 * x).toFixed(1)} %`;
const ago = (t) => {
  const min = Math.round((Date.now() - t) / 60000);
  return min < 120 ? `vor ${min} min` : `vor ${(min / 60).toFixed(1)} h`;
};

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf-8'));
  } catch {
    return null;
  }
}

function readLog(file) {
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf-8').split('\n').filter(Boolean).flatMap((l) => {
    try {
      return [JSON.parse(l)];
    } catch {
      return [];
    }
  });
}

// All campaign directories (chronological, the name starts with the start
// time) with their log and, if present, their evaluation.
function loadCampaigns() {
  if (!existsSync(RESULTS_DIR)) return [];
  return readdirSync(RESULTS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(path.join(RESULTS_DIR, e.name, 'campaign.json')))
    .map((e) => e.name)
    .sort()
    .map((dirName) => {
      const dir = path.join(RESULTS_DIR, dirName);
      const campaign = readJson(path.join(dir, 'campaign.json')) ?? {};
      const aggregate = readJson(path.join(dir, 'aggregate.json'));
      const events = readLog(path.join(dir, 'campaign.log.jsonl'));
      return {
        dir,
        name: aggregate?.name ?? campaign.name ?? dirName,
        phase: aggregate?.phase ?? campaign.phase,
        events,
        aggregate,
        lastEvent: events.length ? Date.parse(events[events.length - 1].t) : 0,
      };
    });
}

const campaigns = loadCampaigns();
const isComplete = (c) => c.aggregate && !c.aggregate.aborted && c.aggregate.finished_at;

out(`Status ${new Date().toISOString()} (Zeitfenster: letzte ${hours} h)`);

// 1. Schedule and running campaign
out('\nZeitplan');
const latestActivity = Math.max(0, ...campaigns.map((c) => c.lastEvent));
const schedulePath = opt('schedule');
if (schedulePath) {
  const schedule = readJson(path.resolve(schedulePath));
  if (!schedule) {
    warn(`Zeitplan ${schedulePath} nicht lesbar`);
  } else {
    const dir = path.dirname(path.resolve(schedulePath));
    const names = schedule.campaigns.map((f) => readJson(path.join(dir, f))?.name).filter(Boolean);
    const done = names.filter((n) => campaigns.some((c) => c.name === n && isComplete(c)));
    const aborted = names.filter((n) => !done.includes(n) && campaigns.some((c) => c.name === n && c.aggregate?.aborted));
    out(`  ${schedule.name}: ${done.length} von ${names.length} Kampagnen vollständig, ${names.length - done.length} offen`);
    if (aborted.length) out(`  abgebrochen und noch offen: ${aborted.join(', ')}`);
    const durations = campaigns
      .filter((c) => names.includes(c.name) && isComplete(c))
      .map((c) => Date.parse(c.aggregate.finished_at) - Date.parse(c.aggregate.started_at));
    if (durations.length && done.length < names.length) {
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      const rest = avg * (names.length - done.length);
      const restText = rest < 3.6e6 ? `${Math.round(rest / 6e4)} min` : `${(rest / 3.6e6).toFixed(1)} h`;
      out(`  geschätzte Restdauer: ${restText} (Mittel ${(avg / 6e4).toFixed(0)} min je Kampagne, ohne Kontrollmessungen)`);
    }
    const idle = (Date.now() - latestActivity) / 60000;
    if (done.length < names.length && idle > LIMITS.idleMinutes) {
      warn(`seit ${Math.round(idle)} min keine Aktivität, obwohl Kampagnen offen sind`);
    }
  }
}
// Without aggregate.json and with recent activity, a campaign is still
// running. Older directories without aggregate.json come from killed runs.
const withoutAggregate = campaigns.filter((c) => !c.aggregate && c.events.length);
const running = withoutAggregate.filter((c) => Date.now() - c.lastEvent < LIMITS.idleMinutes * 60000).pop();
out(running ? `  läuft gerade: ${running.name} (letztes Ereignis ${ago(running.lastEvent)})` : '  derzeit keine laufende Kampagne');
const killed = withoutAggregate.filter((c) => c !== running && c.lastEvent >= since);
if (killed.length) out(`  ohne Auswertung beendet (Prozess hart beendet?): ${killed.map((c) => c.name).join(', ')}`);

// 2. Runs in the time window
out('\nLäufe');
const recent = campaigns.flatMap((c) => c.events
  .filter((e) => e.event === 'run_finished' && Date.parse(e.t) >= since)
  .map((e) => ({ ...e, phase: c.phase })));
if (!recent.length) {
  out('  keine Läufe im Zeitfenster');
} else {
  const strict = recent.filter((r) => !NON_STRICT_PHASES.has(r.phase) && !r.warmup);
  const invalid = strict.filter((r) => !r.valid);
  out(`  ${recent.length} Läufe, davon ${strict.length} Messläufe in Pilot-, Haupt- oder Kontrollkampagnen, ${invalid.length} davon ungültig`);
  const reasons = {};
  for (const r of invalid) {
    const key = String(r.invalid_reason).split(':')[0];
    reasons[key] = (reasons[key] ?? 0) + 1;
  }
  for (const [reason, n] of Object.entries(reasons)) out(`    ${reason}: ${n}`);
  if (strict.length && invalid.length / strict.length > LIMITS.invalidRate) {
    warn(`Anteil ungültiger Läufe ${pct(invalid.length / strict.length)} (Grenze ${pct(LIMITS.invalidRate)})`);
  }
  const throttled = recent.filter((r) => String(r.invalid_reason).startsWith('host_throttled')).length;
  if (throttled) warn(`${throttled} Läufe wegen Drosselung des Testservers ungültig`);
  const unknown = recent.filter((r) => String(r.invalid_reason).startsWith('host_throttle_unknown')).length;
  if (unknown) warn(`${unknown} Läufe ohne lesbaren Drosselstatus ungültig (vcgencmd auf dem Testserver prüfen)`);
}

// 3. Temperature and load generator from the run records of the time window
let tempMax = null;
let loadgenMax = null;
for (const c of campaigns.filter((x) => x.lastEvent >= since)) {
  const runsDir = path.join(c.dir, 'runs');
  if (!existsSync(runsDir)) continue;
  for (const f of readdirSync(runsDir).filter((x) => x.endsWith('.json') && !x.startsWith('.'))) {
    const run = readJson(path.join(runsDir, f));
    if (!run || Date.parse(run.run?.started_at) < since) continue;
    const t = run.resources?.host?.temp_max_c;
    if (t != null) tempMax = Math.max(tempMax ?? t, t);
    const u = run.measures?.loadgen_cpu_util_avg;
    if (u != null && run.context?.topology?.startsWith('zwei')) loadgenMax = Math.max(loadgenMax ?? u, u);
  }
}
out('\nHardware (aus den Lauf-Protokollen)');
out(`  höchste Temperatur des Testservers: ${tempMax == null ? 'nicht gemessen (kein Temperaturfühler)' : `${tempMax.toFixed(1)} °C`}`);
if (tempMax != null && tempMax > LIMITS.tempC) warn(`Testserver bis ${tempMax.toFixed(1)} °C warm (Grenze ${LIMITS.tempC} °C), Kühlung prüfen`);
if (loadgenMax != null) {
  out(`  höchste mittlere Auslastung des Lastgenerators: ${pct(loadgenMax)}`);
  if (loadgenMax > LIMITS.loadgenUtil) warn(`Lastgenerator bis ${pct(loadgenMax)} ausgelastet, k6 könnte zum Engpass werden`);
}

// 4. Control measurement (median of the mean latencies per control campaign)
out('\nKontrollmessung');
const controls = campaigns
  .filter((c) => c.phase === 'control' && isComplete(c))
  .map((c) => {
    const scenario = Object.values(c.aggregate.scenarios ?? {})[0];
    const cfg = scenario && Object.values(scenario.configs ?? {})[0];
    return { at: c.aggregate.finished_at, latency: cfg?.describe?.latency_mean_ms?.median ?? null };
  })
  .filter((c) => c.latency != null);
if (!controls.length) {
  out('  noch keine vollständige Kontrollmessung');
} else {
  for (const c of controls.slice(-7)) out(`  ${c.at.slice(0, 16).replace('T', ' ')}  ${c.latency.toFixed(3)} ms`);
  const first = controls[0].latency;
  const drift = (controls[controls.length - 1].latency - first) / first;
  out(`  letzte gegenüber erster Kontrollmessung: ${drift >= 0 ? '+' : ''}${pct(drift)}`);
  if (Math.abs(drift) > LIMITS.controlDrift) warn(`Kontrollmessung weicht um ${pct(drift)} vom Ausgangswert ab, Drift des Aufbaus prüfen`);
}

// 5. Disk space of the machine running status.js (results)
out('\nSpeicherplatz');
try {
  const s = statfsSync(existsSync(RESULTS_DIR) ? RESULTS_DIR : REPO_ROOT);
  const free = s.bavail / s.blocks;
  out(`  Ergebnisverzeichnis: ${((s.bavail * s.bsize) / 1e9).toFixed(1)} GB frei (${pct(free)})`);
  if (free < LIMITS.diskFreeRatio) warn(`nur noch ${pct(free)} Speicherplatz für die Ergebnisse`);
} catch {
  out('  Ergebnisverzeichnis: nicht ermittelbar');
}

// 6. Query the test server directly (two-machine setup)
const sutPath = opt('sut');
if (sutPath) {
  out('\nTestserver (aktuell)');
  const sut = readJson(path.resolve(sutPath));
  const q = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;
  const r = sut?.ssh && sut.repoDir
    ? spawnSync('ssh', ['-T', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10', sut.ssh,
      // vcgencmd adds the throttling status that the sampler cannot read on the Pi 5
      `cd ${q(sut.repoDir)} && docker compose --profile tools exec -T resource-sampler node sampler.js info && (vcgencmd get_throttled 2>/dev/null || true)`],
    { encoding: 'utf-8', timeout: 30000 })
    : null;
  let info = null;
  if (r?.status === 0) {
    try {
      info = JSON.parse(r.stdout.split(/\r?\n/).filter((l) => l.trim().startsWith('{')).pop());
      const m = r.stdout.match(/throttled=(0x[0-9a-f]+)/i);
      if (info.throttled == null && m) info.throttled = m[1];
    } catch { /* incomplete output */ }
  }
  if (!sut?.ssh || !sut?.repoDir) {
    warn(`${sutPath} enthält kein ssh und repoDir`);
  } else if (!info) {
    warn('Testserver nicht erreichbar oder resource-sampler läuft nicht');
  } else {
    const bits = Number.parseInt(String(info.throttled ?? '0'), 16);
    out(`  ${info.model ?? 'unbekanntes Modell'}, ${info.temp_c == null ? 'Temperatur unbekannt' : `${info.temp_c.toFixed(1)} °C`}, Drosselstatus ${info.throttled ?? 'unbekannt'}, Governor ${info.cpu_governor ?? 'unbekannt'}`);
    if (info.temp_c != null && info.temp_c > LIMITS.tempC) warn(`Testserver aktuell ${info.temp_c.toFixed(1)} °C warm`);
    // Bits 0 to 3: currently under-voltage, frequency capped, throttled, soft temperature limit.
    if (!Number.isNaN(bits) && (bits & 0xF) !== 0) warn(`Testserver aktuell gedrosselt (${info.throttled})`);
    if (sut.pi && info.throttled == null) warn('Drosselstatus des Testservers nicht lesbar (vcgencmd get_throttled)');
    if (info.docker_disk_free_bytes != null && info.docker_disk_total_bytes) {
      const free = info.docker_disk_free_bytes / info.docker_disk_total_bytes;
      out(`  Docker-Datenträger: ${(info.docker_disk_free_bytes / 1e9).toFixed(1)} GB frei (${pct(free)})`);
      if (free < LIMITS.diskFreeRatio) warn(`nur noch ${pct(free)} Speicherplatz auf dem Testserver`);
    }
  }
}

out(warnings.length ? `\n${warnings.length} Warnung(en).` : '\nKeine Warnungen.');
console.log(lines.join('\n'));
if (warnings.length && args.includes('--notify')) {
  await notify('EDA: Warnung im Dauerbetrieb', warnings.join('\n'));
}
process.exit(warnings.length ? 1 : 0);
