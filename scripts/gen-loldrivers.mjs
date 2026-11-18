// Build assets/data/loldrivers.json from the LOLDrivers repo yaml.
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
import { execSync } from 'node:child_process'; import { fileURLToPath } from 'node:url'; import yaml from 'js-yaml';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'loldrv-'));
execSync(`GIT_LFS_SKIP_SMUDGE=1 git clone -q --depth 1 https://github.com/magicsword-io/LOLDrivers.git ${tmp}/d`, { stdio: 'inherit' });
const clean = (s) => (s == null ? '' : String(s).replace(/\r/g, '').trim());
const trim = (s, n) => { s = clean(s); return s.length > n ? s.slice(0, n) + '…' : s; };
const dir = path.join(tmp, 'd/yaml'); const drivers = [];
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.yaml'))) {
  let doc; try { doc = yaml.load(fs.readFileSync(path.join(dir, file), 'utf8')); } catch { continue; }
  if (!doc?.Id) continue;
  const s = doc.KnownVulnerableSamples || [];
  const name = clean(doc.Tags?.[0]) || clean(s.find((x) => x.OriginalFilename)?.OriginalFilename) || clean(s.find((x) => x.Product)?.Product) || doc.Id.slice(0, 8);
  drivers.push({ id: doc.Id, n: name, cat: clean(doc.Category) || 'vulnerable', mitre: clean(doc.MitreID) || undefined, desc: trim(doc.Commands?.Description, 240), use: clean(doc.Commands?.Usecase) || undefined, priv: clean(doc.Commands?.Privileges) || undefined, cmd: clean(doc.Commands?.Command) || undefined, sha256: [...new Set(s.map((x) => clean(x.SHA256)).filter(Boolean))].slice(0, 4), company: clean(s[0]?.Company) || undefined, product: clean(s[0]?.Product) || undefined, url: `https://www.loldrivers.io/drivers/${doc.Id}/`, ref: clean(doc.Resources?.[0]) || undefined });
}
drivers.sort((a, b) => a.n.toLowerCase().localeCompare(b.n.toLowerCase()));
fs.writeFileSync(path.join(ROOT, 'assets/data/loldrivers.json'), JSON.stringify({ generated: new Date().toISOString().slice(0, 10), source: 'https://www.loldrivers.io/', count: drivers.length, drivers }));
fs.rmSync(tmp, { recursive: true, force: true });
console.log('loldrivers:', drivers.length);
