#!/usr/bin/env node
// Erzeugt die Kampagnendateien einer Messphase aus plan.json und cells.json
// (DECISIONS.md 5.9), damit keine Kampagne von Hand abgeschrieben werden
// muss. Jede Kampagne umfasst genau eine Laststufe: Bricht der Dauerbetrieb
// ab, geht höchstens eine Laststufe verloren, und schedule.js setzt an der
// nächsten fort.
//
// Aufrufe:
//   node tools/orchestrate/plan-campaigns.js main --block 1 --runs baseline=80,medium=60,stress=40 --out campaigns/block1
//   node tools/orchestrate/plan-campaigns.js scaling --steps 10,50,100,250,500,750,1000 --runs 3 --out campaigns/scaling
//   node tools/orchestrate/plan-campaigns.js saturation --clients 50 --rates 10,50,100,200,500 --runs 6 --out campaigns/saturation
// Gemeinsame Optionen:
//   --hold <s>        Haltezeit je Lauf (Standard 60)
//   --settle <s>      Einschwingzeit je Lauf (Standard 10)
//   --warmup <n>      Warm-up-Läufe je Konfiguration (Standard: main 5, sonst 1)
//   --sut <datei>     JSON mit dem sut-Block für den Zwei-Rechner-Aufbau
//   --control <cell>  Zelle der täglichen Kontrollmessung (Standard node-minimal-sse; nur main)
//
// Ergebnis: eine Datei je Kampagne und eine schedule.json für schedule.js.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const plan = JSON.parse(readFileSync(path.join(__dirname, 'plan.json'), 'utf-8'));
const cells = JSON.parse(readFileSync(path.join(__dirname, 'cells.json'), 'utf-8'));
const cellNames = Object.keys(cells).filter((c) => !c.startsWith('_'));

const [kind, ...rest] = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = rest.indexOf(`--${name}`);
  return i === -1 ? fallback : rest[i + 1];
};
const list = (s) => String(s).split(',').map((x) => x.trim()).filter(Boolean);

if (!['main', 'scaling', 'saturation'].includes(kind) || !opt('out')) {
  console.error('Aufruf: node tools/orchestrate/plan-campaigns.js <main|scaling|saturation> [Optionen] --out <verzeichnis>');
  process.exit(1);
}

const outDir = path.resolve(opt('out'));
mkdirSync(outDir, { recursive: true });
const hold = Number(opt('hold', 60));
const settle = Number(opt('settle', 10));
const warmup = Number(opt('warmup', kind === 'main' ? 5 : 1));
const sut = opt('sut') ? JSON.parse(readFileSync(path.resolve(opt('sut')), 'utf-8')) : undefined;
const common = { warmupRuns: warmup, settleSeconds: settle, ...(sut ? { sut } : {}) };

const files = [];
function write(name, campaign) {
  const file = `${name}.json`;
  writeFileSync(path.join(outDir, file), `${JSON.stringify({ name, ...campaign, ...common }, null, 2)}\n`);
  files.push(file);
}

let control;
if (kind === 'main') {
  const block = Number(opt('block', 1));
  const runs = Object.fromEntries(list(opt('runs', '')).map((kv) => kv.split('=')).map(([k, v]) => [k, Number(v)]));
  for (const s of plan.scenarios) {
    if (!runs[s]) throw new Error(`--runs braucht einen Wert für "${s}"`);
  }
  for (const cmp of plan.comparisons) {
    for (const s of plan.scenarios) {
      const load = plan.scenarioLoad[s];
      write(`b${block}-c${String(cmp.id).padStart(2, '0')}-${s}`, {
        phase: 'main',
        block,
        configs: [cmp.a, cmp.b],
        scenarios: [{ name: s, vus: load.vus, holdSeconds: hold, runsPerConfig: runs[s] + warmup, eventRatePerSecond: load.eventRatePerSecond }],
      });
    }
  }
  // Tägliche Kontrollmessung: feste Zelle, feste Last, wenige Läufe — zeigt
  // Drift über die Wochen (DECISIONS.md 5.9).
  const controlCell = opt('control', 'node-minimal-sse');
  const controlName = `control-${controlCell}`;
  writeFileSync(path.join(outDir, `${controlName}.json`), `${JSON.stringify({
    name: controlName,
    phase: 'control',
    configs: [controlCell],
    scenarios: [{ name: 'control', vus: 50, holdSeconds: hold, runsPerConfig: 6, eventRatePerSecond: 1 }],
    ...common,
    warmupRuns: 1,
  }, null, 2)}\n`);
  control = { campaign: `${controlName}.json`, everyHours: 24 };
} else if (kind === 'scaling') {
  const steps = list(opt('steps', '10,50,100,250,500,750,1000')).map(Number);
  const runs = Number(opt('runs', 3));
  for (const cell of cellNames) {
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
  for (const cell of cellNames) {
    write(`saturation-${cell}`, {
      phase: 'saturation',
      configs: [cell],
      scenarios: rates.map((rate) => ({ name: `rate-${String(rate).padStart(4, '0')}`, vus: clients, holdSeconds: hold, runsPerConfig: runs + warmup, eventRatePerSecond: rate })),
    });
  }
}

const schedule = { name: path.basename(outDir), seed: Number(opt('seed', 20261016)), shuffle: true, campaigns: files, ...(control ? { control } : {}) };
writeFileSync(path.join(outDir, 'schedule.json'), `${JSON.stringify(schedule, null, 2)}\n`);
console.log(`${files.length} Kampagnen${control ? ' + Kontrollmessung' : ''} in ${outDir}`);
console.log(`Start: node tools/orchestrate/schedule.js ${path.join(opt('out'), 'schedule.json')}`);
