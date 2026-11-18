// nmap command builder. Builds the command string from options — nothing is executed.

export const SCANS = [
  ['-sS', 'SYN / half-open (default, needs root)'],
  ['-sT', 'TCP connect (no root)'],
  ['-sU', 'UDP'],
  ['-sA', 'ACK (firewall mapping)'],
  ['-sn', 'Ping sweep — host discovery only'],
  ['-sW', 'Window'],
  ['-sN', 'TCP Null (stealth)'],
  ['-sF', 'FIN (stealth)'],
  ['-sX', 'Xmas (stealth)'],
];

export const NSE = [
  ['auth', 'bypass or use authentication'],
  ['brute', 'brute-force credentials'],
  ['default', 'the -sC set: safe, useful defaults'],
  ['discovery', 'pull more about the network / service'],
  ['dos', 'denial of service — can crash the target'],
  ['exploit', 'actively exploit a vulnerability'],
  ['external', 'sends data to third parties (e.g. whois)'],
  ['fuzzer', 'send unexpected input to find bugs'],
  ['intrusive', 'noisy / may crash or be flagged'],
  ['malware', 'check for backdoors / malware'],
  ['safe', "won't crash or exploit — informational"],
  ['version', 'improve -sV detection'],
  ['vuln', 'check for known vulnerabilities'],
];

export const PRESETS = {
  'Quick TCP': { scan: '-sT', ports: 'top', top: 1000, sv: true, sc: true, t: 4, open: true, n: false },
  'Full TCP + scripts': { scan: '-sS', ports: 'all', sv: true, sc: true, o: true, t: 4, open: true, pn: true },
  'UDP top 100': { scan: '-sU', ports: 'top', top: 100, sv: true, t: 4, open: true },
  'Host discovery': { scan: '-sn', ports: '', t: 4, n: false },
  'Vuln scan': { scan: '-sS', ports: 'top', top: 1000, sv: true, scripts: 'vuln', t: 4, open: true, pn: true },
  'Stealthy': { scan: '-sS', ports: 'top', top: 100, t: 2, pn: true, f: true, n: true },
};

const defaults = { target: '10.10.10.10', scan: '-sS', ports: 'top', top: 1000, range: '1-65535', list: '80,443,22', sv: false, svLight: false, sc: false, o: false, a: false, t: 4, pn: false, n: false, open: false, reason: false, v: 1, f: false, scripts: '', scriptArgs: '', decoys: '', source: '', iface: '', minrate: '', out: '', extra: '' };

export function build(user) {
  const o = { ...defaults, ...user };
  const p = ['nmap'];
  if (o.a) p.push('-A');
  else {
    if (o.scan) p.push(o.scan);
    if (o.o) p.push('-O');
    if (o.sv) { p.push('-sV'); if (o.svLight) p.push('--version-light'); }
    if (o.sc && !/(^|,)default(,|$)/.test(o.scripts)) p.push('-sC');
  }
  if (o.scan !== '-sn') {
    if (o.ports === 'all') p.push('-p-');
    else if (o.ports === 'fast') p.push('-F');
    else if (o.ports === 'top') p.push('--top-ports', String(o.top || 1000));
    else if (o.ports === 'range') p.push('-p', o.range || '1-65535');
    else if (o.ports === 'list') p.push('-p', (o.list || '').replace(/\s+/g, ''));
  }
  if (o.pn) p.push('-Pn');
  if (o.n) p.push('-n');
  if (o.open) p.push('--open');
  if (o.reason) p.push('--reason');
  if (typeof o.t === 'number' || /^\d$/.test(o.t)) p.push('-T' + o.t);
  if (o.scripts.trim()) p.push(`--script=${o.scripts.trim().replace(/\s+/g, '')}`);
  if (o.scriptArgs.trim()) p.push(`--script-args=${o.scriptArgs.trim()}`);
  if (o.f) p.push('-f');
  if (o.decoys.trim()) p.push('-D', o.decoys.trim());
  if (o.source.trim()) p.push('-S', o.source.trim());
  if (o.iface.trim()) p.push('-e', o.iface.trim());
  if (o.minrate.trim()) p.push('--min-rate', o.minrate.trim());
  if (+o.v === 2) p.push('-vv'); else if (+o.v === 1) p.push('-v');
  if (o.out.trim()) p.push('-oA', o.out.trim());
  if (o.extra.trim()) p.push(o.extra.trim());
  p.push(o.target.trim() || 'TARGET');
  return p.join(' ');
}
