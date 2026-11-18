// Build assets/data/lolbins.json from GTFOBins, LOLBAS and WADComs.
// Usage: node scripts/gen-lolbins.mjs   (clones the three repos into a temp dir)
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lol-'));
const clone = (url, dir) => execSync(`git clone -q --depth 1 ${url} ${path.join(tmp, dir)}`, { stdio: 'inherit' });
clone('https://github.com/GTFOBins/GTFOBins.github.io.git', 'gtfobins');
clone('https://github.com/LOLBAS-Project/LOLBAS.git', 'lolbas');
clone('https://github.com/WADComs/WADComs.github.io.git', 'wadcoms');

const clean = (s) => (s == null ? '' : String(s).replace(/\r/g, '').trim());
const bins = [];

const gdir = path.join(tmp, 'gtfobins/_gtfobins');
for (const name of fs.readdirSync(gdir)) {
  const doc = yaml.load(fs.readFileSync(path.join(gdir, name), 'utf8'));
  if (!doc?.functions) continue;
  const fns = [];
  for (const [f, entries] of Object.entries(doc.functions)) for (const e of entries || []) {
    const ctx = e.contexts && typeof e.contexts === 'object' ? Object.keys(e.contexts) : [];
    fns.push({ f, code: clean(e.code), c: clean(e.comment), ctx: ctx.length ? ctx : undefined });
  }
  bins.push({ n: name, src: 'gtfobins', os: 'unix', url: `https://gtfobins.github.io/gtfobins/${encodeURIComponent(name)}/`, fns });
}

const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : path.join(d, e.name));
for (const file of walk(path.join(tmp, 'lolbas/yml')).filter((f) => f.endsWith('.yml'))) {
  const doc = yaml.load(fs.readFileSync(file, 'utf8'));
  if (!doc?.Name) continue;
  const fns = (doc.Commands || []).map((c) => ({ f: clean(c.Category) || 'Execute', code: clean(c.Command), c: clean(c.Description), use: clean(c.Usecase) || undefined, priv: clean(c.Privileges) || undefined, mitre: clean(c.MitreID) || undefined }));
  const paths = (doc.Full_Path || []).map((p) => clean(p.Path)).filter(Boolean);
  const kind = doc.Name.match(/\.dll$/i) ? 'libraries' : doc.Name.match(/\.(ps1)$/i) ? 'scripts' : 'binaries';
  bins.push({ n: doc.Name.replace(/\.exe$/i, ''), src: 'lolbas', os: 'windows', url: `https://lolbas-project.github.io/lolbas/${kind}/${doc.Name.replace(/\.[^.]+$/, '')}/`, desc: clean(doc.Description), full: doc.Name, paths: paths.length ? paths : undefined, fns });
}

const wdir = path.join(tmp, 'wadcoms/_wadcoms');
for (const file of fs.readdirSync(wdir).filter((f) => f.endsWith('.md'))) {
  const m = fs.readFileSync(path.join(wdir, file), 'utf8').match(/^---\n([\s\S]*?)\n---/);
  if (!m) continue;
  const doc = yaml.load(m[1]); if (!doc?.command) continue;
  const slug = file.replace(/\.md$/, '');
  bins.push({ n: slug.replace(/-/g, ' '), src: 'wadcoms', os: 'ad', url: `https://wadcoms.github.io/wadcoms/${slug}/`, desc: clean(doc.description).split('\n')[0], tool: clean(doc.command).split('\n')[0].trim().split(/\s+/)[0], svc: doc.services, atk: doc.attack_types, nos: doc.OS, fns: [{ f: (doc.attack_types || ['Command'])[0], code: clean(doc.command), c: clean(doc.description).split('\n')[0] }] });
}

bins.sort((a, b) => a.n.toLowerCase().localeCompare(b.n.toLowerCase()) || a.src.localeCompare(b.src));
const counts = Object.fromEntries(['gtfobins', 'lolbas', 'wadcoms'].map((s) => [s, bins.filter((b) => b.src === s).length]));
fs.writeFileSync(path.join(ROOT, 'assets/data/lolbins.json'), JSON.stringify({ generated: new Date().toISOString().slice(0, 10), sources: { gtfobins: 'https://gtfobins.github.io/', lolbas: 'https://lolbas-project.github.io/', wadcoms: 'https://wadcoms.github.io/' }, counts, bins }));
fs.rmSync(tmp, { recursive: true, force: true });
console.log('wrote assets/data/lolbins.json —', bins.length, 'binaries', counts);
