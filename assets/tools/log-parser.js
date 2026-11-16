import { $, $$, el, live, msg, pick, download } from '../js/tk.js';
import { dropzone, bytesToText } from './lib/files.js';
import { parseLog, top, FORMATS } from './lib/logs.js';

const inp = $('#in'), MAX = 1000;
$('#year').value = new Date().getFullYear();
let parsed = null, fileText = '';

const SAMPLE = `Nov 16 03:12:01 vps sshd[2211]: Invalid user admin from 203.0.113.7 port 51422
Nov 16 03:12:03 vps sshd[2211]: Failed password for invalid user admin from 203.0.113.7 port 51422 ssh2
Nov 16 03:12:09 vps sshd[2214]: Failed password for root from 203.0.113.7 port 51430 ssh2
Nov 16 03:12:15 vps sshd[2219]: Failed password for root from 198.51.100.23 port 40002 ssh2
Nov 16 03:13:44 vps crowdsec[811]: ban 203.0.113.7 for 4h (crowdsecurity/ssh-bf)
Nov 16 08:02:10 vps sshd[3001]: Accepted publickey for wem from 192.0.2.44 port 60122 ssh2: ED25519 SHA256:abc
Nov 16 08:02:10 vps sshd[3001]: pam_unix(sshd:session): session opened for user wem(uid=1000) by (uid=0)
Nov 16 08:05:31 vps sudo:      wem : TTY=pts/0 ; PWD=/home/wem ; USER=root ; COMMAND=/usr/bin/systemctl restart nginx
Nov 16 08:40:02 vps sshd[3001]: Received disconnect from 192.0.2.44 port 60122:11: disconnected by user`;

const fmtTime = (d) => (d instanceof Date && !isNaN(d) ? d.toISOString().replace('T', ' ').slice(0, 19) : d ?? '');
const cell = (r, k) => (k === 'time' ? fmtTime(r.time) : r[k] ?? '');

function filtered() {
  const q = $('#q').value.trim(), lvl = pick('lvl');
  const terms = q ? q.match(/-?\w[\w.-]*:"[^"]*"|-?\w[\w.-]*:\S+|"[^"]*"|\S+/g) : [];
  return parsed.rows.filter((r) => {
    if (lvl === 'bad' && r._level !== 'bad') return false;
    if (lvl === 'warn' && !r._level) return false;
    return terms.every((t) => {
      const neg = t.startsWith('-'); if (neg) t = t.slice(1);
      const m = t.match(/^([\w.-]+):(.*)$/);
      let hit;
      if (m && parsed.columns.some(([k]) => k === m[1])) hit = String(cell(r, m[1])).toLowerCase().includes(m[2].replace(/"/g, '').toLowerCase());
      else { const s = t.replace(/"/g, '').toLowerCase(); hit = parsed.columns.some(([k]) => String(cell(r, k)).toLowerCase().includes(s)) || String(r.message || '').toLowerCase().includes(s); }
      return neg ? !hit : hit;
    });
  });
}

function table() {
  const rows = filtered();
  msg($('#cnt'), `${rows.length.toLocaleString()} of ${parsed.rows.length.toLocaleString()} rows${rows.length > MAX ? ` · first ${MAX} shown` : ''}`, 'ok');
  $('#tbl').replaceChildren(
    el('tr', {}, ...parsed.columns.map(([, l]) => el('th', { text: l }))),
    ...rows.slice(0, MAX).map((r) => el('tr', { class: r._level || '' }, ...parsed.columns.map(([k]) => el('td', { text: String(cell(r, k)).slice(0, 300), title: k === 'message' || k === 'agent' ? String(r[k] ?? '') : null })))),
  );
}

function stats() {
  $('#stats').replaceChildren(...parsed.stats.map(([k, label]) => {
    const t = top(parsed.rows, k, 8);
    if (!t.length) return null;
    return el('div', {}, el('div', { class: 'tk-sec', text: label }), el('table', { class: 'tk-list' }, ...t.map(([v, n]) => el('tr', {},
      el('td', {}, el('a', { href: '#', text: v.length > 60 ? v.slice(0, 57) + '…' : v, onclick: (e) => { e.preventDefault(); $('#q').value = `${k}:"${v}"`; table(); } })),
      el('td', { class: 'dim', style: 'text-align:right', text: n.toLocaleString() })))));
  }));
}

const run = () => {
  const text = fileText || inp.value;
  if (!text.trim()) { $('#res').hidden = true; msg($('#msg'), ''); return; }
  try { parsed = parseLog(text, $('#fmt').value, +$('#year').value); }
  catch (e) { msg($('#msg'), e.message); $('#res').hidden = true; return; }
  const span = parsed.rows.filter((r) => r.time instanceof Date && !isNaN(r.time)).map((r) => r.time.getTime());
  msg($('#msg'), `${FORMATS[parsed.format]} · ${parsed.rows.length.toLocaleString()} rows${parsed.bad ? ` · ${parsed.bad} lines not understood` : ''}${span.length ? ` · ${fmtTime(new Date(Math.min(...span)))} → ${fmtTime(new Date(Math.max(...span)))}` : ''}`, parsed.bad ? 'warn' : 'ok');
  $('#res').hidden = false;
  stats(); table();
};
inp.addEventListener('input', () => { fileText = ''; run(); });
live([$('#fmt'), $('#year')], run, ['change']);
live([$('#q'), ...$$('input[name="lvl"]')], () => parsed && table());
$('#sample').addEventListener('click', () => { fileText = ''; inp.value = SAMPLE; run(); });
dropzone($('#drop'), async (files) => {
  const parts = [];
  for (const f of files) {
    let b = new Uint8Array(await f.arrayBuffer());
    if (b[0] === 0x1f && b[1] === 0x8b) b = new Uint8Array(await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
    parts.push(bytesToText(b));
  }
  fileText = parts.join('\n');
  inp.value = '';
  inp.placeholder = `${files.map((f) => f.name).join(', ')} loaded (${fileText.length.toLocaleString()} characters) — paste here to replace`;
  run();
});
$('#csv').addEventListener('click', () => {
  const esc = (v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const rows = filtered();
  download('log-export.csv', [parsed.columns.map(([, l]) => esc(l)).join(','), ...rows.map((r) => parsed.columns.map(([k]) => esc(String(cell(r, k)))).join(','))].join('\n'), 'text/csv');
});
