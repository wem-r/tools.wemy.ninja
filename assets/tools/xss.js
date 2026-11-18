import { $, el, live, copyBtn } from '../js/tk.js';
import { GROUPS, apply, ENCODERS, ENCODER_LABELS } from './lib/xss.js';

$('#enc').append(...Object.keys(ENCODERS).map((k) => el('option', { value: k, text: ENCODER_LABELS[k] })));

function render() {
  const enc = $('#enc').value, host = $('#host').value.trim(), q = $('#filter').value.trim().toLowerCase();
  $('#out').replaceChildren(...GROUPS.map(([cat, list]) => {
    const rows = list.filter(([p, n]) => !q || (p + ' ' + n + ' ' + cat).toLowerCase().includes(q));
    if (!rows.length) return null;
    return el('div', {}, el('div', { class: 'tk-sec', text: cat }), el('table', { class: 'tk-list' }, ...rows.map(([p, note]) => {
      const out = apply(p, enc, host);
      return el('tr', {}, el('td', {}, el('code', { text: out })), el('td', { class: 'dim', text: note || '' }), el('td', { class: 'r' }, copyBtn(() => out)));
    })));
  }).filter(Boolean));
}
live([$('#enc'), $('#host'), $('#filter')], render);
