// Pre-check of the test environment before an unattended run (second run of
// 2026-11-16, DECISIONS.md 5.14). Runs on the load generator and checks both
// machines. Every check prints one line, the exit code is 0 only if all pass.
// Values from .env files are never printed, only whether they match.
//
// Usage:
//   node tools/orchestrate/precheck.js --sut sut.pi.json [--since 2026-11-16] [--move-old-results]
//
//   --sut                file with the sut block (ssh, repoDir), as for plan-campaigns.js
//   --since              start of the current run. Campaign folders directly in
//                        results/ that are older belong to an earlier run.
//                        schedule.js would count them as done and skip the
//                        campaigns of the new run with the same name.
//   --move-old-results   move such folders to ~/eda-run1-backup instead of
//                        failing. They are already in the repository under
//                        results/run1/.

import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statfsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const RESULTS = path.join(ROOT, 'results');
const args = process.argv.slice(2);
const opt = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const flag = (name) => args.includes(`--${name}`);

const sutFile = opt('sut');
if (!sutFile) {
  console.error('Aufruf: node tools/orchestrate/precheck.js --sut sut.pi.json [--since <Datum>] [--move-old-results]');
  process.exit(1);
}
const sutRaw = JSON.parse(readFileSync(path.resolve(sutFile), 'utf-8'));
const sut = sutRaw.sut ?? sutRaw;
const since = opt('since', '2026-11-16');

const GiB = 2 ** 30;
const MIN_FREE_BYTES = 5 * GiB;
const MAX_TEMP_C = 70;
const MAX_CLOCK_SKEW_S = 2;
// Laravel settings that differ from Laravel's defaults (DECISIONS.md 5.20).
const LARAVEL_ENV = { SESSION_DRIVER: 'cookie', CACHE_STORE: 'file', REDIS_PREFIX: '' };
// Images and the source folders they are built from, per machine.
const LOAD_IMAGES = {
  'eda-thesis-event-simulator': 'tools/event-simulator',
  'eda-thesis-php-laravel': 'prototypes/php-laravel',
  'eda-thesis-resource-sampler': 'tools/resource-sampler',
};
const SUT_IMAGES = {
  'eda-thesis-node-minimal': 'prototypes/node-minimal',
  'eda-thesis-node-express': 'prototypes/node-express',
  'eda-thesis-php-minimal': 'prototypes/php-minimal',
  'eda-thesis-php-laravel': 'prototypes/php-laravel',
  'eda-thesis-resource-sampler': 'tools/resource-sampler',
};

function run(cmd, cmdArgs, { cwd = ROOT, timeoutMs = 60000 } = {}) {
  return new Promise((resolve) => {
    execFile(cmd, cmdArgs, { cwd, timeout: timeoutMs, maxBuffer: 16 * 2 ** 20 }, (error, stdout, stderr) => {
      resolve({ ok: !error, code: error?.code ?? 0, stdout: String(stdout).trim(), stderr: String(stderr).trim() });
    });
  });
}
const shQuote = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;
const ssh = (command, timeoutMs = 60000) =>
  run('ssh', ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10', sut.ssh, `cd ${shQuote(sut.repoDir)} && ${command}`], { timeoutMs });

const results = [];
function report(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'ok    ' : 'FEHLER'}  ${name}${detail ? `  (${detail})` : ''}`);
}

// Time of the last commit that changed a folder, in seconds.
async function lastChange(dir, on = 'load') {
  const r = on === 'load' ? await run('git', ['log', '-1', '--format=%ct', '--', dir]) : await ssh(`git log -1 --format=%ct -- ${shQuote(dir)}`);
  return Number(r.stdout) || null;
}

async function imageCreated(image, on = 'load') {
  const r = on === 'load'
    ? await run('docker', ['image', 'inspect', '-f', '{{.Created}}', image])
    : await ssh(`docker image inspect -f '{{.Created}}' ${shQuote(image)}`);
  return r.ok ? Date.parse(r.stdout) / 1000 : null;
}

async function checkImages(images, on) {
  for (const [image, dir] of Object.entries(images)) {
    const created = await imageCreated(image, on);
    const changed = await lastChange(dir, on);
    const where = on === 'load' ? 'Lastgenerator' : 'Pi';
    if (created == null) report(`${where}: Image ${image} vorhanden`, false, 'fehlt, bitte bauen');
    else report(`${where}: Image ${image} nach der letzten Änderung von ${dir} gebaut`, changed == null || created >= changed,
      created >= (changed ?? 0) ? '' : 'veraltet, bitte neu bauen');
  }
}

// ---------------------------------------------------------------- load generator
console.log('Lastgenerator');
const docker = await run('docker', ['info', '--format', '{{.ServerVersion}}']);
report('Lastgenerator: Docker erreichbar', docker.ok);
const head = await run('git', ['rev-parse', 'HEAD']);
const dirty = await run('git', ['status', '--porcelain', '--untracked-files=no']);
report('Lastgenerator: keine geänderten versionierten Dateien', dirty.ok && dirty.stdout === '', dirty.stdout ? `${dirty.stdout.split('\n').length} geändert` : '');

const envFile = path.join(ROOT, '.env');
const notifySet = Boolean(process.env.NOTIFY_URL)
  || (existsSync(envFile) && readFileSync(envFile, 'utf-8').split(/\r?\n/).some((l) => /^NOTIFY_URL=\S+/.test(l)));
report('Lastgenerator: Benachrichtigung (NOTIFY_URL) eingetragen', notifySet);

// Campaign folders of an earlier run directly in results/ (not in a subfolder).
const old = existsSync(RESULTS)
  ? readdirSync(RESULTS, { withFileTypes: true })
    .filter((d) => /^\d{4}-\d\d-\d\dT/.test(d.name) && d.name.slice(0, 10) < since)
    .map((d) => d.name)
  : [];
if (old.length && flag('move-old-results')) {
  const backup = path.join(os.homedir(), 'eda-run1-backup');
  mkdirSync(backup, { recursive: true });
  for (const name of old) renameSync(path.join(RESULTS, name), path.join(backup, name));
  report('Lastgenerator: Ergebnisse früherer Durchläufe aus results/ entfernt', true, `${old.length} Einträge nach ${backup} verschoben`);
} else {
  report('Lastgenerator: keine Ergebnisse früherer Durchläufe direkt in results/', old.length === 0,
    old.length ? `${old.length} Einträge vor ${since}, mit --move-old-results verschieben` : '');
}

const freeLoad = statfsSync(existsSync(RESULTS) ? RESULTS : ROOT);
report('Lastgenerator: mindestens 5 GiB frei', freeLoad.bavail * freeLoad.bsize >= MIN_FREE_BYTES,
  `${((freeLoad.bavail * freeLoad.bsize) / GiB).toFixed(1)} GiB`);
const load1 = os.loadavg()[0];
report('Lastgenerator: keine andere Last (Mittel der letzten Minute unter 1,5)', load1 < 1.5, load1.toFixed(2));
if (docker.ok) await checkImages(LOAD_IMAGES, 'load');

// ---------------------------------------------------------------- test server
console.log('\nPi');
const reach = await ssh('true', 20000);
report('Pi: per ssh erreichbar', reach.ok, reach.ok ? '' : reach.stderr.split('\n')[0]);
if (reach.ok) {
  const piHead = await ssh('git rev-parse HEAD');
  report('Pi: gleicher Commit wie der Lastgenerator', piHead.stdout === head.stdout, `${piHead.stdout.slice(0, 8)} gegenüber ${head.stdout.slice(0, 8)}`);
  const piDirty = await ssh('git status --porcelain --untracked-files=no');
  report('Pi: keine geänderten versionierten Dateien', piDirty.ok && piDirty.stdout === '');

  const page = await ssh('getconf PAGESIZE');
  report('Pi: Kernel mit 4-KB-Seiten', page.stdout === '4096', page.stdout);
  // Bits 0 to 3 describe the current state, bits 16 to 19 only whether it
  // happened since the start. Only a current limit stops the run, because a
  // restart to clear the history would shift the memory accounting (5.14).
  // run.js marks every run with throttling as invalid anyway.
  const throttled = await ssh('vcgencmd get_throttled');
  const bits = parseInt((throttled.stdout.match(/throttled=(0x[0-9a-fA-F]+)/) ?? [])[1] ?? 'NaN', 16);
  report('Pi: derzeit keine Unterspannung und keine Drosselung', Number.isFinite(bits) && (bits & 0xf) === 0,
    Number.isFinite(bits) && bits & 0xf0000 ? `${throttled.stdout}, seit dem Start schon einmal aufgetreten` : throttled.stdout);
  const temp = await ssh('vcgencmd measure_temp');
  const celsius = Number((temp.stdout.match(/temp=([\d.]+)/) ?? [])[1]);
  report(`Pi: Temperatur unter ${MAX_TEMP_C} °C`, celsius < MAX_TEMP_C, Number.isFinite(celsius) ? `${celsius} °C` : temp.stdout);

  const piNow = Number((await ssh('date +%s')).stdout);
  const skew = Math.abs(piNow - Date.now() / 1000);
  report(`Pi: Uhr weicht höchstens ${MAX_CLOCK_SKEW_S} s ab`, skew <= MAX_CLOCK_SKEW_S, `${skew.toFixed(1)} s`);

  const df = await ssh(`df -Pk ${shQuote(sut.repoDir)} | tail -1`);
  const freePi = Number(df.stdout.split(/\s+/)[3]) * 1024;
  report('Pi: mindestens 5 GiB frei', freePi >= MIN_FREE_BYTES, `${(freePi / GiB).toFixed(1)} GiB`);

  // One property per call, because systemctl does not keep the order of -p.
  const quota = (await ssh('systemctl show -p CPUQuotaPerSecUSec --value eda_php_laravel_ws.slice')).stdout;
  const memMax = (await ssh('systemctl show -p MemoryMax --value eda_php_laravel_ws.slice')).stdout;
  report('Pi: Slices mit Budget angelegt (2 CPUs, 1 536 MiB)', quota === '2s' && memMax === String(1536 * 2 ** 20), `${quota || '-'}, ${memMax || '-'}`);

  const foreign = await ssh("docker ps --format '{{.Label \"com.docker.compose.project\"}} {{.Names}}'");
  const strangers = foreign.stdout.split('\n').filter(Boolean).filter((l) => !l.startsWith('eda-'));
  report('Pi: keine fremden Container', foreign.ok && strangers.length === 0, strangers.length ? strangers.join(', ') : '');

  // Only the named keys are read, the values are compared here and never printed.
  const keys = Object.keys(LARAVEL_ENV);
  const envLines = await ssh(`grep -E '^(${keys.join('|')})=' prototypes/php-laravel/.env || true`);
  const found = Object.fromEntries(envLines.stdout.split('\n').filter(Boolean).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')]));
  for (const [key, expected] of Object.entries(LARAVEL_ENV)) {
    report(`Pi: Laravel ${key} ${expected === '' ? 'leer' : `= ${expected}`}`, key in found && found[key] === expected, key in found ? '' : 'fehlt');
  }

  const boot = await ssh('uptime -s');
  report('Pi: Startzeit festgehalten, bis zum Ende kein Neustart', boot.ok, boot.stdout);
  await checkImages(SUT_IMAGES, 'sut');
}

const failed = results.filter((r) => !r.ok);
console.log(failed.length ? `\n${failed.length} von ${results.length} Prüfungen nicht bestanden.` : `\nAlle ${results.length} Prüfungen bestanden.`);
process.exit(failed.length ? 1 : 0);
