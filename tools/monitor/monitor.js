#!/usr/bin/env node
// Manuelle Beobachtung von CPU und Speicher per `docker stats` (CSV).
// Für Messungen erfasst tools/resource-sampler die Ressourcen pro Lauf
// exakter und mit geringerer Eigenlast (DECISIONS.md 5.16). Läuft direkt
// mit Node, weil es die Docker-CLI aufruft (Ausnahme vom Grundsatz
// "alles in Docker", DECISIONS.md Abschnitt 2).
//
// Aufruf:
//   node monitor.js <container1,container2,...> [--interval-ms=1000] [--out=path.csv]
//
// Beispiel (während eines node-minimal-Testlaufs mitlaufen lassen):
//   node tools/monitor/monitor.js eda-thesis-node-minimal-sse-1
//
// Läuft bis Strg-C (SIGINT) oder bis der überwachte Container nicht mehr
// existiert. Schreibt eine CSV-Zeile pro Container und Intervall nach
// results/ — Zeitstempel im Dateinamen, wird nie überschrieben.

import { spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = path.join(path.resolve(__dirname, '..', '..'), 'results');

const args = process.argv.slice(2);
const containersArg = args.find((a) => !a.startsWith('--'));
if (!containersArg) {
  console.error('Aufruf: node monitor.js <container1,container2,...> [--interval-ms=1000] [--out=path.csv]');
  process.exit(1);
}
const containers = containersArg.split(',').map((c) => c.trim());

const intervalArg = args.find((a) => a.startsWith('--interval-ms='));
const intervalMs = intervalArg ? Number(intervalArg.split('=')[1]) : 1000;

const outArg = args.find((a) => a.startsWith('--out='));
mkdirSync(RESULTS_DIR, { recursive: true });
const outPath = outArg
  ? path.resolve(outArg.split('=')[1])
  : path.join(RESULTS_DIR, `${new Date().toISOString().replace(/[:.]/g, '-')}_resource-usage.csv`);

const HEADER = 'timestamp,container,cpu_percent,mem_usage,mem_limit,mem_percent,net_io,block_io\n';
if (!existsSync(outPath)) {
  writeFileSync(outPath, HEADER);
}

function parsePercent(s) {
  return Number(String(s).replace('%', ''));
}

function sampleOnce() {
  const timestamp = new Date().toISOString();
  const { status, stdout } = spawnSync(
    'docker',
    ['stats', '--no-stream', '--format', '{{json .}}', ...containers],
    { encoding: 'utf-8' }
  );
  if (status !== 0) return false;

  const lines = stdout.trim().split('\n').filter(Boolean);
  for (const line of lines) {
    const row = JSON.parse(line);
    const [memUsage, memLimit] = row.MemUsage.split(' / ').map((s) => s.trim());
    const csvLine = [
      timestamp,
      row.Name,
      parsePercent(row.CPUPerc),
      memUsage,
      memLimit,
      parsePercent(row.MemPerc),
      `"${row.NetIO}"`,
      `"${row.BlockIO}"`,
    ].join(',');
    appendFileSync(outPath, csvLine + '\n');
  }
  return true;
}

console.log(`Überwache [${containers.join(', ')}] mindestens alle ${intervalMs}ms -> ${outPath}`);
console.log('(docker stats --no-stream braucht selbst ~1-3s pro Aufruf; das ist der reale Mindestabstand.)');
console.log('Strg-C zum Beenden.');

let stop = false;
process.on('SIGINT', () => { stop = true; });
process.on('SIGTERM', () => { stop = true; });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  while (!stop) {
    const ok = sampleOnce();
    if (!ok) {
      console.error('Container nicht (mehr) erreichbar, beende Monitoring.');
      break;
    }
    await sleep(intervalMs);
  }
  console.log(`Beendet. Ergebnis: ${outPath}`);
}

main();
