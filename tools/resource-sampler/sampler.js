#!/usr/bin/env node
// Ressourcen-Messung pro Testlauf (DECISIONS.md 5.16). Läuft im Container
// `resource-sampler` auf der SUT-Seite (lokal bzw. auf dem Pi) und liest die
// cgroup-v2-Dateien der SUT-Container direkt — exakt und mit kaum Eigenlast,
// statt `docker stats` (1–3 s pro Abfrage, eigene CPU-Last auf demselben
// Rechner). tools/orchestrate ruft ihn per `docker compose exec` auf.
//
//   node sampler.js info
//     Host-Kontext als eine JSON-Zeile (Modell, Kernel, Kerne, RAM, Swap,
//     cgroup-Controller, CPU-Governor, Temperatur, Drosselstatus).
//
//   node sampler.js measure --cell <zelle>=<containerId>[,<containerId>...] [--cell ...] [--interval-ms 250]
//     Gibt nach dem Auflösen der cgroups eine Zeile {"ready":true,...} aus,
//     misst dann, bis stdin endet (EOF), und gibt die Zusammenfassung als
//     eine JSON-Zeile aus:
//       CPU: Differenz des Zählers usage_usec (cpu.stat) zwischen Start und
//            Ende — exakte CPU-Zeit des Laufs, kein Abtastfehler.
//       RAM: memory.current und "Working Set" (memory.current minus
//            inactive_file aus memory.stat — dieselbe Definition wie
//            `docker stats`), alle interval-ms abgetastet; Mittel und
//            Spitze pro Container und pro Zelle (Summe der Container).
//       Host: Temperatur (Start/Ende/Max) und Drosselstatus (Start/Ende).
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CGROUP_ROOT = '/sys/fs/cgroup';

function readText(file) {
  try {
    return readFileSync(file, 'utf-8').trim();
  } catch {
    return null;
  }
}

function readFirst(files) {
  for (const f of files) {
    const v = readText(f);
    if (v != null) return v.replace(/\0/g, '');
  }
  return null;
}

function tempC() {
  const raw = readText('/sys/class/thermal/thermal_zone0/temp');
  return raw == null ? null : Number(raw) / 1000;
}

// Drosselstatus der Raspberry-Pi-Firmware (Bitmaske wie `vcgencmd
// get_throttled`; 0x0 = nie gedrosselt). Auf anderen Rechnern null.
function throttled() {
  return readFirst([
    '/sys/devices/platform/soc/soc:firmware/get_throttled',
    '/sys/devices/platform/soc@107c000000/soc@107c000000:firmware/get_throttled',
  ]);
}

function meminfo() {
  const text = readText('/proc/meminfo') ?? '';
  const get = (key) => {
    const m = text.match(new RegExp(`^${key}:\\s+(\\d+) kB`, 'm'));
    return m ? Number(m[1]) * 1024 : null;
  };
  return { total: get('MemTotal'), swapTotal: get('SwapTotal') };
}

function info() {
  const controllers = (readText(path.join(CGROUP_ROOT, 'cgroup.controllers')) ?? '').split(/\s+/).filter(Boolean);
  const mem = meminfo();
  return {
    model: readFirst(['/proc/device-tree/model', '/sys/firmware/devicetree/base/model']),
    kernel: readText('/proc/sys/kernel/osrelease'),
    arch: os.arch(),
    cpus: os.cpus().length,
    mem_total_bytes: mem.total,
    swap_total_bytes: mem.swapTotal,
    cgroup_v2: existsSync(path.join(CGROUP_ROOT, 'cgroup.controllers')),
    cgroup_controllers: controllers,
    memory_controller: controllers.includes('memory'),
    cpu_governor: readText('/sys/devices/system/cpu/cpu0/cpufreq/scaling_governor'),
    cpu_freq_khz: Number(readText('/sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq')) || null,
    temp_c: tempC(),
    throttled: throttled(),
    sampled_at: new Date().toISOString(),
  };
}

// Sucht das cgroup-Verzeichnis eines Containers anhand seiner ID. Je nach
// cgroup-Treiber heißt es `docker-<id>.scope` (systemd, z.B. Pi) oder
// `<id>` (cgroupfs, z.B. Docker Desktop); auf dem Pi liegt es zusätzlich
// im Topf der Zelle (`eda_<zelle>.slice`, docker-compose.pi.yml).
function findCgroupDir(containerId, dir = CGROUP_ROOT, depth = 0) {
  if (depth > 5) return null;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const e of entries) {
    if (e.isDirectory() && e.name.includes(containerId)) return path.join(dir, e.name);
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const found = findCgroupDir(containerId, path.join(dir, e.name), depth + 1);
    if (found) return found;
  }
  return null;
}

function cpuUsageUsec(dir) {
  const text = readText(path.join(dir, 'cpu.stat')) ?? '';
  const m = text.match(/^usage_usec (\d+)$/m);
  return m ? Number(m[1]) : null;
}

function memory(dir) {
  const current = Number(readText(path.join(dir, 'memory.current')));
  const stat = readText(path.join(dir, 'memory.stat')) ?? '';
  const m = stat.match(/^inactive_file (\d+)$/m);
  const inactiveFile = m ? Number(m[1]) : 0;
  return { current, workingSet: Math.max(0, current - inactiveFile) };
}

function parseCells(args) {
  const cells = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] !== '--cell') continue;
    const [name, ids] = String(args[i + 1] ?? '').split('=');
    if (!name || !ids) throw new Error(`Ungültiges --cell-Argument: ${args[i + 1]}`);
    cells[name] = ids.split(',').filter(Boolean);
  }
  return cells;
}

function argValue(args, flag, fallback) {
  const i = args.indexOf(flag);
  return i === -1 ? fallback : args[i + 1];
}

function measure(args) {
  const cells = parseCells(args);
  const intervalMs = Number(argValue(args, '--interval-ms', 250));
  if (Object.keys(cells).length === 0) throw new Error('measure braucht mindestens ein --cell');

  const containers = [];
  for (const [cell, ids] of Object.entries(cells)) {
    for (const id of ids) {
      const dir = findCgroupDir(id);
      if (!dir) {
        console.log(JSON.stringify({ error: `cgroup für Container ${id} (Zelle ${cell}) nicht gefunden` }));
        process.exit(1);
      }
      containers.push({
        cell, id, dir,
        cpuStart: cpuUsageUsec(dir),
        memSum: 0, wsSum: 0, memMax: 0, wsMax: 0,
      });
    }
  }

  const cellSamples = Object.fromEntries(Object.keys(cells).map((c) => [c, { memSum: 0, wsSum: 0, memMax: 0, wsMax: 0 }]));
  const startedAt = Date.now();
  const tempStart = tempC();
  const throttledStart = throttled();
  let tempMax = tempStart;
  let samples = 0;

  const sample = () => {
    const perCell = Object.fromEntries(Object.keys(cells).map((c) => [c, { mem: 0, ws: 0 }]));
    for (const c of containers) {
      const m = memory(c.dir);
      c.memSum += m.current;
      c.wsSum += m.workingSet;
      c.memMax = Math.max(c.memMax, m.current);
      c.wsMax = Math.max(c.wsMax, m.workingSet);
      perCell[c.cell].mem += m.current;
      perCell[c.cell].ws += m.workingSet;
    }
    for (const [cell, v] of Object.entries(perCell)) {
      const s = cellSamples[cell];
      s.memSum += v.mem;
      s.wsSum += v.ws;
      s.memMax = Math.max(s.memMax, v.mem);
      s.wsMax = Math.max(s.wsMax, v.ws);
    }
    const t = tempC();
    if (t != null) tempMax = tempMax == null ? t : Math.max(tempMax, t);
    samples += 1;
  };

  sample();
  console.log(JSON.stringify({
    ready: true,
    cgroups: Object.fromEntries(containers.map((c) => [c.id, { cell: c.cell, dir: c.dir }])),
  }));
  const timer = setInterval(sample, intervalMs);

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    clearInterval(timer);
    sample();
    const wallSeconds = (Date.now() - startedAt) / 1000;
    const perContainer = {};
    const perCell = {};
    for (const c of containers) {
      const cpuEnd = cpuUsageUsec(c.dir);
      const cpuSeconds = c.cpuStart == null || cpuEnd == null ? null : (cpuEnd - c.cpuStart) / 1e6;
      perContainer[c.id] = {
        cell: c.cell,
        cgroup: c.dir,
        cpu_seconds: cpuSeconds,
        cpu_cores_avg: cpuSeconds == null ? null : cpuSeconds / wallSeconds,
        mem_avg_bytes: c.memSum / samples,
        mem_peak_bytes: c.memMax,
        working_set_avg_bytes: c.wsSum / samples,
        working_set_peak_bytes: c.wsMax,
      };
      const agg = perCell[c.cell] ?? (perCell[c.cell] = { containers: 0, cpu_seconds: 0 });
      agg.containers += 1;
      agg.cpu_seconds = agg.cpu_seconds == null || cpuSeconds == null ? null : agg.cpu_seconds + cpuSeconds;
    }
    for (const [cell, s] of Object.entries(cellSamples)) {
      const agg = perCell[cell];
      agg.cpu_cores_avg = agg.cpu_seconds == null ? null : agg.cpu_seconds / wallSeconds;
      agg.mem_avg_bytes = s.memSum / samples;
      agg.mem_peak_bytes = s.memMax;
      agg.working_set_avg_bytes = s.wsSum / samples;
      agg.working_set_peak_bytes = s.wsMax;
    }
    console.log(JSON.stringify({
      wall_seconds: wallSeconds,
      interval_ms: intervalMs,
      samples,
      cells: perCell,
      containers: perContainer,
      host: { temp_start_c: tempStart, temp_end_c: tempC(), temp_max_c: tempMax, throttled_start: throttledStart, throttled_end: throttled() },
    }));
    process.exit(0);
  };

  process.stdin.on('end', finish);
  process.stdin.on('error', finish);
  process.stdin.resume();
  process.on('SIGTERM', finish);
  process.on('SIGINT', finish);
}

const [mode, ...rest] = process.argv.slice(2);
try {
  if (mode === 'info') {
    console.log(JSON.stringify(info()));
  } else if (mode === 'measure') {
    measure(rest);
  } else {
    console.error('Aufruf: node sampler.js info | measure --cell <zelle>=<id>[,<id>] [--interval-ms 250]');
    process.exit(2);
  }
} catch (err) {
  console.log(JSON.stringify({ error: String(err.message ?? err) }));
  process.exit(1);
}
