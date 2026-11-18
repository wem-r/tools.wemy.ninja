// Build assets/data/mitre-attack.json from the official ATT&CK STIX bundle.
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
import { execSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = path.join(os.tmpdir(), 'mitre.json');
execSync(`curl -sSL -o ${tmp} https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master/enterprise-attack/enterprise-attack.json`, { stdio: 'inherit' });
const trim = (s, n) => { s = (s || '').replace(/\r/g, '').trim(); return s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + '…' : s; };
const mj = JSON.parse(fs.readFileSync(tmp, 'utf8')); const techs = [];
for (const o of mj.objects) {
  if (o.type !== 'attack-pattern' || o.revoked || o.x_mitre_deprecated) continue;
  const ref = (o.external_references || []).find((r) => r.source_name === 'mitre-attack'); if (!ref) continue;
  techs.push({ id: ref.external_id, name: (o.name || '').trim(), sub: !!o.x_mitre_is_subtechnique,
    tactics: (o.kill_chain_phases || []).filter((k) => k.kill_chain_name === 'mitre-attack').map((k) => k.phase_name),
    plat: o.x_mitre_platforms || [], data: o.x_mitre_data_sources || undefined, desc: trim(o.description, 400), detect: trim(o.x_mitre_detection, 300) || undefined, url: ref.url });
}
techs.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
fs.writeFileSync(path.join(ROOT, 'assets/data/mitre-attack.json'), JSON.stringify({ generated: new Date().toISOString().slice(0, 10), source: 'https://attack.mitre.org/', count: techs.length, techniques: techs }));
console.log('mitre:', techs.length);
