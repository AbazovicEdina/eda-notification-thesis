#!/usr/bin/env node
// Gesamtauswertung über alle Hauptkampagnen (DECISIONS.md 5.8, 5.15).
//
// Liest die aggregate.json mehrerer Kampagnen-Verzeichnisse, ordnet jedes
// Ergebnis einem der vorab geplanten Vergleiche aus plan.json zu und wendet
// die Holm-Korrektur je Familie (eine Familie pro Messgröße) über ALLE
// geplanten Tests an — unabhängig davon, in wie vielen Kampagnen sie
// gemessen wurden (paarweise Kampagnen, DECISIONS.md 5.6.3). Geplante, aber
// fehlende Tests gehen mit p = 1 in die Korrektur ein; so wird die Korrektur
// durch Weglassen nicht milder.
//
// Aufruf: node tools/orchestrate/evaluate.js <kampagnen-verzeichnis>... [--include-aborted]
// Ergebnis: results/<zeitstempel>_evaluation/evaluation.json und evaluation.md

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { holmCorrection } from './stats.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const RESULTS_DIR = path.join(REPO_ROOT, 'results');

const args = process.argv.slice(2);
const includeAborted = args.includes('--include-aborted');
const dirs = args.filter((a) => !a.startsWith('--'));
if (dirs.length === 0) {
  console.error('Aufruf: node tools/orchestrate/evaluate.js <kampagnen-verzeichnis>... [--include-aborted]');
  process.exit(1);
}

const plan = JSON.parse(readFileSync(path.join(__dirname, 'plan.json'), 'utf-8'));
const notes = [];

// Ergebnis eines Kampagnen-Vergleichs in Planrichtung (a = plan.a) bringen.
function oriented(result, flipped) {
  if (!flipped || !result.wilcoxon) return result;
  const [lo, hi] = result.median_diff_ci95;
  return {
    ...result,
    wilcoxon: { ...result.wilcoxon, w_plus: result.wilcoxon.w_minus, w_minus: result.wilcoxon.w_plus },
    cliffs_delta: -result.cliffs_delta,
    rank_biserial: -result.rank_biserial,
    median_diff: result.median_diff == null ? null : -result.median_diff,
    median_diff_ci95: [hi == null ? null : -hi, lo == null ? null : -lo],
    pairs: { ...result.pairs, a: result.pairs.b, b: result.pairs.a },
  };
}

// Kampagnen laden
const campaigns = [];
for (const dir of dirs) {
  const file = path.join(path.resolve(dir), 'aggregate.json');
  if (!existsSync(file)) {
    notes.push(`${dir}: keine aggregate.json — übersprungen`);
    continue;
  }
  const agg = JSON.parse(readFileSync(file, 'utf-8'));
  if (agg.phase !== 'main') {
    notes.push(`${agg.campaign_dir}: Phase "${agg.phase}" — nicht Teil der konfirmatorischen Auswertung`);
    continue;
  }
  if (agg.aborted && !includeAborted) {
    notes.push(`${agg.campaign_dir}: abgebrochen (${agg.abort_reason}) — übersprungen (--include-aborted zum Einbeziehen)`);
    continue;
  }
  campaigns.push(agg);
}

// Gemessene Vergleiche den geplanten zuordnen
const found = new Map(); // key: `${planId}|${scenario}` -> { campaign, entry, flipped }
const duplicates = [];
for (const agg of campaigns) {
  for (const [scenarioName, scenario] of Object.entries(agg.scenarios)) {
    if (scenario.incomplete) continue;
    for (const entry of scenario.comparisons) {
      const p = plan.comparisons.find((c) =>
        (c.a === entry.cell_a && c.b === entry.cell_b) || (c.a === entry.cell_b && c.b === entry.cell_a));
      if (!p) {
        notes.push(`${agg.campaign_dir}: Vergleich ${entry.cell_a} vs. ${entry.cell_b} ist nicht geplant — nicht in der Holm-Familie`);
        continue;
      }
      const key = `${p.id}|${scenarioName}`;
      if (found.has(key)) duplicates.push(`${key}: ${found.get(key).campaign.campaign_dir} und ${agg.campaign_dir}`);
      found.set(key, { campaign: agg, entry, flipped: p.a !== entry.cell_a });
    }
  }
}
if (duplicates.length) {
  console.error('Mehrfach gemessene Vergleiche — eindeutig festlegen, welche Kampagne zählt:');
  for (const d of duplicates) console.error(`  ${d}`);
  process.exit(1);
}

// Familien bilden und korrigieren
const families = plan.families.map((family) => {
  const tests = [];
  for (const cmp of plan.comparisons) {
    for (const scenarioName of plan.scenarios) {
      const hit = found.get(`${cmp.id}|${scenarioName}`);
      const raw = hit?.entry.measures?.[family.measure];
      const result = raw?.wilcoxon ? oriented(raw, hit.flipped) : null;
      tests.push({
        comparison_id: cmp.id,
        question: cmp.question,
        a: cmp.a,
        b: cmp.b,
        scenario: scenarioName,
        campaign: hit?.campaign.campaign_dir ?? null,
        status: result ? (result.conclusive ? 'gemessen' : 'nicht aussagekräftig') : 'fehlt',
        pValue: result ? result.wilcoxon.p : 1,
        result,
      });
    }
  }
  const corrected = holmCorrection(tests, plan.alpha);
  return { ...family, alpha: plan.alpha, m: tests.length, tests: corrected };
});

// Deskriptive Übersicht je Zelle und Laststufe. Eine Zelle, die in zwei
// Kampagnen vorkommt, erscheint zweimal (je Kampagne getrennt), da die
// Werte aus unterschiedlichen Messzeiträumen stammen.
const descriptives = [];
for (const agg of campaigns) {
  for (const [scenarioName, scenario] of Object.entries(agg.scenarios)) {
    for (const [configName, c] of Object.entries(scenario.configs)) {
      descriptives.push({ campaign: agg.campaign_dir, scenario: scenarioName, config: configName, cell: c.cell, runs_valid: c.runs_valid, runs_measured: c.runs_measured, describe: c.describe });
    }
  }
}

const generatedAt = new Date();
const outDir = path.join(RESULTS_DIR, `${generatedAt.toISOString().replace(/[:.]/g, '-')}_evaluation`);
mkdirSync(outDir, { recursive: true });
const evaluation = {
  schema: 'eda-thesis/evaluation/1',
  generated_at: generatedAt.toISOString(),
  plan,
  campaigns: campaigns.map((c) => ({ dir: c.campaign_dir, name: c.name, aborted: c.aborted, git: c.context?.git, sut_host: c.context?.sut_host?.model ?? null })),
  notes,
  families,
  descriptives,
};
writeFileSync(path.join(outDir, 'evaluation.json'), JSON.stringify(evaluation, null, 2));

// Markdown-Tabellen für die schriftliche Arbeit
// Deutsche Schreibweise (Dezimalkomma) für die Übernahme in die Arbeit.
const fmt = (v, digits = 3) => (v == null || Number.isNaN(v) ? '–' : Number(v).toFixed(digits).replace('.', ','));
const fmtP = (v) => (v == null ? '–' : v < 0.001 ? '< 0,001' : fmt(v));
const lines = [
  '# Gesamtauswertung',
  '',
  `Erzeugt: ${generatedAt.toISOString()} · Signifikanzniveau α = ${fmt(plan.alpha, 2)} · Holm-Korrektur je Familie über alle geplanten Tests`,
  '',
  'Vorzeichen: Differenz = A − B. Negative Werte bedeuten, dass A kleiner (bei Latenz, CPU und Speicher: besser) ist.',
  '',
];
for (const family of families) {
  lines.push(`## ${family.measure} (${family.role}, m = ${family.m})`, '', family.description, '');
  lines.push('| Nr. | A vs. B | Laststufe | Paare | Median-Diff [95-%-KI] | Cliff\'s δ | r (rangbiserial) | p | p (Holm) | signifikant | Status |');
  lines.push('|---|---|---|---|---|---|---|---|---|---|---|');
  for (const t of family.tests) {
    const r = t.result;
    lines.push(`| ${t.comparison_id} | ${t.a} vs. ${t.b} | ${t.scenario} | ${r?.n_pairs ?? '–'} | `
      + `${r ? `${fmt(r.median_diff)} [${fmt(r.median_diff_ci95[0])}; ${fmt(r.median_diff_ci95[1])}]` : '–'} | `
      + `${r ? `${fmt(r.cliffs_delta)} (${r.cliffs_magnitude})` : '–'} | ${r ? fmt(r.rank_biserial) : '–'} | `
      + `${r ? fmtP(t.pValue) : '–'} | ${fmtP(t.pHolm)} | ${t.significant ? 'ja' : 'nein'} | ${t.status} |`);
  }
  lines.push('');
}
if (notes.length) {
  lines.push('## Hinweise', '', ...notes.map((n) => `- ${n}`), '');
}
writeFileSync(path.join(outDir, 'evaluation.md'), lines.join('\n'));

console.log(`Gesamtauswertung: ${path.relative(REPO_ROOT, outDir)}`);
for (const family of families) {
  const measured = family.tests.filter((t) => t.status !== 'fehlt').length;
  const significant = family.tests.filter((t) => t.significant).length;
  console.log(`  ${family.measure}: ${measured}/${family.m} Tests gemessen, ${significant} signifikant nach Holm`);
}
for (const n of notes) console.log(`  Hinweis: ${n}`);
