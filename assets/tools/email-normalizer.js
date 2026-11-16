import { $, el, live } from '../js/tk.js';

const GMAIL = ['gmail.com', 'googlemail.com'], PLUS = ['outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'fastmail.com', 'fastmail.fm', 'proton.me', 'protonmail.com', 'pm.me', 'icloud.com', 'me.com', 'mac.com', 'hey.com', 'zoho.com', 'gmx.com', 'gmx.net', 'yandex.ru', 'yandex.com', 'tutanota.com', 'mailbox.org', 'posteo.de'];
const YAHOO = ['yahoo.com', 'yahoo.fr', 'yahoo.co.uk', 'ymail.com', 'rocketmail.com'];
function norm(addr, generic) {
  const m = addr.trim().toLowerCase().match(/^([^@\s]+)@([^@\s]+)$/); if (!m) return null;
  let [, local, dom] = m; const notes = [];
  if (GMAIL.includes(dom)) { if (local.includes('+')) notes.push('+tag removed'); if (local.includes('.')) notes.push('dots removed'); local = local.split('+')[0].replace(/\./g, ''); dom = 'gmail.com'; }
  else if (YAHOO.includes(dom)) { if (local.includes('-')) notes.push('-keyword removed'); local = local.split('-')[0]; }
  else if (PLUS.includes(dom) || generic) { if (local.includes('+')) notes.push('+tag removed'); local = local.split('+')[0]; }
  return { out: `${local}@${dom}`, notes };
}
live([$('#in'), $('#generic')], () => {
  const rows = $('#in').value.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => [l, norm(l, $('#generic').checked)]);
  const count = {}; for (const [, r] of rows) if (r) count[r.out] = (count[r.out] || 0) + 1;
  $('#out').replaceChildren(el('tr', {}, ...['address', 'normalised', 'changes'].map((h) => el('th', { text: h }))),
    ...rows.map(([l, r]) => el('tr', { class: r && count[r.out] > 1 ? 'warn' : '' }, el('td', {}, el('code', { text: l })), el('td', {}, r ? el('code', { text: r.out }) : el('span', { class: 'bad', text: 'not an address' })), el('td', { class: 'dim', text: r ? [...r.notes, count[r.out] > 1 ? `same as ${count[r.out] - 1} other(s)` : ''].filter(Boolean).join(' · ') : '' }))));
});
