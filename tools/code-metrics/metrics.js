#!/usr/bin/env node
// Code and operations metrics per cell, answering the question of
// complexity and maintainability (DECISIONS.md 5.22). Static analysis of the
// repository state, no runtime measurement. variants.json defines which
// files and dependencies belong to a cell.
//
// Metrics per cell:
//   - own application code, files and lines of code (without blank and
//     comment lines)
//   - operations configuration, files and lines (Dockerfile, FPM pool,
//     start script)
//   - containers or processes of the cell (cells.json)
//   - directly used dependencies and all packages they depend on
//     (transitive, from the lock file)
// Metrics per prototype:
//   - project size without dependencies, files and lines of code
//   - installed production packages
//
// Usage: node tools/code-metrics/metrics.js
// Output: results/<timestamp>_code-metrics/metrics.json and metrics.md

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const PROTOTYPES = path.join(REPO_ROOT, 'prototypes');
const config = JSON.parse(readFileSync(path.join(__dirname, 'variants.json'), 'utf-8'));
const cells = JSON.parse(readFileSync(path.join(REPO_ROOT, 'tools', 'orchestrate', 'cells.json'), 'utf-8'));

// Lines of code exclude blank lines and lines that contain only a comment.
// Recognized are //, # and ; comments as well as /* ... */ blocks (including
// PHPDoc). Lines with code and a trailing comment count as code.
function countLines(file) {
  const text = readFileSync(file, 'utf-8');
  const ext = path.extname(file);
  const hashComments = ['.php', '.sh', '.conf', '.yml', '.yaml', ''].includes(ext);
  const semicolonComments = ext === '.conf';
  let code = 0;
  let total = 0;
  let inBlock = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    total++;
    if (inBlock) {
      if (line.includes('*/')) {
        inBlock = false;
        if (line.slice(line.indexOf('*/') + 2).trim()) code++;
      }
      continue;
    }
    if (!line) continue;
    if (line.startsWith('/*')) {
      if (!line.includes('*/', 2)) inBlock = true;
      else if (line.slice(line.indexOf('*/', 2) + 2).trim()) code++;
      continue;
    }
    if (line.startsWith('//')) continue;
    if (hashComments && line.startsWith('#')) continue;
    if (semicolonComments && line.startsWith(';')) continue;
    if (line === '<?php' || line === '?>') continue;
    code++;
  }
  if (text.endsWith('\n')) total--;
  return { code, total };
}

function sumLines(files) {
  return files.reduce((acc, f) => {
    const { code, total } = countLines(path.join(PROTOTYPES, f));
    return { files: acc.files + 1, code: acc.code + code, total: acc.total + total };
  }, { files: 0, code: 0, total: 0 });
}

// Project files of a prototype without dependencies, runtime data, lock
// files, documentation and hidden files.
const SKIP_DIRS = new Set(['vendor', 'node_modules', 'storage', 'cache']);
const CODE_EXT = new Set(['.js', '.mjs', '.php', '.conf', '.sh', '.json', '.yml', '.yaml']);
const LOCK_FILES = new Set(['composer.lock', 'package-lock.json']);
function projectFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) out.push(...projectFiles(full));
    } else if ((CODE_EXT.has(path.extname(entry.name)) || entry.name === 'Dockerfile' || entry.name === 'artisan') && !LOCK_FILES.has(entry.name)) {
      out.push(path.relative(PROTOTYPES, full));
    }
  }
  return out;
}

// Dependency graph from the lock file, all packages reachable from the
// directly used dependencies (including these).
function npmGraph(dir) {
  const lock = JSON.parse(readFileSync(path.join(dir, 'package-lock.json'), 'utf-8'));
  const pkgs = lock.packages ?? {};
  const resolve = (name, from) => {
    let base = from;
    for (;;) {
      const candidate = base ? `${base}/node_modules/${name}` : `node_modules/${name}`;
      if (pkgs[candidate]) return candidate;
      if (!base) return null;
      const idx = base.lastIndexOf('/node_modules/');
      base = idx === -1 ? '' : base.slice(0, idx);
    }
  };
  const reach = (roots) => {
    const seen = new Set();
    const stack = roots.map((r) => resolve(r, '')).filter(Boolean);
    while (stack.length) {
      const p = stack.pop();
      if (seen.has(p)) continue;
      seen.add(p);
      const e = pkgs[p];
      for (const dep of Object.keys({ ...e.dependencies, ...e.optionalDependencies, ...e.peerDependencies })) {
        const r = resolve(dep, p);
        if (r) stack.push(r);
      }
    }
    return new Set([...seen].map((p) => `${p.slice(p.lastIndexOf('node_modules/') + 13)}@${pkgs[p].version}`));
  };
  const installed = Object.entries(pkgs).filter(([p, e]) => p && !e.dev).length;
  return { reach, installed };
}

function composerGraph(dir) {
  const lock = JSON.parse(readFileSync(path.join(dir, 'composer.lock'), 'utf-8'));
  const pkgs = lock.packages ?? [];
  const byName = new Map();
  for (const p of pkgs) {
    byName.set(p.name, p);
    for (const alias of Object.keys({ ...p.replace, ...p.provide })) if (!byName.has(alias)) byName.set(alias, p);
  }
  const platform = (n) => n === 'php' || n.startsWith('ext-') || n.startsWith('lib-') || n.startsWith('composer-');
  const reach = (roots) => {
    const seen = new Set();
    const stack = [...roots];
    while (stack.length) {
      const p = byName.get(stack.pop());
      if (!p || seen.has(p.name)) continue;
      seen.add(p.name);
      for (const dep of Object.keys(p.require ?? {})) if (!platform(dep)) stack.push(dep);
    }
    return seen;
  };
  return { reach, installed: pkgs.length };
}

function git() {
  const run = (a) => spawnSync('git', a, { cwd: REPO_ROOT, encoding: 'utf-8' }).stdout.trim();
  return { commit: run(['rev-parse', 'HEAD']), dirty: run(['status', '--porcelain', '--', 'prototypes']).length > 0 };
}

const prototypes = {};
const graphs = {};
for (const [name, p] of Object.entries(config.prototypes)) {
  const dir = path.join(PROTOTYPES, p.dir);
  graphs[name] = p.manager === 'npm' ? npmGraph(dir) : composerGraph(dir);
  const project = sumLines(projectFiles(dir));
  prototypes[name] = {
    project_files: project.files,
    project_code_lines: project.code,
    installed_production_packages: graphs[name].installed,
  };
}

const result = {};
for (const [cell, c] of Object.entries(config.cells)) {
  const own = sumLines(c.own);
  const deploy = sumLines(c.deploy);
  const reached = graphs[c.prototype].reach(c.deps);
  result[cell] = {
    prototype: c.prototype,
    own_files: own.files,
    own_code_lines: own.code,
    deploy_files: deploy.files,
    deploy_code_lines: deploy.code,
    containers: cells[cell]?.services?.length ?? null,
    direct_dependencies: c.deps,
    reachable_packages: reached.size,
    system_dependencies: c.system,
  };
}

const generatedAt = new Date();
const outDir = path.join(REPO_ROOT, 'results', `${generatedAt.toISOString().replace(/[:.]/g, '-')}_code-metrics`);
mkdirSync(outDir, { recursive: true });
const gitState = git();
writeFileSync(path.join(outDir, 'metrics.json'), JSON.stringify({
  schema: 'eda-thesis/code-metrics/1',
  generated_at: generatedAt.toISOString(),
  git: gitState,
  definitions: config._comment,
  cells: result,
  prototypes,
}, null, 2));

const lines = [
  '# Code- und Betriebskennzahlen',
  '',
  `Erzeugt: ${generatedAt.toISOString()}, Commit ${gitState.commit.slice(0, 7)}${gitState.dirty ? ' (prototypes/ mit lokalen Änderungen)' : ''}. Statische Auswertung, Definitionen in tools/code-metrics/variants.json und DECISIONS.md 5.22.`,
  '',
  '## Je Zelle',
  '',
  '| Zelle | eigener Code (Dateien) | eigener Code (Zeilen) | Betriebskonfiguration (Zeilen) | Container | direkte Abhängigkeiten | Pakete insgesamt | Systemerweiterungen |',
  '|---|---|---|---|---|---|---|---|',
];
for (const [cell, r] of Object.entries(result)) {
  lines.push(`| ${cell} | ${r.own_files} | ${r.own_code_lines} | ${r.deploy_code_lines} | ${r.containers} | ${r.direct_dependencies.length ? r.direct_dependencies.join(', ') : '–'} | ${r.reachable_packages} | ${r.system_dependencies.length ? r.system_dependencies.join(', ') : '–'} |`);
}
lines.push('', '„Pakete insgesamt" zählt die direkt genutzten Abhängigkeiten und alle Pakete, von denen diese abhängen (Lock-Datei).', '');
lines.push('## Je Prototyp', '');
lines.push('| Prototyp | Projektdateien | Codezeilen im Projekt | installierte Produktionspakete |');
lines.push('|---|---|---|---|');
for (const [name, p] of Object.entries(prototypes)) {
  lines.push(`| ${name} | ${p.project_files} | ${p.project_code_lines} | ${p.installed_production_packages} |`);
}
lines.push('', 'Projektdateien und Codezeilen ohne Abhängigkeiten, Lock-Dateien, Laufzeitdaten und Dokumentation. Bei php-laravel enthalten sie das vom Framework erzeugte Projektgerüst (Konfiguration, Bootstrap, Migrationen).', '');
writeFileSync(path.join(outDir, 'metrics.md'), lines.join('\n'));
console.log(`Code-Kennzahlen: ${path.relative(REPO_ROOT, outDir)}`);
