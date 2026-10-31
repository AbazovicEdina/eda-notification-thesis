#!/usr/bin/env node
// Generates the campaign files of a measurement phase from plan.json and
// cells.json (DECISIONS.md 5.9), so that no campaign has to be written by
// hand. Each campaign covers exactly one load level. If unattended operation
// stops, at most one load level is lost, and schedule.js resumes with the
// next one.
//
// Usage:
//   node tools/orchestrate/plan-campaigns.js pilot --runs baseline=100,medium=60,stress=40 --comparisons 1,4,7,10 --out campaigns/pilot
//   node tools/orchestrate/plan-campaigns.js main --block 1 --runs baseline=90,medium=90,stress=90 --out campaigns/block1
//   node tools/orchestrate/plan-campaigns.js scaling --steps 10,50,100,250,500,750,1000 --runs 3 --out campaigns/scaling
//   node tools/orchestrate/plan-campaigns.js saturation --clients 50 --rates 10,50,100,200,500 --runs 6 --out campaigns/saturation
//   node tools/orchestrate/plan-campaigns.js storm --clients 500 --runs 3 --hold 20 --out campaigns/storm
// Common options:
//   --prefix <text>        prefix of all campaign names, e.g. "smoke-" for a
//                          trial run. schedule.js recognizes completed
//                          campaigns by name. Without a prefix, a trial run with
//                          the same names would mark the real phase as done.
//   --hold <s>             hold time per run (default 60)
//   --settle <s>           settle time per run (default 10)
//   --connect-spread <s>   spread the client connects over s seconds
//                          (default 5, must be smaller than --settle,
//                          DECISIONS.md 5.10). storm always connects at once.
//   --warmup <n>           warm-up runs per configuration (default 5 for
//                          pilot/main, otherwise 1). storm has none, because the
//                          cell restarts before every run.
//   --sut <file>           JSON with the sut block for the two-machine setup
//   --seed <n>             seed of the random order in schedule.js
// Only pilot and main:
//   --comparisons <ids>    selection of comparisons from plan.json (default: all)
//   --control <cell>       cell of the daily control measurement (default node-minimal-sse)
//   --report-every <n>     pilot only, interim evaluation every n runs (default 10)
// Only scaling, saturation and storm:
//   --cells <names>        selection of cells (default: all)
// Only storm:
//   --clients <n>          number of clients that connect at once (default 500)
//
// Output: one file per campaign and a schedule.json for schedule.js.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const plan = JSON.parse(readFileSync(path.join(__dirname, 'plan.json'), 'utf-8'));
const cells = JSON.parse(readFileSync(path.join(__dirname, 'cells.json'), 'utf-8'));
const allCells = Object.keys(cells).filter((c) => !c.startsWith('_'));

const KINDS = ['pilot', 'main', 'scaling', 'saturation', 'storm'];
const [kind, ...rest] = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = rest.indexOf(`--${name}`);
  return i === -1 ? fallback : rest[i + 1];
};
const list = (s) => String(s).split(',').map((x) => x.trim()).filter(Boolean);
const fail = (msg) => {
  console.error(msg);
  process.exit(1);
};

if (!KINDS.includes(kind) || !opt('out')) {
  fail(`Aufruf: node tools/orchestrate/plan-campaigns.js <${KINDS.join('|')}> [Optionen] --out <verzeichnis>`);
}

const outDir = path.resolve(opt('out'));
mkdirSync(outDir, { recursive: true });
const prefix = opt('prefix', '');
const hold = Number(opt('hold', 60));
const settle = Number(opt('settle', 10));
// Spread connects are the default of all measurement phases (DECISIONS.md
// 5.10). The clients connect spread over the first half of the settle time,
// so that a steady state is reached before the measurement window.
const spread = Number(opt('connect-spread', 5));
if (!(spread >= 0 && spread < settle)) fail(`--connect-spread muss mindestens 0 und kleiner als --settle (${settle}) sein`);
const warmup = Number(opt('warmup', kind === 'pilot' || kind === 'main' ? 5 : 1));
const sut = opt('sut') ? JSON.parse(readFileSync(path.resolve(opt('sut')), 'utf-8')) : undefined;
const common = { warmupRuns: warmup, settleSeconds: settle, connectSpreadSeconds: spread, ...(sut ? { sut } : {}) };

const files = [];
// Campaign settings take precedence over the common ones (e.g. storm without spread).
function write(name, campaign) {
  const fullName = `${prefix}${name}`;
  const file = `${fullName}.json`;
  writeFileSync(path.join(outDir, file), `${JSON.stringify({ name: fullName, ...common, ...campaign }, null, 2)}\n`);
  files.push(file);
}

function selectedComparisons() {
  const ids = opt('comparisons') ? list(opt('comparisons')).map(Number) : plan.comparisons.map((c) => c.id);
  const unknown = ids.filter((id) => !plan.comparisons.some((c) => c.id === id));
  if (unknown.length) fail(`Unbekannte Vergleiche: ${unknown.join(', ')} (plan.json kennt 1–${plan.comparisons.length})`);
  return plan.comparisons.filter((c) => ids.includes(c.id));
}

function selectedCells() {
  const names = opt('cells') ? list(opt('cells')) : allCells;
  const unknown = names.filter((n) => !allCells.includes(n));
  if (unknown.length) fail(`Unbekannte Zellen: ${unknown.join(', ')}`);
  return names;
}

function runsPerScenario() {
  const runs = Object.fromEntries(list(opt('runs', '')).map((kv) => kv.split('=')).map(([k, v]) => [k, Number(v)]));
  for (const s of plan.scenarios) {
    if (!runs[s]) fail(`--runs braucht einen Wert für "${s}" (z. B. --runs baseline=90,medium=90,stress=90)`);
  }
  return runs;
}

// Daily control measurement with a fixed cell, fixed load and few runs.
// Shows drift over the weeks (DECISIONS.md 5.9).
function writeControl() {
  const controlCell = opt('control', 'node-minimal-sse');
  if (!allCells.includes(controlCell)) fail(`Unbekannte Kontrollzelle: ${controlCell}`);
  const name = `${prefix}control-${controlCell}`;
  writeFileSync(path.join(outDir, `${name}.json`), `${JSON.stringify({
    name,
    phase: 'control',
    configs: [controlCell],
    scenarios: [{ name: 'control', vus: 50, holdSeconds: hold, runsPerConfig: 6, eventRatePerSecond: 1 }],
    ...common,
    warmupRuns: 1,
  }, null, 2)}\n`);
  return { campaign: `${name}.json`, everyHours: 24 };
}

let control;
if (kind === 'pilot' || kind === 'main') {
  const runs = runsPerScenario();
  const block = Number(opt('block', 1));
  if (kind === 'main' && ![1, 2].includes(block)) fail('--block muss 1 oder 2 sein');
  const reportEvery = Number(opt('report-every', 10));
  for (const cmp of selectedComparisons()) {
    for (const s of plan.scenarios) {
      const load = plan.scenarioLoad[s];
      const id = `c${String(cmp.id).padStart(2, '0')}-${s}`;
      write(kind === 'main' ? `b${block}-${id}` : `pilot-${id}`, {
        phase: kind,
        ...(kind === 'main' ? { block } : { reportEvery }),
        configs: [cmp.a, cmp.b],
        scenarios: [{ name: s, vus: load.vus, holdSeconds: hold, runsPerConfig: runs[s] + warmup, eventRatePerSecond: load.eventRatePerSecond }],
      });
    }
  }
  control = writeControl();
} else if (kind === 'scaling') {
  const steps = list(opt('steps', '10,50,100,250,500,750,1000')).map(Number);
  const runs = Number(opt('runs', 3));
  for (const cell of selectedCells()) {
    write(`scaling-${cell}`, {
      phase: 'scaling',
      configs: [cell],
      scenarios: steps.map((vus) => ({ name: `clients-${String(vus).padStart(4, '0')}`, vus, holdSeconds: hold, runsPerConfig: runs + warmup, eventRatePerSecond: 1 })),
    });
  }
} else if (kind === 'storm') {
  // Storm (DECISIONS.md 5.10). The cell restarts before every run, then all
  // clients connect at the same moment, as after a server restart. Each cell
  // on its own, descriptive, without a hypothesis test.
  const clients = Number(opt('clients', 500));
  const runs = Number(opt('runs', 3));
  for (const cell of selectedCells()) {
    write(`storm-${cell}`, {
      phase: 'storm',
      configs: [cell],
      connectSpreadSeconds: 0,
      warmupRuns: 0,
      scenarios: [{ name: `storm-${String(clients).padStart(4, '0')}`, vus: clients, holdSeconds: hold, runsPerConfig: runs, eventRatePerSecond: 1 }],
    });
  }
} else {
  const clients = Number(opt('clients', 50));
  const rates = list(opt('rates', '10,50,100,200,500')).map(Number);
  const runs = Number(opt('runs', 6));
  for (const cell of selectedCells()) {
    write(`saturation-${cell}`, {
      phase: 'saturation',
      configs: [cell],
      scenarios: rates.map((rate) => ({ name: `rate-${String(rate).padStart(4, '0')}`, vus: clients, holdSeconds: hold, runsPerConfig: runs + warmup, eventRatePerSecond: rate })),
    });
  }
}

// Schedule name is the directory name with prefix, without duplication for
// e.g. --prefix smoke- --out campaigns/smoke.
const outBase = path.basename(outDir);
const schedule = {
  name: `${outBase}-`.startsWith(prefix) ? outBase : `${prefix}${outBase}`,
  seed: Number(opt('seed', 20261016)),
  shuffle: true,
  campaigns: files,
  ...(control ? { control } : {}),
};
writeFileSync(path.join(outDir, 'schedule.json'), `${JSON.stringify(schedule, null, 2)}\n`);
console.log(`${files.length} Kampagnen${control ? ' + Kontrollmessung' : ''} in ${outDir}`);
console.log(`Start: node tools/orchestrate/schedule.js ${path.join(opt('out'), 'schedule.json')}`);
