// Read-only. Block lengths from Block 1 by the proposed rule, residual block bootstrap, classification of the 128 tests.
// Usage: node 04-einordnung-block1.mjs <repo> <rows.json> <evaluation.json>
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [ROOT, ROWS, EVAL] = process.argv.slice(2);
const S = await import(pathToFileURL(path.join(ROOT, 'tools/orchestrate/stats.js')).href);
const plan = JSON.parse(readFileSync(path.join(ROOT, 'tools/orchestrate/plan.json'), 'utf-8'));
const rows = JSON.parse(readFileSync(ROWS, 'utf-8'));
const ev = JSON.parse(readFileSync(EVAL, 'utf-8'));
const MEASURES = ['latency_mean_ms', 'cpu_seconds_total', 'working_set_peak_bytes_total', 'connect_mean_ms'];
const RES = path.join(ROOT, 'results');
const crit = 2 / Math.sqrt(90);

const blockLen = {};
for (const m of MEASURES) {
  const b = rows.filter((r) => r.measure === m).map((r) => r.bDet).sort((x, y) => x - y);
  const q3 = S.percentile(b, 75);
  blockLen[m] = Math.max(1, Math.ceil(q3));
  console.log(m.padEnd(30), 'Q1', b[9].toFixed(2), 'Q2', S.percentile(b, 50).toFixed(2), 'Q3 exakt', q3.toFixed(3), 'Max', b[38].toFixed(2), '=> L', blockLen[m], '| Roh-b Q3', S.percentile(rows.filter((r) => r.measure === m).map((r) => r.bRaw).sort((x, y) => x - y), 75).toFixed(2));
}

const sig = new Map();
for (const f of ev.families) for (const t of f.tests) sig.set(`${t.comparison_id}|${t.scenario}|${f.measure}`, t);

const dirs = readdirSync(RES).filter((d) => /^[0-9T:\-Z]+_b1-c\d\d-(baseline|medium|stress)$/.test(d));
function med(a) {
  a.sort();
  const n = a.length;
  return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2;
}
const pct = (s, p) => s[Math.max(0, Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1))];
function linfit(x) {
  const n = x.length;
  const tb = (n - 1) / 2;
  const xb = x.reduce((a, b) => a + b, 0) / n;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (i - tb) ** 2;
    sxy += (i - tb) * (x[i] - xb);
  }
  const b = sxy / sxx;
  const fit = x.map((_, i) => xb + b * (i - tb));
  return { fit, res: x.map((v, i) => v - fit[i]) };
}
function resCBB(d, L, seed, R, alpha) {
  const { fit, res } = linfit(d);
  const n = d.length;
  const rng = S.createRng(seed);
  const meds = new Float64Array(R);
  const buf = new Float64Array(n);
  for (let r = 0; r < R; r++) {
    let k = 0;
    while (k < n) {
      const st = Math.floor(rng() * n);
      for (let j = 0; j < L && k < n; j++) {
        buf[k] = res[(st + j) % n] + fit[k];
        k++;
      }
    }
    meds[r] = med(buf);
  }
  meds.sort();
  return [pct(meds, (alpha / 2) * 100), pct(meds, (1 - alpha / 2) * 100)];
}
const out = [];
const shapes = {};
for (const d of dirs) {
  const mm = d.match(/_b1-c(\d\d)-(\w+)$/);
  const id = Number(mm[1]);
  const level = mm[2];
  const p = plan.comparisons.find((c) => c.id === id);
  const runs = {};
  for (const f of readdirSync(path.join(RES, d, 'runs'))) {
    if (!f.endsWith('.json') || f.startsWith('.')) continue;
    const r = JSON.parse(readFileSync(path.join(RES, d, 'runs', f), 'utf-8'));
    if (!r.run.warmup) (runs[r.run.config] ||= {})[r.run.run_index] = r.measures;
  }
  const idx = Object.keys(runs[p.a]).map(Number).sort((x, y) => x - y);
  for (const m of MEASURES) {
    const dd = idx.map((i) => runs[p.a][i][m] - runs[p.b][i][m]);
    const row = rows.find((r) => r.id === id && r.level === level && r.measure === m);
    const seed = 20261109 + id * 1000 + plan.scenarios.indexOf(level) * 10 + MEASURES.indexOf(m);
    const L = blockLen[m];
    const ci95 = resCBB(dd, L, seed, 10000, 0.05);
    const ciH = resCBB(dd, L, seed + 1, 40000, 0.05 / 39);
    const t = sig.get(`${id}|${level}|${m}`);
    out.push({ id, level, m, L, ci95, ciH, sigW: t.significant, md: t.result.median_diff, iid: row.iid, r1: row.r1, r1Det: row.r1Det, r2: row.r2, tTrend: row.tTrend, drift: row.totalDrift });
    if (m.includes('bytes') && ((id === 1 && level === 'baseline') || (id === 13 && level === 'baseline') || (id === 2 && level === 'medium') || (id === 12 && level === 'medium'))) {
      const seg = [];
      for (let i = 0; i < 90; i += 10) seg.push((dd.slice(i, i + 10).reduce((a, b) => a + b, 0) / 10 / 2 ** 20).toFixed(1));
      shapes[`${id}|${level}`] = seg.join(' ');
    }
  }
}
const ex = (c) => c[0] > 0 || c[1] < 0;
console.log('\nKlassifikation je Familie, signifikant nach Holm');
let total = { sig: 0, none: 0, trend: 0, dep: 0, lostH: 0, lost95: 0 };
const lost = [];
for (const m of MEASURES) {
  const r = out.filter((x) => x.m === m);
  const s = r.filter((x) => x.sigW);
  const dep = s.filter((x) => x.r1Det > crit);
  const trend = s.filter((x) => x.r1Det <= crit && x.r1 > crit);
  const none = s.filter((x) => x.r1 <= crit && x.r1Det <= crit);
  const notH = s.filter((x) => !ex(x.ciH));
  const not95 = s.filter((x) => !ex(x.ci95));
  const widths = r.filter((x) => x.iid[1] > x.iid[0]).map((x) => (x.ci95[1] - x.ci95[0]) / (x.iid[1] - x.iid[0])).sort((a, b) => a - b);
  console.log(m.padEnd(30), `L=${r[0].L} signifikant ${s.length} | ohne Hinweis ${none.length} | nur Trend ${trend.length} | Abhaengigkeit nach Trendentfernung ${dep.length} | 95-KI schliesst 0 ein ${not95.length} | Niveau 1-a/39 schliesst 0 ein ${notH.length} | Breite gegen iid Q1/Med/Q3/Max ${S.percentile(widths, 25).toFixed(2)}/${S.percentile(widths, 50).toFixed(2)}/${S.percentile(widths, 75).toFixed(2)}/${widths[widths.length - 1].toFixed(2)} | nicht signifikant, aber Niveau-KI schliesst 0 aus ${r.filter((x) => !x.sigW && ex(x.ciH)).length}`);
  total.sig += s.length; total.none += none.length; total.trend += trend.length; total.dep += dep.length; total.lostH += notH.length; total.lost95 += not95.length;
  for (const x of notH) lost.push(`${m} c${x.id} ${x.level} md ${x.md.toFixed(4)} KI95 [${x.ci95.map((v) => v.toFixed(4))}] KIH [${x.ciH.map((v) => v.toFixed(4))}] r1 ${x.r1.toFixed(2)} det ${x.r1Det.toFixed(2)}`);
}
console.log(total);
console.log('Signifikant, aber Niveau-KI schliesst 0 ein:');
for (const l of lost) console.log(' ', l);
console.log('Formen', shapes);
const wsD = out.filter((x) => x.m.includes('bytes'));
console.log('WS Drift |MiB| Median/Max', S.percentile(wsD.map((x) => Math.abs(x.drift) / 2 ** 20).sort((a, b) => a - b), 50).toFixed(1), Math.max(...wsD.map((x) => Math.abs(x.drift) / 2 ** 20)).toFixed(1));
