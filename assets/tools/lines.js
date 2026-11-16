import { $, $$, live } from '../js/tk.js';
import { LINE_OPS, normaliseSpaces, removeAccents, wrap, truncate } from './lib/text.js';

const inp = $('#in'), out = $('#out');
const n = (s) => (s ? s.split('\n').length : 0);
const count = () => { $('#ci').textContent = `${n(inp.value)} lines`; $('#co').textContent = `${n(out.value)} lines`; };
const unescape = (s) => s.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
const OPS = {
  spaces: (t) => normaliseSpaces(t),
  accents: (t) => removeAccents(t),
  join: (t) => t.split('\n').join(unescape($('#joiner').value)),
  split: (t) => t.split(unescape($('#splitter').value)).map((x) => x.trim()).join('\n'),
  wrap: (t) => wrap(t, +$('#width').value || 80),
  truncate: (t) => t.split('\n').map((l) => truncate(l, +$('#tlen').value || 20)).join('\n'),
  repeat: (t) => Array.from({ length: Math.min(10000, +$('#times').value || 1) }, () => t).join('\n'),
  prefix: (t) => t.split('\n').map((l) => $('#pre').value + l + $('#suf').value).join('\n'),
};
for (const b of $$('[data-op]')) b.addEventListener('click', () => {
  const op = b.dataset.op, t = inp.value;
  out.value = OPS[op] ? OPS[op](t) : LINE_OPS[op](t.split('\n')).join('\n');
  count();
});
$('#use').addEventListener('click', () => { inp.value = out.value; count(); });
live(inp, count);
