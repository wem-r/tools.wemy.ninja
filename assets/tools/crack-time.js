import { $, $$, el, live, pick } from '../js/tk.js';
import { SETS, charsetSize, maskKeyspace, keyspace, entropyBits, times } from './lib/cracktime.js';

$('#sets').append(...SETS.map(([id, label]) => el('label', {}, el('input', { type: 'checkbox', value: id, checked: ['lower', 'upper', 'digits'].includes(id) ? true : false, class: 'set' }), ' ' + label)));
const fmtKs = (n) => (!isFinite(n) ? '∞' : n > 1e15 ? n.toExponential(3).replace('e+', ' × 10^') : Math.round(n).toLocaleString('en-US').replace(/,/g, ' '));

function render() {
  const mode = pick('mode');
  $('#p-charset').hidden = mode !== 'charset'; $('#p-mask').hidden = mode === 'charset';
  let ks, detail;
  if (mode === 'charset') {
    const sel = $$('.set').filter((c) => c.checked).map((c) => c.value);
    const size = charsetSize(sel), len = Math.max(1, +$('#len').value || 1);
    ks = keyspace(size, len); detail = `${size} chars ^ ${len}`;
  } else {
    const r = maskKeyspace($('#mask').value); ks = r.keyspace; detail = `${r.tokens} positions`;
  }
  $('#summary').replaceChildren(
    row('combinations', fmtKs(ks)), row('search space', detail), row('entropy', isFinite(entropyBits(ks)) ? entropyBits(ks).toFixed(1) + ' bits' : '∞'));
  $('#times').replaceChildren(
    el('tr', {}, el('th', { text: 'attacker' }), el('th', { text: 'guesses/sec' }), el('th', { text: 'average time' })),
    ...times(ks).map(([label, hs, t]) => el('tr', {}, el('td', { text: label }), el('td', { class: 'dim', text: hs.toExponential(0) }), el('td', {}, el('b', { text: t })))));
}
function row(k, v) { return el('tr', {}, el('td', { class: 'dim', text: k }), el('td', {}, el('code', { text: v }))); }
live([$('#len'), $('#mask'), ...$$('#mode input'), ...$$('.set')], render);
