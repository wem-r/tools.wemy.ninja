import { $, $$, live, msg, pick } from '../js/tk.js';
import { jsonError } from './lib/jsonerr.js';

const inp = $('#in'), out = $('#out');
const sortKeys = (v) => (Array.isArray(v) ? v.map(sortKeys) : v && typeof v === 'object'
  ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])])) : v);

live([inp, $('#sort'), $('#ascii'), ...$$('input[name="op"]')], () => {
  const t = inp.value;
  if (!t.trim()) { out.value = ''; msg($('#msg'), ''); return; }
  let v;
  try { v = JSON.parse(t); }
  catch (e) {
    const w = jsonError(t);
    msg($('#msg'), w ? `line ${w.line}, column ${w.col}: ${w.msg} — click to select it` : e.message);
    inp.dataset.err = w ? w.pos : -1;
    out.value = '';
    return;
  }
  if ($('#sort').checked) v = sortKeys(v);
  const op = pick('op');
  let s = JSON.stringify(v, null, op === 'min' ? 0 : op === 'tab' ? '\t' : +op);
  if ($('#ascii').checked) s = s.replace(/[\u007f-￿]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
  out.value = s;
  const n = (x) => (Array.isArray(x) ? x.reduce((a, y) => a + n(y), 1) : x && typeof x === 'object' ? Object.values(x).reduce((a, y) => a + n(y), 1) : 1);
  msg($('#msg'), `valid JSON · ${n(v).toLocaleString()} values · ${new Blob([s]).size.toLocaleString()} bytes out`, 'ok');
});
$('#msg').addEventListener('click', () => { const p = +inp.dataset.err; if (p >= 0) { inp.focus(); inp.setSelectionRange(p, p + 1); } });
