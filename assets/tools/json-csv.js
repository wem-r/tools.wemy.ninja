import { $, $$, live, msg, pick, download } from '../js/tk.js';
import { parseCSV } from './lib/csv.js';

const flatten = (o, p = '', out = {}) => { for (const [k, v] of Object.entries(o ?? {})) { const key = p ? `${p}.${k}` : k; if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out); else out[key] = Array.isArray(v) ? JSON.stringify(v) : v; } return out; };
const unflatten = (o) => { const r = {}; for (const [k, v] of Object.entries(o)) { const ps = k.split('.'); let c = r; ps.slice(0, -1).forEach((p) => { c = c[p] ??= {}; }); c[ps.at(-1)] = v; } return r; };
const typed = (s) => (s === '' ? '' : /^-?\d+(\.\d+)?$/.test(s) && !/^0\d/.test(s) ? Number(s) : s === 'true' ? true : s === 'false' ? false : s === 'null' ? null : /^[[{]/.test(s) ? (() => { try { return JSON.parse(s); } catch { return s; } })() : s);
live([$('#in'), $('#sep'), $('#flat'), $('#types'), ...$$('input[name="dir"]')], () => {
  const t = $('#in').value, sep = $('#sep').value === '&#9;' || $('#sep').value === '\t' ? '\t' : $('#sep').value;
  if (!t.trim()) { $('#out').value = ''; return; }
  try {
    if (pick('dir') === 'j2c') {
      let data = JSON.parse(t); if (!Array.isArray(data)) data = [data];
      const rows = data.map((r) => ($('#flat').checked ? flatten(r) : Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v && typeof v === 'object' ? JSON.stringify(v) : v]))));
      const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
      const q = (v) => { const s = v == null ? '' : String(v); return new RegExp(`["\\n\\r${sep === '\t' ? '\\t' : sep}]`).test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
      $('#out').value = [cols.map(q).join(sep), ...rows.map((r) => cols.map((c) => q(r[c])).join(sep))].join('\n');
      msg($('#msg'), `${rows.length} rows · ${cols.length} columns`, 'ok');
    } else {
      const { rows } = parseCSV(t, sep); const [head, ...body] = rows;
      const objs = body.map((r) => { const o = Object.fromEntries(head.map((h, i) => [h, $('#types').checked ? typed(r[i] ?? '') : r[i] ?? ''])); return $('#flat').checked ? unflatten(o) : o; });
      $('#out').value = JSON.stringify(objs, null, 2);
      msg($('#msg'), `${objs.length} objects`, 'ok');
    }
  } catch (e) { $('#out').value = ''; msg($('#msg'), e.message); }
});
$('#dl').addEventListener('click', () => $('#out').value && download(pick('dir') === 'j2c' ? 'data.csv' : 'data.json', $('#out').value));
