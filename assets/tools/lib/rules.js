// Sigma and YARA rule skeleton builders. Produce a well-formed starting point to edit.

const today = () => new Date().toISOString().slice(0, 10);
const yamlStr = (s) => (/[:#]/.test(s) ? `'${s.replace(/'/g, "''")}'` : s);

export function sigma(o) {
  const sel = {};
  for (const line of (o.fields || '').split('\n').map((l) => l.trim()).filter(Boolean)) {
    const m = line.match(/^([^:=]+)\s*[:=]\s*(.+)$/);
    if (m) sel[m[1].trim()] = m[2].trim();
  }
  const selLines = Object.keys(sel).length
    ? Object.entries(sel).map(([k, v]) => `        ${k}: ${yamlStr(v)}`).join('\n')
    : `        Image|endswith: '\\\\example.exe'\n        CommandLine|contains: 'suspicious'`;
  return `title: ${o.title || 'Suspicious Activity'}
id: ${o.id || crypto.randomUUID()}
status: ${o.status || 'experimental'}
description: ${o.desc || 'Describe what this detects'}
references:
    - https://attack.mitre.org/techniques/${(o.mitre || 'T1059').replace('.', '/')}
author: ${o.author || 'wem'}
date: ${today()}
tags:
    - attack.${o.tactic || 'execution'}
    - attack.${(o.mitre || 't1059').toLowerCase()}
logsource:
    category: ${o.logsource || 'process_creation'}
    product: ${o.product || 'windows'}
detection:
    selection:
${selLines}
    condition: selection
falsepositives:
    - Unknown
level: ${o.level || 'medium'}`;
}

export function yara(o) {
  const name = (o.name || 'suspicious_sample').replace(/[^A-Za-z0-9_]/g, '_');
  const strings = [];
  let i = 0;
  for (const s of (o.strings || '').split('\n').map((l) => l.trim()).filter(Boolean)) {
    if (/^[0-9a-fA-F\s]{6,}$/.test(s) && s.replace(/\s/g, '').length % 2 === 0) strings.push(`        $h${i++} = { ${s.replace(/(..)/g, '$1 ').trim()} }`);
    else strings.push(`        $s${i++} = ${JSON.stringify(s)}`);
  }
  if (!strings.length) { strings.push('        $s0 = "malicious string" ascii wide', '        $h0 = { 4D 5A 90 00 }'); }
  const hashes = (o.hashes || '').split(/[\s,]+/).filter(Boolean);
  const hashMeta = hashes.map((h, n) => `        hash${n} = "${h}"`).join('\n');
  return `rule ${name}
{
    meta:
        description = "${o.desc || 'Describe the detection'}"
        author = "${o.author || 'wem'}"
        date = "${today()}"
        reference = "${o.ref || ''}"
${hashMeta ? hashMeta + '\n' : ''}    strings:
${strings.join('\n')}
    condition:
        ${o.condition || (strings.some((s) => s.includes('$h')) ? 'uint16(0) == 0x5A4D and any of them' : 'any of them')}
}`;
}
