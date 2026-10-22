#!/usr/bin/env node
// Ressourcen-Messung pro Testlauf (DECISIONS.md 5.16). Läuft im Container
// `resource-sampler` auf der SUT-Seite (lokal bzw. auf dem Pi) und liest die
// cgroup-v2-Dateien der SUT-Container direkt — exakt und mit kaum Eigenlast,
// statt `docker stats` (1–3 s pro Abfrage, eigene CPU-Last auf demselben
// Rechner). tools/orchestrate ruft ihn per `docker compose exec` auf.
//
//   node sampler.js info
//     Host-Kontext als eine JSON-Zeile (Modell, Kernel, Kerne, RAM, Swap,
//     cgroup-Controller, CPU-Governor, Temperatur, Drosselstatus, freier
//     Platz des Docker-Datenträgers).
//
//   node sampler.js measure [--cell <zelle>=<containerId>[,<containerId>...]]... [--host-cpu] [--interval-ms 250]
//     Gibt nach dem Auflösen der cgroups eine Zeile {"ready":true,...} aus,
//     misst dann, bis stdin endet (EOF), und gibt die Zusammenfassung als
//     eine JSON-Zeile aus — je Zelle (z. B. die gemessene Zelle und Redis),
//     als Gesamtsumme über alle Container ("total") und je Container:
//       CPU: Differenz des Zählers usage_usec (cpu.stat) zwischen Start und
//            Ende — exakte CPU-Zeit des Laufs, kein Abtastfehler.
//       RAM: memory.current und "Working Set" (memory.current minus
//            inactive_file aus memory.stat — dieselbe Definition wie
//            `docker stats`), alle interval-ms abgetastet; Mittel und
//            Spitze pro Container und pro Zelle (Summe der Container).
//       Host: Temperatur (Start/Ende/Max) und Drosselstatus (Start/Ende);
//            mit --host-cpu zusätzlich die CPU-Auslastung des ganzen Hosts
//            (Mittel und höchster Wert je Abtastintervall) — auf dem
//            Lastgenerator der Nachweis, dass k6 nicht der Engpass war.
import { readFileSync, readdirSync, existsSync, statfsSync } from 'node:fs';
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
// get_throttled`; 0x0 = nie gedrosselt). Auf anderen Rechnern null, ebenso
// auf dem Pi 5 (Kernel 6.18), der die Datei nicht in sysfs bereitstellt.
// tools/orchestrate liest den Status dann per vcgencmd auf dem Host.
function throttled() {
  return readFirst([
    '/sys/devices/platform/soc/soc:firmware/get_throttled',
    '/sys/devices/platform/soc@107c000000/soc@107c000000:firmware/get_throttled',
  ]);
}

// Modell aus dem Device Tree. Docker sperrt /sys/firmware im Container,
// daher ersatzweise die Zeile "Model" aus /proc/cpuinfo (Raspberry-Pi-Kernel).
function model() {
  const dt = readFirst(['/proc/device-tree/model', '/sys/firmware/devicetree/base/model']);
  if (dt) return dt;
  const m = (readText('/proc/cpuinfo') ?? '').match(/^Model\s*:\s*(.+)$/m);
  return m ? m[1].trim() : null;
}

function meminfo() {
  const text = readText('/proc/meminfo') ?? '';
  const get = (key) => {
    const m = text.match(new RegExp(`^${key}:\\s+(\\d+) kB`, 'm'));
    return m ? Number(m[1]) * 1024 : null;
  };
  return { total: get('MemTotal'), swapTotal: get('SwapTotal') };
}

// Freier Platz des Datenträgers, auf dem Docker seine Daten ablegt (das
// Wurzeldateisystem des Containers liegt dort). Dient der Überwachung im
// Dauerbetrieb (tools/orchestrate/status.js).
function dockerDisk() {
  try {
    const s = statfsSync('/');
    return { free_bytes: s.bavail * s.bsize, total_bytes: s.blocks * s.bsize };
  } catch {
    return null;
  }
}

function info() {
  const controllers = (readText(path.join(CGROUP_ROOT, 'cgroup.controllers')) ?? '').split(/\s+/).filter(Boolean);
  const mem = meminfo();
  const disk = dockerDisk();
  return {
    model: model(),
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
    docker_disk_free_bytes: disk?.free_bytes ?? null,
    docker_disk_total_bytes: disk?.total_bytes ?? null,
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

// Gesamte CPU-Zeit des Hosts aus /proc/stat (nicht namensraumgebunden, also
// auch im Container die Werte des Hosts): Summe aller Zustände und Leerlauf
// (idle + iowait), in Jiffies.
function hostCpuTicks() {
  const line = (readText('/proc/stat') ?? '').split('\n').find((l) => l.startsWith('cpu '));
  if (!line) return null;
  const v = line.trim().split(/\s+/).slice(1).map(Number);
  const idle = v[3] + (v[4] ?? 0);
  return { total: v.reduce((a, b) => a + b, 0), idle };
}

function measure(args) {
  const cells = parseCells(args);
  const intervalMs = Number(argValue(args, '--interval-ms', 250));
  const withHostCpu = args.includes('--host-cpu');
  if (Object.keys(cells).length === 0 && !withHostCpu) throw new Error('measure braucht mindestens ein --cell oder --host-cpu');

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

  // Je Zelle plus "Gesamt" über alle übergebenen Container (z. B. Zelle +
  // Redis, DECISIONS.md 5.16). Die Gesamtspitze wird aus der Summe je
  // Abtastung gebildet, nicht als Summe der Einzelspitzen.
  const groups = [...Object.keys(cells), '__total__'];
  const groupSamples = Object.fromEntries(groups.map((g) => [g, { memSum: 0, wsSum: 0, memMax: 0, wsMax: 0 }]));
  const startedAt = Date.now();
  const tempStart = tempC();
  const throttledStart = throttled();
  let tempMax = tempStart;
  let samples = 0;
  let prevTicks = withHostCpu ? hostCpuTicks() : null;
  const hostCpuStart = prevTicks;
  let hostUtilMax = 0;

  const sample = () => {
    const perGroup = Object.fromEntries(groups.map((g) => [g, { mem: 0, ws: 0 }]));
    for (const c of containers) {
      const m = memory(c.dir);
      c.memSum += m.current;
      c.wsSum += m.workingSet;
      c.memMax = Math.max(c.memMax, m.current);
      c.wsMax = Math.max(c.wsMax, m.workingSet);
      for (const g of [c.cell, '__total__']) {
        perGroup[g].mem += m.current;
        perGroup[g].ws += m.workingSet;
      }
    }
    for (const [g, v] of Object.entries(perGroup)) {
      const s = groupSamples[g];
      s.memSum += v.mem;
      s.wsSum += v.ws;
      s.memMax = Math.max(s.memMax, v.mem);
      s.wsMax = Math.max(s.wsMax, v.ws);
    }
    if (withHostCpu) {
      const ticks = hostCpuTicks();
      if (ticks && prevTicks && ticks.total > prevTicks.total) {
        const util = 1 - (ticks.idle - prevTicks.idle) / (ticks.total - prevTicks.total);
        hostUtilMax = Math.max(hostUtilMax, util);
      }
      prevTicks = ticks;
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
    const perGroup = Object.fromEntries(groups.map((g) => [g, { containers: 0, cpu_seconds: 0 }]));
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
      for (const g of [c.cell, '__total__']) {
        const agg = perGroup[g];
        agg.containers += 1;
        agg.cpu_seconds = agg.cpu_seconds == null || cpuSeconds == null ? null : agg.cpu_seconds + cpuSeconds;
      }
    }
    for (const [g, s] of Object.entries(groupSamples)) {
      const agg = perGroup[g];
      agg.cpu_cores_avg = agg.cpu_seconds == null ? null : agg.cpu_seconds / wallSeconds;
      agg.mem_avg_bytes = s.memSum / samples;
      agg.mem_peak_bytes = s.memMax;
      agg.working_set_avg_bytes = s.wsSum / samples;
      agg.working_set_peak_bytes = s.wsMax;
    }
    const { __total__: total, ...cellGroups } = perGroup;
    let hostCpu = null;
    if (withHostCpu) {
      const end = hostCpuTicks();
      hostCpu = {
        cpus: os.cpus().length,
        util_avg: hostCpuStart && end && end.total > hostCpuStart.total
          ? 1 - (end.idle - hostCpuStart.idle) / (end.total - hostCpuStart.total)
          : null,
        util_max_interval: hostUtilMax,
      };
    }
    console.log(JSON.stringify({
      wall_seconds: wallSeconds,
      interval_ms: intervalMs,
      samples,
      cells: cellGroups,
      total,
      containers: perContainer,
      host: { temp_start_c: tempStart, temp_end_c: tempC(), temp_max_c: tempMax, throttled_start: throttledStart, throttled_end: throttled(), cpu: hostCpu },
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
    console.error('Aufruf: node sampler.js info | measure [--cell <zelle>=<id>[,<id>]]... [--host-cpu] [--interval-ms 250]');
    process.exit(2);
  }
} catch (err) {
  console.log(JSON.stringify({ error: String(err.message ?? err) }));
  process.exit(1);
}
