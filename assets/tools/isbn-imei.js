import { $, el, live } from '../js/tk.js';
import { checkISBN, checkISSN, checkIMEI } from './lib/checkdigits.js';

live($('#in'), () => {
  const lines = $('#in').value.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 500);
  $('#out').replaceChildren(el('tr', {}, ...['input', 'kind', 'result', 'details'].map((t) => el('th', { text: t }))),
    ...lines.map((l) => {
      const r = /imei/i.test(l) ? checkIMEI(l) : /issn/i.test(l) ? checkISSN(l) : checkISBN(l) || checkISSN(l) || checkIMEI(l);
      if (!r) return el('tr', {}, el('td', {}, el('code', { text: l })), el('td', { class: 'dim', text: '?' }), el('td', { class: 'bad', text: '✗ not an ISBN, ISSN or IMEI' }), el('td', {}));
      const det = [r.converted && `${r.kind === 'ISBN-10' ? 'ISBN-13' : 'ISBN-10'}: ${r.converted}`, r.formatted, r.tac && `TAC ${r.tac} · serial ${r.serial}${r.sv ? ` · SV ${r.sv}` : ''}`, r.valid === false && `expected check digit ${r.expected}`, r.valid == null && r.expected && `check digit would be ${r.expected}`].filter(Boolean).join(' · ');
      return el('tr', {}, el('td', {}, el('code', { text: l })), el('td', { text: r.kind }),
        el('td', { class: r.valid ? 'ok' : r.valid === false ? 'bad' : 'dim', text: r.valid ? '✓ valid' : r.valid === false ? '✗ wrong check digit' : 'no check digit' }), el('td', { class: 'dim', text: det }));
    }));
});
