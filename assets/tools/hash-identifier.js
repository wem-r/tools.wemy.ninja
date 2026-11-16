import { $, el, live } from '../js/tk.js';
import { identify } from './lib/hashid.js';

const inp = $('#in');
live(inp, () => {
  const lines = inp.value.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 50);
  $('#out').replaceChildren(...lines.map((h) => {
    const r = identify(h);
    return el('div', {},
      el('div', { class: 'tk-sec', text: h.length > 70 ? h.slice(0, 67) + '…' : h }),
      r.length ? el('table', { class: 'tk-list' },
        el('tr', {}, ...['candidate', 'hashcat -m', 'john --format', ''].map((t) => el('th', { text: t }))),
        ...r.map((c) => el('tr', {}, el('td', { text: c.name }), el('td', {}, el('code', { text: c.hashcat ?? '—' })),
          el('td', {}, el('code', { text: c.john ?? '—' })), el('td', { class: 'dim', text: c.note || '' })))) :
        el('p', { class: 'dim', text: `no known format (${h.length} characters)` }));
  }));
});
