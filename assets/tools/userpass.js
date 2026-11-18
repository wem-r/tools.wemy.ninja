import { $, $$, el, live, pick } from '../js/tk.js';
import { FORMATS, usernames, sprayList } from './lib/permute.js';

const DEF = ['flast', 'f.last', 'first.last', 'firstlast', 'first', 'last'];
$('#fmts').append(...FORMATS.map(([id]) => el('label', {}, el('input', { type: 'checkbox', value: id, checked: DEF.includes(id) ? true : false, class: 'fmt' }), ' ' + id)));
const splitList = (s) => s.split(',').map((x) => x.replace(/^\s+|\s+$/g, '')).filter((x, i, a) => a.indexOf(x) === i);

function render() {
  const mode = pick('mode');
  $('#p-user').hidden = mode !== 'user'; $('#p-spray').hidden = mode === 'user';
  let out = [];
  if (mode === 'user') {
    const fmts = $$('.fmt').filter((c) => c.checked).map((c) => c.value);
    out = usernames($('#names').value.split('\n'), fmts, { domain: $('#domain').value.trim(), upper: $('#upper').checked });
  } else {
    out = sprayList({ bases: splitList($('#bases').value), year: +$('#year').value || new Date().getFullYear(),
      seasons: $('#seasons').checked, months: $('#months').checked, leetspeak: $('#leet').checked, capitalize: $('#cap').checked,
      suffixes: $('#suffixes').value.split(',').map((x) => x.replace(/^\s+|\s+$/g, '')) });
  }
  $('#out').value = out.join('\n');
  $('#cnt').textContent = `${out.length} lines`;
}
live([$('#names'), $('#domain'), $('#upper'), $('#bases'), $('#year'), $('#seasons'), $('#months'), $('#leet'), $('#cap'), $('#suffixes'),
  ...$$('#mode input'), ...$$('.fmt')], render);
