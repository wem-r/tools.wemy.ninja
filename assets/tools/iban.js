import { $, el, live, copyBtn } from '../js/tk.js';
import { checkIBAN } from './lib/checkdigits.js';

live($('#in'), () => {
  const lines = $('#in').value.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 500);
  $('#out').replaceChildren(el('tr', {}, ...['IBAN', 'result', 'country', 'bank / branch', ''].map((t) => el('th', { text: t }))),
    ...lines.map((l) => {
      const r = checkIBAN(l);
      return el('tr', {}, el('td', {}, el('code', { text: r.formatted || l })),
        el('td', { class: r.valid ? 'ok' : 'bad' }, r.valid ? '✓ valid' : '✗ ' + r.errors.join(' · '), !r.valid && r.expectedCheck && r.check !== r.expectedCheck ? el('div', { class: 'dim', text: `check digits for this BBAN: ${r.expectedCheck}` }) : null),
        el('td', { text: r.country }), el('td', { class: 'dim', text: [r.bank, r.branch].filter(Boolean).join(' / ') }),
        el('td', {}, copyBtn(() => r.iban, 'copy')));
    }));
});
