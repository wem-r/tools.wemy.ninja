// Log parsing: web server, syslog / auth.log / journalctl, Windows events (XML / CSV export), JSON lines, CSV. Pure.
import { parseCSV } from './csv.js';

const MON = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

const RE = {
  access: /^(\S+) (\S+) (\S+) \[([^\]]+)\] "(\S+)? ?(.*?) ?(HTTP\/[\d.]+)?" (\d{3}|-) (\d+|-)(?: "([^"]*)" "([^"]*)")?/,
  nginxErr: /^(\d{4}\/\d\d\/\d\d \d\d:\d\d:\d\d) \[(\w+)\] (\d+)#\d+: (?:\*\d+ )?(.*)$/,
  apacheErr: /^\[([^\]]+)\] \[(?:([\w-]+):)?(\w+)\](?: \[pid (\d+)(?::tid \d+)?\])?(?: \[client ([^\]]+)\])? (.*)$/,
  syslog: /^([A-Z][a-z]{2}) +(\d{1,2}) (\d\d:\d\d:\d\d) (\S+) ([^:\[\s]+)(?:\[(\d+)\])?: ?(.*)$/,
  isoSyslog: /^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:?\d\d)?) (\S+) ([^:\[\s]+)(?:\[(\d+)\])?: ?(.*)$/,
};

/** Access-log date "16/Nov/2026:12:00:01 +0100" → Date */
function accessDate(s) {
  const m = s.match(/^(\d\d)\/(\w{3})\/(\d{4}):(\d\d):(\d\d):(\d\d) ([+-]\d{4})$/);
  if (!m) return null;
  const off = (m[7][0] === '-' ? -1 : 1) * (+m[7].slice(1, 3) * 60 + +m[7].slice(3));
  return new Date(Date.UTC(+m[3], MON[m[2].toLowerCase()], +m[1], +m[4], +m[5], +m[6]) - off * 60000);
}

/** Classify an auth / sshd / sudo message. */
export function authEvent(prog, msg) {
  let m;
  const ip = (msg.match(/\bfrom ((?:\d{1,3}\.){3}\d{1,3}|[0-9a-f:]{3,})/i) || msg.match(/\brhost=(\S+)/) || [])[1] || '';
  if (/^sshd/.test(prog)) {
    if ((m = msg.match(/^Accepted (\S+) for (\S+)/))) return { event: `ssh login ok (${m[1]})`, user: m[2], ip, level: 'ok' };
    if ((m = msg.match(/^Failed (\S+) for (?:invalid user )?(\S+)/))) return { event: `ssh failed ${m[1]}`, user: m[2], ip, level: 'bad' };
    if ((m = msg.match(/^Invalid user (\S*)/))) return { event: 'ssh invalid user', user: m[1], ip, level: 'bad' };
    if (/Connection closed by|Disconnected from|Received disconnect/.test(msg)) return { event: 'ssh disconnect', user: (msg.match(/user (\S+)/) || [])[1] || '', ip, level: '' };
    if (/maximum authentication attempts|Too many authentication failures/.test(msg)) return { event: 'ssh too many failures', user: (msg.match(/for (?:invalid user )?(\S+)/) || [])[1] || '', ip, level: 'bad' };
    if (/session opened/.test(msg)) return { event: 'session opened', user: (msg.match(/for user ([^\s(]+)/) || [])[1] || '', ip, level: '' };
  }
  if (/^sudo/.test(prog)) {
    if ((m = msg.match(/^\s*(\S+) : .*COMMAND=(.*)$/))) return { event: `sudo ${m[2].slice(0, 60)}`, user: m[1], ip, level: /incorrect password|NOT in sudoers/.test(msg) ? 'bad' : 'warn' };
    if (/authentication failure/.test(msg)) return { event: 'sudo auth failure', user: (msg.match(/ user=(\S+)/) || [])[1] || '', ip, level: 'bad' };
  }
  if (/authentication failure/.test(msg)) return { event: 'auth failure', user: (msg.match(/ user=(\S+)/) || [])[1] || '', ip, level: 'bad' };
  if ((m = msg.match(/session (opened|closed) for user ([^\s(]+)/))) return { event: `session ${m[1]}`, user: m[2], ip, level: '' };
  if (/crowdsec|fail2ban/i.test(prog + msg) && /ban/i.test(msg)) return { event: 'ban', user: '', ip: (msg.match(/(?:\d{1,3}\.){3}\d{1,3}/) || [])[0] || ip, level: 'warn' };
  return { event: '', user: '', ip, level: '' };
}

export const WIN_EVENTS = {
  1102: 'audit log cleared', 4616: 'system time changed', 4624: 'logon', 4625: 'logon failed', 4634: 'logoff', 4647: 'logoff (user initiated)',
  4648: 'logon with explicit credentials', 4657: 'registry value modified', 4663: 'object access', 4672: 'special privileges assigned',
  4688: 'process created', 4689: 'process exited', 4697: 'service installed', 4698: 'scheduled task created', 4699: 'scheduled task deleted',
  4700: 'scheduled task enabled', 4702: 'scheduled task updated', 4719: 'audit policy changed', 4720: 'user account created',
  4722: 'user account enabled', 4723: 'password change attempt', 4724: 'password reset attempt', 4725: 'user account disabled',
  4726: 'user account deleted', 4728: 'member added to global group', 4732: 'member added to local group', 4738: 'user account changed',
  4740: 'account locked out', 4756: 'member added to universal group', 4767: 'account unlocked', 4768: 'Kerberos TGT requested',
  4769: 'Kerberos service ticket requested', 4771: 'Kerberos pre-auth failed', 4776: 'NTLM credential validation', 4778: 'RDP session reconnected',
  4779: 'RDP session disconnected', 4798: 'local group membership enumerated', 4799: 'local group membership enumerated',
  5140: 'network share accessed', 5145: 'network share object checked', 5156: 'connection allowed (WFP)', 7034: 'service crashed',
  7036: 'service state changed', 7040: 'service start type changed', 7045: 'service installed', 4103: 'PowerShell module logging',
  4104: 'PowerShell script block', 1074: 'shutdown / restart initiated', 6005: 'event log started', 6006: 'event log stopped', 6008: 'unexpected shutdown',
  1116: 'Defender: malware detected', 1117: 'Defender: action taken', 5001: 'Defender: real-time protection disabled',
};
const LOGON_TYPES = { 2: 'interactive', 3: 'network', 4: 'batch', 5: 'service', 7: 'unlock', 8: 'network cleartext', 9: 'new credentials', 10: 'RDP', 11: 'cached' };

function winRow(id, time, provider, level, computer, data) {
  const ev = WIN_EVENTS[id] || '';
  const user = data.TargetUserName || data.SubjectUserName || data.AccountName || data.User || '';
  const ip = data.IpAddress && data.IpAddress !== '-' ? data.IpAddress : data.WorkstationName || '';
  const lt = data.LogonType ? LOGON_TYPES[data.LogonType] || data.LogonType : '';
  const bad = [4625, 4771, 4740, 1102, 4720, 4726, 4719, 7045, 4697, 1116, 5001, 6008].includes(+id);
  return { time, id: String(id), event: ev + (lt ? ` (${lt})` : ''), provider, level, computer, user, ip, _level: bad ? 'bad' : [4624, 4634].includes(+id) ? '' : 'warn', data };
}

/** Windows "Save all events as… XML" export (or wevtutil qe /f:xml). Needs DOMParser (browser). */
export function parseWinXML(text, DOMParserImpl = globalThis.DOMParser) {
  const doc = new DOMParserImpl().parseFromString(text.trim().startsWith('<Events') ? text : `<Events>${text}</Events>`, 'application/xml');
  const evs = [...doc.getElementsByTagName('Event')];
  return evs.map((e) => {
    const g = (tag) => e.getElementsByTagName(tag)[0];
    const data = {};
    for (const d of e.getElementsByTagName('Data')) if (d.getAttribute('Name')) data[d.getAttribute('Name')] = d.textContent;
    const t = g('TimeCreated')?.getAttribute('SystemTime');
    const lvl = { 1: 'critical', 2: 'error', 3: 'warning', 4: 'information', 0: 'information' }[g('Level')?.textContent] || g('Level')?.textContent || '';
    return winRow(+(g('EventID')?.textContent || 0), t ? new Date(t) : null, g('Provider')?.getAttribute('Name') || '', lvl, g('Computer')?.textContent || '', data);
  });
}

/** Event Viewer "Save as… CSV": Level, Date and Time, Source, Event ID, Task Category, (Description). */
function parseWinCSV(rows) {
  const h = rows[0].map((x) => x.trim().toLowerCase());
  const ix = (re) => h.findIndex((x) => re.test(x));
  const L = ix(/^level|^niveau/), T = ix(/date/), S = ix(/^source/), I = ix(/event id|id de l/), D = h.length > 5 ? 5 : -1;
  return rows.slice(1).map((r) => {
    const desc = D >= 0 ? r[D] || '' : r.slice(5).join(',');
    const data = {};
    for (const m of desc.matchAll(/^\s*(Account Name|Nom du compte|Source Network Address|Adresse du réseau source|Logon Type|Type d'ouverture de session):\s*(.+)$/gim)) {
      const k = /account|compte/i.test(m[1]) ? 'TargetUserName' : /network|réseau/i.test(m[1]) ? 'IpAddress' : 'LogonType';
      if (k !== 'TargetUserName' || !/^-$|\$$/.test(m[2].trim())) data[k] = m[2].trim();
    }
    const d = new Date(r[T]);
    const row = winRow(+r[I], isNaN(d) ? null : d, r[S] || '', (r[L] || '').toLowerCase(), '', data);
    row.message = desc.split('\n')[0];
    return row;
  });
}

const tryJSON = (l) => { try { const v = JSON.parse(l); return v && typeof v === 'object' && !Array.isArray(v) ? v : null; } catch { return null; } };

/** Detect the format of a log text. */
export function detect(text) {
  const t = text.replace(/^\uFEFF/, '').trimStart();
  if (/^<\?xml|^<Events|^<Event[\s>]/.test(t)) return 'windows-xml';
  const lines = t.split(/\r?\n/).filter(Boolean).slice(0, 30);
  if (/^"?(level|niveau)"?[,;]/i.test(lines[0] || '') && /event id|id de l/i.test(lines[0])) return 'windows-csv';
  const score = (re) => lines.filter((l) => re.test(l)).length;
  const counts = {
    access: score(RE.access), 'nginx-error': score(RE.nginxErr), 'apache-error': score(RE.apacheErr),
    syslog: score(RE.syslog) + score(RE.isoSyslog), json: lines.filter((l) => tryJSON(l)).length,
  };
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  if (best[1] >= Math.max(1, lines.length * 0.5)) return best[0];
  if (lines.length > 1 && lines[0].split(/[,;\t]/).length > 2 && lines.every((l) => l.split(/[,;\t]/).length >= lines[0].split(/[,;\t]/).length - 1)) return 'csv';
  return 'raw';
}

export const FORMATS = {
  access: 'web access log (combined / common)', 'nginx-error': 'nginx error log', 'apache-error': 'Apache error log',
  syslog: 'syslog / auth.log / journalctl', 'windows-xml': 'Windows events (XML)', 'windows-csv': 'Windows events (Event Viewer CSV)',
  json: 'JSON lines', csv: 'CSV / TSV', raw: 'plain text (one row per line)',
};

/** Parse a log text → { format, columns: [key, label][], rows: object[], stats: [key, label][], bad: n } */
export function parseLog(text, format = 'auto', year = new Date().getFullYear()) {
  const fmt = format === 'auto' ? detect(text) : format;
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  let rows = [], columns, stats, bad = 0;
  if (fmt === 'access') {
    columns = [['time', 'time'], ['ip', 'client'], ['method', 'method'], ['path', 'path'], ['status', 'status'], ['bytes', 'bytes'], ['referer', 'referer'], ['agent', 'user agent']];
    stats = [['ip', 'top clients'], ['status', 'status codes'], ['path', 'top paths'], ['agent', 'user agents'], ['method', 'methods']];
    for (const l of lines) {
      const m = l.match(RE.access);
      if (!m) { bad++; continue; }
      const st = m[8];
      rows.push({ time: accessDate(m[4]), ip: m[1], user: m[3] === '-' ? '' : m[3], method: m[5] || '', path: m[6] || '', status: st, bytes: m[9] === '-' ? '0' : m[9], referer: m[10] && m[10] !== '-' ? m[10] : '', agent: m[11] || '', _level: st >= '500' ? 'bad' : st >= '400' ? 'warn' : '' });
    }
  } else if (fmt === 'nginx-error' || fmt === 'apache-error') {
    columns = [['time', 'time'], ['level', 'level'], ['ip', 'client'], ['message', 'message']];
    stats = [['level', 'levels'], ['ip', 'top clients'], ['message', 'top messages']];
    for (const l of lines) {
      let m;
      if (fmt === 'nginx-error' && (m = l.match(RE.nginxErr))) {
        const rest = m[4], cut = rest.search(/, client: /);
        rows.push({ time: new Date(m[1].replace(/\//g, '-').replace(' ', 'T')), level: m[2], ip: (rest.match(/, client: ([^,\s]+)/) || [])[1] || '',
          message: cut >= 0 ? rest.slice(0, cut) : rest, request: (rest.match(/, request: "([^"]*)"/) || [])[1] || '' });
      }
      else if (fmt === 'apache-error' && (m = l.match(RE.apacheErr))) { const d = new Date(m[1]); rows.push({ time: isNaN(d) ? null : d, level: m[3], ip: (m[5] || '').replace(/:\d+$/, ''), message: m[6] }); }
      else { bad++; continue; }
      const lv = rows.at(-1).level;
      rows.at(-1)._level = /emerg|alert|crit|error/.test(lv) ? 'bad' : /warn/.test(lv) ? 'warn' : '';
    }
  } else if (fmt === 'syslog') {
    columns = [['time', 'time'], ['host', 'host'], ['prog', 'program'], ['event', 'event'], ['user', 'user'], ['ip', 'ip'], ['message', 'message']];
    stats = [['event', 'events'], ['ip', 'top IPs'], ['user', 'top users'], ['prog', 'programs']];
    for (const l of lines) {
      let m, r;
      if ((m = l.match(RE.syslog))) r = { time: new Date(year, MON[m[1].toLowerCase()], +m[2], ...m[3].split(':').map(Number)), host: m[4], prog: m[5], pid: m[6] || '', message: m[7] };
      else if ((m = l.match(RE.isoSyslog))) r = { time: new Date(m[1]), host: m[2], prog: m[3], pid: m[4] || '', message: m[5] };
      else { bad++; continue; }
      const a = authEvent(r.prog, r.message);
      rows.push({ ...r, event: a.event, user: a.user, ip: a.ip, _level: a.level === 'ok' ? '' : a.level });
    }
  } else if (fmt === 'windows-xml' || fmt === 'windows-csv') {
    columns = [['time', 'time'], ['id', 'event ID'], ['event', 'event'], ['level', 'level'], ['user', 'user'], ['ip', 'ip / workstation'], ['provider', 'source']];
    stats = [['event', 'events'], ['user', 'top users'], ['ip', 'top IPs'], ['id', 'event IDs']];
    rows = fmt === 'windows-xml' ? parseWinXML(text) : parseWinCSV(parseCSV(text).rows);
  } else if (fmt === 'json') {
    const keys = new Map();
    for (const l of lines) {
      const o = tryJSON(l);
      if (!o) { bad++; continue; }
      const flat = {};
      const walk = (v, p) => { if (v && typeof v === 'object' && !Array.isArray(v)) for (const [k, x] of Object.entries(v)) walk(x, p ? `${p}.${k}` : k); else flat[p] = Array.isArray(v) ? JSON.stringify(v) : v; };
      walk(o, '');
      for (const k of Object.keys(flat)) keys.set(k, (keys.get(k) || 0) + 1);
      rows.push(flat);
    }
    const ks = [...keys.keys()].slice(0, 12);
    const tk = ks.find((k) => /^(@?timestamp|time|ts|date|datetime)$/i.test(k.split('.').pop()));
    if (tk) for (const r of rows) { const v = r[tk]; const d = typeof v === 'number' ? new Date(v < 1e11 ? v * 1000 : v) : new Date(v); r.time = isNaN(d) ? null : d; }
    columns = [...(tk ? [['time', 'time']] : []), ...ks.filter((k) => k !== tk).map((k) => [k, k])];
    stats = ks.filter((k) => /level|severity|status|ip|addr|host|user|method|event|action|msg|message/i.test(k)).slice(0, 5).map((k) => [k, k]);
    for (const r of rows) { const lv = String(r.level ?? r.severity ?? r.status ?? ''); r._level = /err|crit|fatal|^5\d\d$/i.test(lv) ? 'bad' : /warn|^4\d\d$/i.test(lv) ? 'warn' : ''; }
  } else if (fmt === 'csv') {
    const { rows: rr } = parseCSV(text);
    const head = rr[0].map((h, i) => h.trim() || `col${i + 1}`);
    columns = head.map((h) => [h, h]);
    rows = rr.slice(1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
    stats = head.slice(0, 4).map((h) => [h, h]);
  } else {
    columns = [['n', '#'], ['message', 'line']];
    stats = [];
    rows = lines.map((l, i) => ({ n: String(i + 1), message: l }));
  }
  return { format: fmt, columns, rows, stats, bad };
}

/** Top-N values of a key: [[value, count], …] */
export function top(rows, key, n = 10) {
  const m = new Map();
  for (const r of rows) { const v = r[key]; if (v === '' || v == null) continue; m.set(String(v), (m.get(String(v)) || 0) + 1); }
  return [...m].sort((a, b) => b[1] - a[1]).slice(0, n);
}
