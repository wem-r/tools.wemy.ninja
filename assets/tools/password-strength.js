import { $, kv, live, msg } from '../js/tk.js';
import { analyse, crackTime } from './lib/strength.js';

const inp = $('#in');
$('#show').addEventListener('change', (e) => { inp.type = e.target.checked ? 'text' : 'password'; });
const COLOURS = ['var(--line-soft)', 'var(--pink)', 'var(--pink)', 'var(--yel)', 'var(--green)', 'var(--cyan)'];
live(inp, () => {
  const r = analyse(inp.value);
  $('#bar').style.width = `${Math.min(100, (r.bits / 100) * 100)}%`;
  $('#bar').style.background = COLOURS[r.score];
  msg($('#msg'), r.len ? `${r.label} — about ${r.bits} bits` : '', r.score >= 4 ? 'ok' : r.score === 3 ? 'warn' : 'err');
  kv($('#out'), r.len ? [
    ['length', String(r.len)],
    ['character pool', String(r.pool)],
    ['estimated entropy', `${r.bits} bits`],
    ['issues', r.issues.join(' · ') || 'none found'],
  ] : []);
  kv($('#times'), r.len ? [
    ['online, throttled (10 / s)', crackTime(r.bits, 10)],
    ['online, unthrottled (1 000 / s)', crackTime(r.bits, 1e3)],
    ['offline, bcrypt cost 10 on a GPU rig (≈ 100 k / s)', crackTime(r.bits, 1e5)],
    ['offline, fast hash like MD5 / NTLM (≈ 100 G / s)', crackTime(r.bits, 1e11)],
  ].map(([k, v]) => [k, v]) : []);
  for (const c of $('#times').querySelectorAll('td.c')) c.replaceChildren();
});
