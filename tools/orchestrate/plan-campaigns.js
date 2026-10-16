#!/usr/bin/env node
// Erzeugt die Kampagnendateien einer Messphase aus plan.json und cells.json
// (DECISIONS.md 5.9), damit keine Kampagne von Hand abgeschrieben werden
// muss. Jede Kampagne umfasst genau eine Laststufe: Bricht der Dauerbetrieb
// ab, geht höchstens eine Laststufe verloren, und schedule.js setzt an der
// nächsten fort.
//
// Aufrufe:
//   node tools/orchestrate/plan-campaigns.js pilot --runs baseline=100,medium=60,stress=40 --comparisons 1,4,7,10 --out campaigns/pilot
//   node tools/orchestrate/plan-campaigns.js main --block 1 --runs baseline=80,medium=60,stress=40 --out campaigns/block1
//   node tools/orchestrate/plan-campaigns.js scaling --steps 10,50,100,250,500,750,1000 --runs 3 --out campaigns/scaling
//   node tools/orchestrate/plan-campaigns.js saturation --clients 50 --rates 10,50,100,200,500 --runs 6 --out campaigns/saturation
// Gemeinsame Optionen:
//   --prefix <text>        Präfix aller Kampagnennamen, z. B. "smoke-" für einen
//                          Probelauf. schedule.js erkennt erledigte Kampagnen am
//                          Namen; ohne Präfix würde ein Probelauf mit denselben
//                          Namen die echte Phase als erledigt markieren.
//   --hold <s>             Haltezeit je Lauf (Standard 60)
//   --settle <s>           Einschwingzeit je Lauf (Standard 10)
//   --warmup <n>           Warm-up-Läufe je Konfiguration (Standard: pilot/main 5, sonst 1)
//   --sut <datei>          JSON mit dem sut-Block für den Zwei-Rechner-Aufbau
//   --seed <n>             Startwert der zufälligen Reihenfolge in schedule.js
// Nur pilot und main:
//   --comparisons <ids>    Auswahl der Vergleiche aus plan.json (Standard: alle)
//   --control <zelle>      Zelle der täglichen Kontrollmessung (Standard node-minimal-sse)
//   --report-every <n>     nur pilot: Zwischenauswertung alle n Läufe (Standard 10)
// Nur scaling und saturation:
//   --cells <namen>        Auswahl der Zellen (Standard: alle)
//
// Ergebnis: eine Datei je Kampagne und eine schedule.json für schedule.js.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const plan = JSON.parse(readFileSync(path.join(__dirname, 'plan.json'), 'utf-8'));
const cells = JSON.parse(readFileSync(path.join(__dirname, 'cells.json'), 'utf-8'));
const allCells = Object.keys(cells).filter((c) => !c.startsWith('_'));

const KINDS = ['pilot', 'main', 'scaling', 'saturation'];
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
const warmup = Number(opt('warmup', kind === 'pilot' || kind === 'main' ? 5 : 1));
const sut = opt('sut') ? JSON.parse(readFileSync(path.resolve(opt('sut')), 'utf-8')) : undefined;
const common = { warmupRuns: warmup, settleSeconds: settle, ...(sut ? { sut } : {}) };

const files = [];
function write(name, campaign) {
  const fullName = `${prefix}${name}`;
  const file = `${fullName}.json`;
  writeFileSync(path.join(outDir, file), `${JSON.stringify({ name: fullName, ...campaign, ...common }, null, 2)}\n`);
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
    if (!runs[s]) fail(`--runs braucht einen Wert für "${s}" (z. B. --runs baseline=80,medium=60,stress=40)`);
  }
  return runs;
}

// Tägliche Kontrollmessung: feste Zelle, feste Last, wenige Läufe — zeigt
// Drift über die Wochen (DECISIONS.md 5.9).
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

// Zeitplanname: Verzeichnisname mit Präfix, ohne Doppelung bei z. B.
// --prefix smoke- --out campaigns/smoke.
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
