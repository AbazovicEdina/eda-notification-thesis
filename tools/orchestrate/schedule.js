#!/usr/bin/env node
// Führt eine Liste von Kampagnen unbeaufsichtigt nacheinander aus
// (DECISIONS.md 5.9, 5.14):
//   - Reihenfolge zufällig, aber reproduzierbar (fester Startwert), damit
//     Zeit-Drift nicht systematisch bestimmte Vergleiche trifft;
//   - tägliche Kontrollmessung: vor einer Kampagne, wenn die letzte
//     vollständige Kontrollmessung älter als everyHours ist;
//   - Fortsetzen nach Abbruch: Kampagnen mit vollständiger, nicht
//     abgebrochener aggregate.json gleichen Namens werden übersprungen;
//   - optionale Benachrichtigung (NOTIFY_URL, notify.js) bei abgebrochenen
//     Kampagnen und am Ende des Zeitplans.
//
// Aufruf: node tools/orchestrate/schedule.js <schedule.json>
// schedule.json (erzeugt von plan-campaigns.js):
//   { "name", "seed", "shuffle", "campaigns": [Dateien relativ zur
//     schedule.json], "control": { "campaign", "everyHours" } }

import { spawn } from 'node:child_process';
import { readFileSync, readdirSync, existsSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRng } from './stats.js';
import { notify } from './notify.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const RESULTS_DIR = path.join(REPO_ROOT, 'results');

const schedulePath = process.argv[2];
if (!schedulePath) {
  console.error('Aufruf: node tools/orchestrate/schedule.js <schedule.json>');
  process.exit(1);
}
const scheduleDir = path.dirname(path.resolve(schedulePath));
const schedule = JSON.parse(readFileSync(path.resolve(schedulePath), 'utf-8'));
const logFile = path.join(RESULTS_DIR, `${new Date().toISOString().replace(/[:.]/g, '-')}_schedule_${schedule.name}.jsonl`);
const log = (event, data = {}) => {
  appendFileSync(logFile, `${JSON.stringify({ t: new Date().toISOString(), event, ...data })}\n`);
};

// Vollständige (nicht abgebrochene) Kampagnen je Name, mit Endzeitpunkt.
function completedCampaigns() {
  const done = new Map();
  if (!existsSync(RESULTS_DIR)) return done;
  for (const dir of readdirSync(RESULTS_DIR, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const file = path.join(RESULTS_DIR, dir.name, 'aggregate.json');
    if (!existsSync(file)) continue;
    try {
      const agg = JSON.parse(readFileSync(file, 'utf-8'));
      if (agg.aborted || !agg.finished_at) continue;
      const prev = done.get(agg.name);
      if (!prev || prev < agg.finished_at) done.set(agg.name, agg.finished_at);
    } catch { /* unvollständige Datei, ignorieren */ }
  }
  return done;
}

function shuffled(items, seed) {
  const rng = createRng(seed);
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Strg-C erreicht im Terminal auch die laufende Kampagne (gleiche
// Prozessgruppe); sie endet nach ihrem laufenden Lauf, der Zeitplan danach.
let interrupted = false;
let current = null;
const stop = () => {
  interrupted = true;
  console.log('\nZeitplan endet nach der laufenden Kampagne.');
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

function runCampaign(file) {
  return new Promise((resolve) => {
    current = spawn(process.execPath, [path.join(__dirname, 'run.js'), file], { cwd: REPO_ROOT, stdio: 'inherit' });
    current.on('close', (code) => {
      current = null;
      resolve(code);
    });
  });
}

const campaignName = (file) => JSON.parse(readFileSync(file, 'utf-8')).name;

async function main() {
  const files = schedule.campaigns.map((f) => path.resolve(scheduleDir, f));
  const order = schedule.shuffle ? shuffled(files, schedule.seed ?? 1) : files;
  const controlFile = schedule.control ? path.resolve(scheduleDir, schedule.control.campaign) : null;
  const controlName = controlFile ? campaignName(controlFile) : null;
  log('schedule_started', { name: schedule.name, seed: schedule.seed, order: order.map((f) => path.basename(f)) });

  for (const file of order) {
    if (interrupted) break;
    const name = campaignName(file);
    if (completedCampaigns().has(name)) {
      log('campaign_skipped', { campaign: name, reason: 'bereits vollständig' });
      continue;
    }
    if (controlFile) {
      const last = completedCampaigns().get(controlName);
      const ageHours = last ? (Date.now() - Date.parse(last)) / 3.6e6 : Infinity;
      if (ageHours >= schedule.control.everyHours) {
        log('control_started', { campaign: controlName, last });
        const code = await runCampaign(controlFile);
        log('control_finished', { campaign: controlName, exit_code: code });
        if (code !== 0) await notify(`EDA: Kontrollmessung abgebrochen`, `${controlName} endete mit Code ${code} (Zeitplan ${schedule.name}).`);
        if (interrupted) break;
      }
    }
    log('campaign_started', { campaign: name });
    const code = await runCampaign(file);
    log('campaign_finished', { campaign: name, exit_code: code });
    if (code !== 0) {
      console.log(`Kampagne ${name} endete mit Code ${code}; der Zeitplan fährt fort (erneuter Start wiederholt sie).`);
      await notify('EDA: Kampagne abgebrochen', `${name} endete mit Code ${code}. Zeitplan ${schedule.name} läuft weiter; Details in results/*_${name}/campaign.log.jsonl.`);
    }
  }

  const done = completedCampaigns();
  const open = order.map(campaignName).filter((n) => !done.has(n));
  log('schedule_finished', { interrupted, open });
  await notify(
    open.length ? 'EDA: Zeitplan beendet, Kampagnen offen' : 'EDA: Zeitplan vollständig',
    open.length ? `${schedule.name}: ${open.length} Kampagne(n) offen${interrupted ? ' (abgebrochen)' : ''}.` : `${schedule.name}: alle ${order.length} Kampagnen vollständig.`
  );
  console.log(open.length
    ? `\nOffen: ${open.length} Kampagne(n) — erneuter Aufruf setzt dort fort: ${open.join(', ')}`
    : '\nAlle Kampagnen des Zeitplans sind vollständig.');
  console.log(`Protokoll: ${path.relative(REPO_ROOT, logFile)}`);
  process.exit(open.length ? 2 : 0);
}

main();
