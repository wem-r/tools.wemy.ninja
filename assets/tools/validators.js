import { $, el, live } from '../js/tk.js';
import { checkEmail, checkDomain } from './lib/validate.js';

live($('#in'), () => {
  const lines = $('#in').value.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 500);
  $('#out').replaceChildren(
    el('tr', {}, ...['input', 'kind', 'result', 'notes'].map((h) => el('th', { text: h }))),
    ...lines.map((s) => {
      const email = s.includes('@');
      const r = email ? checkEmail(s) : checkDomain(s);
      return el('tr', {}, el('td', {}, el('code', { text: s })), el('td', { class: 'dim', text: email ? 'email' : 'domain' }),
        el('td', { class: r.ok ? 'ok' : 'bad', text: r.ok ? '✓ valid' : '✗ invalid' }), el('td', { class: 'dim', text: r.notes.join(' · ') }));
    }),
  );
});
