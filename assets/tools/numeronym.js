import { $, el, live, copyBtn } from '../js/tk.js';

const num = (w) => { const c = [...w]; return c.length < 4 ? w : `${c[0]}${c.length - 2}${c.at(-1)}`; };
live($('#in'), () => {
  const ws = $('#in').value.split(/[\s,]+/).filter(Boolean);
  $('#out').replaceChildren(el('tr', {}, el('th', { text: 'word' }), el('th', { text: 'numeronym' }), el('th', {})), ...ws.map((w) => el('tr', {}, el('td', { text: w }), el('td', {}, el('code', { text: num(w).toLowerCase() === num(w) ? num(w) : num(w) })), el('td', {}, copyBtn(() => num(w))))));
});
