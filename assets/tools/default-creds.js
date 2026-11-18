import { $, el, live, msg, copyBtn } from '../js/tk.js';

let DATA = [];
const CAP = 400;
const blankish = (p) => /^<?(blank|empty|none|n\/a|null)>?$/i.test(p) || p === '';

function render() {
  const q = $('#q').value.trim().toLowerCase(), terms = q.split(/\s+/).filter(Boolean), onlyBlank = $('#blanks').checked;
  let rows = DATA;
  if (terms.length) rows = rows.filter(([v, u, p]) => { const h = (v + ' ' + u + ' ' + p).toLowerCase(); return terms.every((t) => h.includes(t)); });
  if (onlyBlank) rows = rows.filter(([, , p]) => blankish(p));
  msg($('#msg'), `${rows.length} credential pair${rows.length === 1 ? '' : 's'}`);
  $('#out').replaceChildren(
    el('tr', {}, ...['product / vendor', 'username', 'password', ''].map((h) => el('th', { text: h }))),
    ...rows.slice(0, CAP).map(([v, u, p]) => el('tr', {},
      el('td', { text: v }), el('td', {}, el('code', { text: u || '«blank»' })), el('td', {}, el('code', { text: p || '«blank»' })),
      el('td', { class: 'r' }, copyBtn(() => `${u}:${p}`)))));
  $('#more').textContent = rows.length > CAP ? `showing the first ${CAP} — refine the search to see the rest` : '';
}

fetch($('#q').dataset.creds).then((r) => r.json()).then((j) => {
  DATA = j.creds;
  live([$('#q'), $('#blanks')], render);
  msg($('#msg'), `${j.count.toLocaleString()} pairs across ${j.vendors.toLocaleString()} vendors — type to search`);
  $('#out').replaceChildren();
}).catch(() => msg($('#msg'), 'could not load the dataset', 'err'));
