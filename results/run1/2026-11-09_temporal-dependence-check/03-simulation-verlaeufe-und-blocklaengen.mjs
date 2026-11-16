// Read-only. Nonlinear paths, false alarm rate of the diagnostic, block length sensitivity for the working set, flags per hypothesis.
// Usage: node 03-simulation-verlaeufe-und-blocklaengen.mjs <repo> <rows.json>
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [ROOT, ROWS] = process.argv.slice(2);
const S = await import(pathToFileURL(path.join(ROOT, 'tools/orchestrate/stats.js')).href);
const plan = JSON.parse(readFileSync(path.join(ROOT, 'tools/orchestrate/plan.json'), 'utf-8'));
const rows = JSON.parse(readFileSync(ROWS, 'utf-8'));
const N = 90;
const SIMS = 1200;
const B = 799;
const crit = 2 / Math.sqrt(90);

function med(a) {
  a.sort();
  const n = a.length;
  return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2;
}
const pct = (s, p) => s[Math.max(0, Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1))];
function linfit(x) {
  const n = x.length;
  const tb = (n - 1) / 2;
  let xb = 0;
  for (const v of x) xb += v;
  xb /= n;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (i - tb) ** 2;
    sxy += (i - tb) * (x[i] - xb);
  }
  const b = sxy / sxx;
  const fit = Array.from(x, (_, i) => xb + b * (i - tb));
  return { fit, res: Array.from(x, (v, i) => v - fit[i]) };
}
function cbb(d, L, rng, R, add) {
  const n = d.length;
  const meds = new Float64Array(R);
  const buf = new Float64Array(n);
  for (let r = 0; r < R; r++) {
    let k = 0;
    while (k < n) {
      const st = Math.floor(rng() * n);
      for (let j = 0; j < L && k < n; j++) {
        buf[k] = d[(st + j) % n] + (add ? add[k] : 0);
        k++;
      }
    }
    meds[r] = med(buf);
  }
  meds.sort();
  return [pct(meds, 2.5), pct(meds, 97.5)];
}
const resCI = (d, L, rng, R) => { const f = linfit(d); return cbb(f.res, L, rng, R, f.fit); };
const makeNormal = (rng) => () => Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());
function ar(rng, rho) {
  const z = makeNormal(rng);
  const x = new Array(N);
  x[0] = z();
  const s = Math.sqrt(1 - rho * rho);
  for (let i = 1; i < N; i++) x[i] = rho * x[i - 1] + s * z();
  return x;
}
function scaled(shape, r2) {
  const m = shape.reduce((a, b) => a + b, 0) / N;
  const v = shape.reduce((a, b) => a + (b - m) ** 2, 0) / N;
  const k = Math.sqrt((r2 / (1 - r2)) / v);
  return shape.map((x) => k * (x - m));
}
const SHAPES = {
  'linear': Array.from({ length: N }, (_, i) => i),
  'Plateau ab Lauf 50': Array.from({ length: N }, (_, i) => Math.min(i, 50)),
  'Plateau ab Lauf 11': Array.from({ length: N }, (_, i) => Math.min(i, 11)),
  'zwei Stufen': Array.from({ length: N }, (_, i) => (i < 30 ? 0 : i < 60 ? 1 : 1.5)),
};
const LS = [5, 8, 13, 20];
console.log('Abdeckung des erwarteten Medians, feste Verlaeufe');
for (const [nm, shape] of Object.entries(SHAPES)) {
  for (const [rho, r2] of [[0.45, 0.7], [0.8, 0.9]]) {
    const pathv = scaled(shape, r2);
    const rng = S.createRng(1234 + Math.round(rho * 100));
    let tSum = 0;
    const TM = 20000;
    for (let i = 0; i < TM; i++) {
      const e = ar(rng, rho);
      tSum += med(Float64Array.from(e, (v, t) => v + pathv[t]));
    }
    const theta = tSum / TM;
    const cov = { iid: 0 };
    const wid = { iid: 0 };
    for (const L of LS) { cov[L] = 0; wid[L] = 0; }
    for (let s = 0; s < SIMS; s++) {
      const e = ar(rng, rho);
      const d = Float64Array.from(e, (v, t) => v + pathv[t]);
      const ci0 = cbb(d, 1, rng, B, null);
      if (ci0[0] <= theta && theta <= ci0[1]) cov.iid++;
      wid.iid += ci0[1] - ci0[0];
      for (const L of LS) {
        const ci = resCI(d, L, rng, B);
        if (ci[0] <= theta && theta <= ci[1]) cov[L]++;
        wid[L] += ci[1] - ci[0];
      }
    }
    console.log(`${nm.padEnd(20)} Verlauf ${r2} AR ${rho}: iid ${(100 * cov.iid / SIMS).toFixed(1)}`
      + LS.map((L) => ` | L=${L} ${(100 * cov[L] / SIMS).toFixed(1)} (${(wid[L] / wid.iid).toFixed(2)})`).join(''));
  }
}

console.log('\nFehlalarm der Diagnose bei unabhaengigen Differenzen, n=90');
{
  const rng = S.createRng(77);
  const z = makeNormal(rng);
  const acf1 = (x) => {
    const m = x.reduce((a, b) => a + b, 0) / x.length;
    let g = 0;
    let s = 0;
    for (let t = 0; t < x.length; t++) {
      g += (x[t] - m) ** 2;
      if (t + 1 < x.length) s += (x[t] - m) * (x[t + 1] - m);
    }
    return s / g;
  };
  let raw = 0;
  let det = 0;
  let either = 0;
  const M = 40000;
  for (let i = 0; i < M; i++) {
    const x = Array.from({ length: N }, () => z());
    const a = acf1(x) > crit;
    const b = acf1(linfit(x).res) > crit;
    if (a) raw++;
    if (b) det++;
    if (a || b) either++;
  }
  console.log(`roh ${(100 * raw / M).toFixed(2)} %, trendbereinigt ${(100 * det / M).toFixed(2)} %, eine von beiden ${(100 * either / M).toFixed(2)} %, erwartet bei 156 Tests roh ${(156 * raw / M).toFixed(1)}, trendbereinigt ${(156 * det / M).toFixed(1)}`);
}

console.log('\nWorking Set in Block 1, residuenbasiert, Breite gegen unabhaengiges Bootstrap');
const RES = path.join(ROOT, 'results');
const dirs = readdirSync(RES).filter((d) => /^[0-9T:\-Z]+_b1-c\d\d-(baseline|medium|stress)$/.test(d));
const widths = { 5: [], 13: [], 20: [] };
const r205 = [];
for (const d of dirs) {
  const mm = d.match(/_b1-c(\d\d)-(\w+)$/);
  const id = Number(mm[1]);
  const p = plan.comparisons.find((c) => c.id === id);
  const runs = {};
  for (const f of readdirSync(path.join(RES, d, 'runs'))) {
    if (!f.endsWith('.json') || f.startsWith('.')) continue;
    const r = JSON.parse(readFileSync(path.join(RES, d, 'runs', f), 'utf-8'));
    if (!r.run.warmup) (runs[r.run.config] ||= {})[r.run.run_index] = r.measures;
  }
  const idx = Object.keys(runs[p.a]).map(Number).sort((x, y) => x - y);
  const dd = idx.map((i) => runs[p.a][i].working_set_peak_bytes_total - runs[p.b][i].working_set_peak_bytes_total);
  const row = rows.find((r) => r.id === id && r.level === mm[2] && r.measure.includes('bytes'));
  const w0 = row.iid[1] - row.iid[0];
  const seed = 20261109 + id * 1000 + plan.scenarios.indexOf(mm[2]) * 10 + 2;
  const w = {};
  for (const L of [5, 13, 20]) {
    const ci = resCI(dd, L, S.createRng(seed + L), 10000);
    w[L] = ci[1] - ci[0];
    if (w0 > 0) widths[L].push(w[L] / w0);
  }
  if (w[5] > 0) r205.push(w[20] / w[5]);
}
for (const L of [5, 13, 20]) {
  const s = [...widths[L]].sort((a, b) => a - b);
  console.log(`L=${L}: Q1 ${S.percentile(s, 25).toFixed(2)}, Median ${S.percentile(s, 50).toFixed(2)}, Q3 ${S.percentile(s, 75).toFixed(2)}, Max ${s[s.length - 1].toFixed(2)}, schmaler als unabhaengig ${s.filter((v) => v < 1).length} von ${s.length}`);
}
const s = [...r205].sort((a, b) => a - b);
console.log(`Breite L=20 gegen L=5: Q1 ${S.percentile(s, 25).toFixed(2)}, Median ${S.percentile(s, 50).toFixed(2)}, Q3 ${S.percentile(s, 75).toFixed(2)}, Max ${s[s.length - 1].toFixed(2)}`);

console.log('\nEinordnung der Faelle je Hypothese (Faelle, die Signifikanz nach Holm nutzen)');
const LEV = plan.scenarios;
const WS = 'working_set_peak_bytes_total';
const CPU = 'cpu_seconds_total';
const LAT = 'latency_mean_ms';
const CONN = 'connect_mean_ms';
const H = {
  H1: [[1, 'stress', WS], [3, 'stress', WS]],
  H3: [1, 2, 3, 4].map((i) => [i, 'stress', LAT]),
  H5: [7, 8].flatMap((i) => LEV.flatMap((l) => [[i, l, CONN], [i, l, WS]])),
  H6: LEV.map((l) => [4, l, LAT]),
  H7: [9, 10].flatMap((i) => LEV.map((l) => [i, l, LAT])),
  H9: LEV.flatMap((l) => [[12, l, CPU], [12, l, WS]]),
  H10: [[13, 'stress', WS]],
};
const cls = (r) => (r.r1Det > crit ? 'Abhaengigkeit' : r.r1 > crit ? 'nur Trend' : 'ohne Hinweis');
for (const [h, list] of Object.entries(H)) {
  const c = {};
  const det = [];
  for (const [id, level, m] of list) {
    const r = rows.find((x) => x.id === id && x.level === level && x.measure === m);
    const k = cls(r);
    c[k] = (c[k] || 0) + 1;
    if (k !== 'ohne Hinweis') det.push(`c${id} ${level} ${m.slice(0, 4)} ${k}`);
  }
  console.log(h, JSON.stringify(c), det.join('; '));
}
