import { $, live, msg } from '../js/tk.js';
import { parseIPv4, toDotted, parseNet, netInfo } from './lib/ipv4.js';

/** Smallest list of CIDR blocks covering start..end (inclusive). */
export function rangeToCidrs(a, b) {
  const out = [];
  while (a <= b) {
    let size = 32;
    while (size > 0) { const mask = 2 ** (32 - (size - 1)); if (a % mask !== 0 || a + mask - 1 > b) break; size--; }
    out.push([a, size]); a += 2 ** (32 - size);
  }
  return out;
}
live($('#in'), () => {
  const t = $('#in').value.trim(); $('#cidr').value = ''; $('#list').value = ''; $('#cnt').textContent = '';
  if (!t) return msg($('#msg'), '');
  try {
    let ranges = [];
    for (const line of t.split(/\n|,/).map((l) => l.trim()).filter(Boolean)) {
      const m = line.match(/^([\d.]+)\s*(?:-|–|to)\s*([\d.]+)$/);
      if (m) { const a = parseIPv4(m[1]), b = parseIPv4(m[2]); if (b < a) throw new Error(`${line}: end before start`); ranges.push([a, b]); }
      else { const n = parseNet(line), i = netInfo(n.ip, n.prefix); ranges.push([i.network, i.broadcast]); }
    }
    ranges.sort((x, y) => x[0] - y[0]);
    const merged = [];
    for (const r of ranges) { const l = merged.at(-1); if (l && r[0] <= l[1] + 1) l[1] = Math.max(l[1], r[1]); else merged.push([...r]); }
    const cidrs = merged.flatMap(([a, b]) => rangeToCidrs(a, b));
    $('#cidr').value = cidrs.map(([a, p]) => `${toDotted(a)}/${p}`).join('\n');
    const total = merged.reduce((s, [a, b]) => s + b - a + 1, 0);
    $('#cnt').textContent = `${total.toLocaleString()} addresses${total > 4096 ? ' · first 4096 listed' : ''}`;
    const list = []; for (const [a, b] of merged) for (let x = a; x <= b && list.length < 4096; x++) list.push(toDotted(x));
    $('#list').value = list.join('\n');
    msg($('#msg'), `${merged.length} range(s) → ${cidrs.length} CIDR block(s)`, 'ok');
  } catch (e) { msg($('#msg'), e.message); }
});
