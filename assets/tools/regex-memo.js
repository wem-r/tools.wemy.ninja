import { $, el, live, copyBtn } from '../js/tk.js';
import { SHEETS } from './lib/cheats.js';

const box = $('#cheat'), sheet = SHEETS[box.dataset.sheet];
live($('#q'), () => {
  const q = $('#q').value.toLowerCase();
  box.replaceChildren(...sheet.map(([title, rows]) => {
    const r = rows.filter(([d, c]) => !q || `${title} ${d} ${c}`.toLowerCase().includes(q));
    if (!r.length) return null;
    return el('section', {}, el('div', { class: 'tk-sec', text: title }), el('table', { class: 'tk-kv' }, ...r.map(([d, c]) => el('tr', {}, el('td', { text: d }), el('td', {}, el('code', { class: 'v', style: 'white-space:pre-wrap', text: c })), el('td', { class: 'c' }, copyBtn(() => c))))));
  }));
});
