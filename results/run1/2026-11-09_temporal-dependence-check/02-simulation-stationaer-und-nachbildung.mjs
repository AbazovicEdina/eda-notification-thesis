// Read-only. (1) Simulation of tests and intervals under dependence with n = 90. (2) Pseudo replication inside Block 1.
// Usage: node 02-simulation-stationaer-und-nachbildung.mjs <repo>
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.argv[2];
const S = await import(pathToFileURL(path.join(ROOT, 'tools/orchestrate/stats.js')).href);
const plan = JSON.parse(readFileSync(path.join(ROOT, 'tools/orchestrate/plan.json'), 'utf-8'));
const N = 90;
const SIMS = 1200;
const B = 799;

function med(a) {
  a.sort();
  const n = a.length;
  return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2;
}
const pct = (s, p) => s[Math.max(0, Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1))];
function cbb(d, L, rng, R, add = null, alpha = 0.05) {
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
  return [pct(meds, (alpha / 2) * 100), pct(meds, (1 - alpha / 2) * 100)];
}
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
  const fit = x.map((_, i) => xb + b * (i - tb));
  return { fit, res: x.map((v, i) => v - fit[i]) };
}

function gen(rng, rho, r2) {
  const normal = () => Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());
  const x = new Array(N);
  x[0] = normal();
  const s = Math.sqrt(1 - rho * rho);
  for (let i = 1; i < N; i++) x[i] = rho * x[i - 1] + s * normal();
  if (r2 > 0) {
    const tb = (N - 1) / 2;
    let v = 0;
    for (let i = 0; i < N; i++) v += (i - tb) ** 2;
    v /= N;
    const beta = Math.sqrt((r2 / (1 - r2)) / v);
    for (let i = 0; i < N; i++) x[i] += beta * (i - tb);
  }
  return x;
}

const DGP = [
  ['unabhaengig', 0, 0],
  ['AR1 0,45', 0.45, 0],
  ['AR1 0,80', 0.8, 0],
  ['AR1 0,95', 0.95, 0],
  ['Trend R2 0,7 + AR1 0,45', 0.45, 0.7],
  ['Trend R2 0,9 + AR1 0,80', 0.8, 0.9],
];
const METHODS = [
  ['iid', (d, rng) => cbb(d, 1, rng, B)],
  ['CBB L=8', (d, rng) => cbb(d, 8, rng, B)],
  ['CBB L=13', (d, rng) => cbb(d, 13, rng, B)],
  ['CBB L=20', (d, rng) => cbb(d, 20, rng, B)],
  ['Residuen L=8', (d, rng) => { const f = linfit(d); return cbb(f.res, 8, rng, B, f.fit); }],
  ['Residuen L=13', (d, rng) => { const f = linfit(d); return cbb(f.res, 13, rng, B, f.fit); }],
];
console.log(`Simulation, n=${N}, ${SIMS} Wiederholungen, ${B} Resamples`);
for (const [name, rho, r2] of DGP) {
  const rng = S.createRng(4711 + Math.round(rho * 100) + Math.round(r2 * 10));
  const cover = METHODS.map(() => 0);
  const width = METHODS.map(() => 0);
  let w05 = 0;
  let wHolm = 0;
  for (let s = 0; s < SIMS; s++) {
    const d = gen(rng, rho, r2);
    const p = S.wilcoxonSignedRank(d, new Array(N).fill(0)).pValue;
    if (p <= 0.05) w05++;
    if (p <= 0.05 / 39) wHolm++;
    METHODS.forEach(([, f], i) => {
      const [lo, hi] = f(d, rng);
      if (lo <= 0 && hi >= 0) cover[i]++;
      width[i] += hi - lo;
    });
  }
  console.log(`${name.padEnd(26)} Wilcoxon p<=0,05: ${(100 * w05 / SIMS).toFixed(1)} %, p<=0,05/39: ${(100 * wHolm / SIMS).toFixed(1)} % | Abdeckung ` + METHODS.map(([m], i) => `${m} ${(100 * cover[i] / SIMS).toFixed(1)} (${(width[i] / width[0]).toFixed(2)})`).join(', '));
}

// Pseudo replication inside Block 1: the other campaigns of both cells take the role of a second block.
const MEASURES = ['latency_mean_ms', 'cpu_seconds_total', 'working_set_peak_bytes_total', 'connect_mean_ms'];
const RES = path.join(ROOT, 'results');
const dirs = readdirSync(RES).filter((d) => /^[0-9T:\-Z]+_b1-c\d\d-(baseline|medium|stress)$/.test(d));
const data = {};
for (const d of dirs) {
  const m = d.match(/_b1-c(\d\d)-(\w+)$/);
  const id = Number(m[1]);
  const p = plan.comparisons.find((c) => c.id === id);
  const runs = {};
  for (const f of readdirSync(path.join(RES, d, 'runs'))) {
    if (!f.endsWith('.json') || f.startsWith('.')) continue;
    const r = JSON.parse(readFileSync(path.join(RES, d, 'runs', f), 'utf-8'));
    if (r.run.warmup) continue;
    (runs[r.run.config] ||= {})[r.run.run_index] = r.measures;
  }
  data[`${id}|${m[2]}`] = { id, level: m[2], a: p.a, b: p.b, runs };
}
const LS = { iid: 1, L8: 8, L13: 13, L20: 20 };
const sign = (v) => (v === 0 ? 0 : Math.sign(v));
const overlap = (x, y) => x[0] <= y[1] && y[0] <= x[1];
console.log('\nPseudo-Replikation: gleiche Richtung und KI-Ueberlappung, Anteil ueber alle Kombinationen anderer Kampagnen');
for (const m of MEASURES) {
  const cnt = { n: 0, dir: 0, iid: 0, L8: 0, L13: 0, L20: 0 };
  let seed = 99;
  for (const c of Object.values(data)) {
    const idx = Object.keys(c.runs[c.a]).map(Number).sort((x, y) => x - y);
    const d1 = idx.map((i) => c.runs[c.a][i][m] - c.runs[c.b][i][m]);
    const others = (cell) => Object.values(data).filter((x) => x.level === c.level && x.id !== c.id && (x.a === cell || x.b === cell));
    for (const oa of others(c.a)) {
      for (const ob of others(c.b)) {
        const d2 = idx.map((i) => oa.runs[c.a][i][m] - ob.runs[c.b][i][m]);
        const same = sign(med(Float64Array.from(d1))) === sign(med(Float64Array.from(d2)));
        cnt.n++;
        if (same) cnt.dir++;
        for (const [k, L] of Object.entries(LS)) {
          const r1 = S.createRng(++seed);
          const r2 = S.createRng(++seed);
          if (same && overlap(cbb(d1, L, r1, 1500), cbb(d2, L, r2, 1500))) cnt[k]++;
        }
      }
    }
  }
  const pc = (k) => `${(100 * cnt[k] / cnt.n).toFixed(1)} %`;
  console.log(`${m.padEnd(30)} Kombinationen ${cnt.n} | gleiche Richtung ${pc('dir')} | repliziert iid ${pc('iid')}, L=8 ${pc('L8')}, L=13 ${pc('L13')}, L=20 ${pc('L20')}`);
}
