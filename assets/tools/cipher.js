import { $, $$, el, live, msg, pick } from '../js/tk.js';
import { get } from './lib/ciphers/index.js';

const root = $('#cipher'), c = get(root.dataset.id);
if (!c) throw new Error(`unknown cipher ${root.dataset.id}`);
const inp = $('#in'), out = $('#out');

// modes: encode / decode (labels can be overridden), crack, or a single "run"
const modes = c.modes || [...(c.enc ? ['enc'] : []), ...(c.dec ? ['dec'] : []), ...(c.crack ? ['crack'] : [])];
const LABEL = { enc: 'encode', dec: 'decode', crack: 'crack (try all keys)', run: 'run' };
$('#modes').append(el('div', { class: 'tk-seg' }, ...modes.map((m, i) => el('label', {}, el('input', { type: 'radio', name: 'mode', value: m, checked: i === 0 }), el('span', { text: c.labels?.[i] ?? LABEL[m] })))));
if (modes.length < 2) $('#modes').hidden = true;

$('#params').append(...c.params.map((p) => {
  let input;
  if (p.type === 'select') input = el('select', { 'data-p': p.id }, ...p.opts.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return el('option', { value: v, text: l, selected: v === p.def }); }));
  else if (p.type === 'check') return el('div', { class: 'tk-field' }, el('label', { class: 'chk' }, el('input', { type: 'checkbox', 'data-p': p.id, checked: !!p.def }), p.label));
  else if (p.type === 'textarea') input = el('textarea', { 'data-p': p.id, spellcheck: 'false' }, p.def);
  else input = el('input', { 'data-p': p.id, type: p.type === 'number' ? 'number' : 'text', value: p.def ?? '', min: p.min, max: p.max, spellcheck: 'false', autocomplete: 'off', class: p.short ? 'short' : null });
  return el('div', { class: 'tk-field', style: p.type === 'textarea' ? 'grid-column: 1 / -1' : null }, el('div', { class: 'tk-label' }, el('span', { text: p.label })), input);
}));

const params = () => Object.fromEntries($$('[data-p]').map((i) => [i.dataset.p, i.type === 'checkbox' ? i.checked : i.type === 'number' ? (i.value === '' ? 0 : +i.value) : i.value]));
inp.value = c.sample ?? '';

function show(r) {
  const table = r && typeof r === 'object' && (r.rows || r.head);
  $('#tablebox').hidden = !table;
  if (table) {
    $('#tbl').replaceChildren(...(r.head ? [el('tr', {}, ...r.head.map((h) => el('th', { text: h })))] : []), ...(r.rows || []).map((row) => el('tr', {}, ...row.map((v) => el('td', { text: String(v) })))));
  }
  const txt = table ? r.text ?? '' : String(r ?? '');
  $('#outbox').hidden = table && !txt;
  out.value = txt;
  $('#len').textContent = txt ? `${[...txt].length.toLocaleString()} chars` : '';
}
const run = () => {
  const mode = pick('mode') || modes[0];
  try {
    const f = c[mode];
    show(inp.value || mode === 'run' ? f(inp.value, params()) : '');
    msg($('#msg'), '');
  } catch (e) { msg($('#msg'), e.message || String(e)); show(''); }
};
// heavy analyses run on demand only when the text is long
let t;
const schedule = () => { clearTimeout(t); t = setTimeout(run, c.id === 'mono-solver' || c.id === 'xor-crack' ? 400 : 60); };
live([inp, ...$$('[data-p]'), ...$$('input[name="mode"]')], schedule);
run();
$('#sample').addEventListener('click', () => { inp.value = c.sample ?? ''; run(); });
$('#swap').addEventListener('click', () => {
  if (!out.value) return;
  inp.value = out.value;
  const i = modes.indexOf(pick('mode'));
  if (modes.length === 2 && i >= 0) $$('input[name="mode"]')[1 - i].checked = true;
  run();
});
