// Build assets/data/atomic.json from the Atomic Red Team combined index.
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
import { execSync } from 'node:child_process'; import { fileURLToPath } from 'node:url'; import yaml from 'js-yaml';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = path.join(os.tmpdir(), 'art.yaml');
execSync(`curl -sSL -o ${tmp} https://raw.githubusercontent.com/redcanaryco/atomic-red-team/master/atomics/Indexes/index.yaml`, { stdio: 'inherit' });
const clean = (s) => (s == null ? '' : String(s).replace(/\r/g, '').trim());
const trim = (s, n) => { s = clean(s); return s.length > n ? s.slice(0, n) + '…' : s; };
const art = yaml.load(fs.readFileSync(tmp, 'utf8')); const atomics = [];
for (const [tactic, techMap] of Object.entries(art)) for (const [tid, info] of Object.entries(techMap)) {
  const tests = (info.atomic_tests || []).map((t) => {
    const args = {}; for (const [k, v] of Object.entries(t.input_arguments || {})) args[k] = clean(v.default);
    return { name: clean(t.name), plat: t.supported_platforms || [], exec: clean(t.executor?.name), elevated: !!t.executor?.elevation_required, cmd: trim(t.executor?.command, 1600), cleanup: trim(t.executor?.cleanup_command, 800) || undefined, args: Object.keys(args).length ? args : undefined };
  }).filter((t) => t.cmd || t.exec);
  if (tests.length) atomics.push({ id: tid, name: clean(info.technique?.name), tactic, tests });
}
atomics.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
fs.writeFileSync(path.join(ROOT, 'assets/data/atomic.json'), JSON.stringify({ generated: new Date().toISOString().slice(0, 10), source: 'https://github.com/redcanaryco/atomic-red-team', count: atomics.length, tests: atomics.reduce((n, a) => n + a.tests.length, 0), techniques: atomics }));
console.log('atomic:', atomics.length, 'techniques');
