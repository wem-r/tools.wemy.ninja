import { $, el, live, copyBtn } from '../js/tk.js';
import { DBMS, CATEGORIES, rows } from './lib/sqli.js';

$('#cat').append(...CATEGORIES.map((c) => el('option', { value: c, text: c })));
$('#dbms').append(...DBMS.map((d) => el('option', { value: d, text: d })));

function render() {
  const list = rows($('#cat').value, $('#dbms').value);
  $('#out').replaceChildren(
    el('tr', {}, el('th', { text: 'payload' }), el('th', { text: 'note' }), el('th', {})),
    ...list.map(([p, note]) => el('tr', {}, el('td', {}, el('code', { text: p })), el('td', { class: 'dim', text: note || '' }), el('td', { class: 'r' }, copyBtn(() => p)))));
  if (!list.length) $('#out').replaceChildren(el('tr', {}, el('td', { class: 'dim', text: 'nothing for this DBMS — try another' })));
}
live([$('#cat'), $('#dbms')], render);
