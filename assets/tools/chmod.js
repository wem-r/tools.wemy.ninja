import { $, $$, kv, msg } from '../js/tk.js';

const boxes = $$('input[data-b]');
const value = () => boxes.reduce((a, b) => a + (b.checked ? +b.dataset.b : 0), 0);
function sym(v) {
  const r = (b, ch) => (v & b ? ch : '-');
  let s = r(256, 'r') + r(128, 'w') + (v & 2048 ? (v & 64 ? 's' : 'S') : r(64, 'x')) + r(32, 'r') + r(16, 'w') + (v & 1024 ? (v & 8 ? 's' : 'S') : r(8, 'x')) + r(4, 'r') + r(2, 'w') + (v & 512 ? (v & 1 ? 't' : 'T') : r(1, 'x'));
  return s;
}
function fromSym(s) {
  s = s.trim().replace(/^[-dlbcps]?(?=[rwxsStT-]{9}$)/, '');
  if (!/^[r-][w-][xsS-][r-][w-][xsS-][r-][w-][xtT-]$/.test(s)) throw new Error('expected 9 characters like rwxr-xr-x');
  const m = [256, 128, 64, 32, 16, 8, 4, 2, 1]; let v = 0;
  [...s].forEach((c, i) => { if (c !== '-' && !'ST'.includes(c)) v += m[i]; });
  if (/[sS]/.test(s[2])) v += 2048; if (/[sS]/.test(s[5])) v += 1024; if (/[tT]/.test(s[8])) v += 512;
  return v;
}
function set(v, from) {
  boxes.forEach((b) => { b.checked = !!(v & +b.dataset.b); });
  const oct = (v & 3584 ? (v >> 9).toString(8) : '') + (v & 511).toString(8).padStart(3, '0');
  if (from !== 'oct') $('#oct').value = oct;
  if (from !== 'sym') $('#sym').value = sym(v);
  const who = (sh) => ['', 'x', 'w', 'wx', 'r', 'rx', 'rw', 'rwx'][(v >> sh) & 7];
  kv($('#out'), [['command', `chmod ${oct} file`], ['symbolic command', `chmod u=${who(6)},g=${who(3)},o=${who(0)} file`], ['ls -l', `-${sym(v)}`], ['umask that gives this for new files', ((0o666 & ~v) & 0o777).toString(8).padStart(3, '0'), 'files start from 666, directories from 777']]);
  msg($('#msg'), v & 2 && !(v & 512) ? 'world-writable: anyone on the system can modify it' : v & 2048 ? 'setuid: runs with the owner\'s privileges — audit carefully' : '', 'warn');
}
boxes.forEach((b) => b.addEventListener('change', () => set(value(), 'box')));
$('#oct').addEventListener('input', () => { const t = $('#oct').value.trim(); if (/^[0-7]{3,4}$/.test(t)) set(parseInt(t, 8), 'oct'); else msg($('#msg'), 'octal: 3 or 4 digits 0–7'); });
$('#sym').addEventListener('input', () => { try { set(fromSym($('#sym').value), 'sym'); } catch (e) { msg($('#msg'), e.message); } });
set(0o755);
