// Build assets/data/default-creds.json from the DefaultCreds cheat sheet CSV.
// Usage: node scripts/gen-default-creds.mjs
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'creds-'));
execSync(`git clone -q --depth 1 https://github.com/ihebski/DefaultCreds-cheat-sheet.git ${tmp}/c`, { stdio: 'inherit' });
const raw = fs.readFileSync(path.join(tmp, 'c/DefaultCreds-Cheat-Sheet.csv'), 'utf8').replace(/\r/g, '');
const creds = [];
for (const line of raw.split('\n').slice(1)) {
  const i = line.indexOf(','), j = line.indexOf(',', i + 1);
  if (i < 0 || j < 0) continue;
  creds.push([line.slice(0, i).trim(), line.slice(i + 1, j).trim(), line.slice(j + 1).trim()]);
}
const vendors = new Set(creds.map((c) => c[0]));
fs.writeFileSync(path.join(ROOT, 'assets/data/default-creds.json'), JSON.stringify({ generated: new Date().toISOString().slice(0, 10), source: 'https://github.com/ihebski/DefaultCreds-cheat-sheet', count: creds.length, vendors: vendors.size, creds }));
fs.rmSync(tmp, { recursive: true, force: true });
console.log('wrote assets/data/default-creds.json —', creds.length, 'pairs,', vendors.size, 'vendors');
