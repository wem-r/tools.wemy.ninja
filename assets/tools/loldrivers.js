import { $, $$, el, live, pick, msg, copyBtn } from '../js/tk.js';

let DATA = [], current = null;
function list() {
  const q = $('#q').value.trim().toLowerCase(), cat = pick('cat'), terms = q.split(/\s+/).filter(Boolean);
  return DATA.filter((d) => {
    if (cat && d.cat !== cat) return false;
    if (!terms.length) return true;
    const hay = (d.n + ' ' + (d.company || '') + ' ' + (d.product || '') + ' ' + (d.desc || '') + ' ' + (d.mitre || '') + ' ' + d.sha256.join(' ')).toLowerCase();
    return terms.every((t) => hay.includes(t));
  });
}
function render() {
  const items = list();
  if (!items.includes(current)) current = items[0] || null;
  msg($('#msg'), `${items.length} drivers`);
  $('#list').replaceChildren(...items.slice(0, 400).map((d) => el('button', { type: 'button', class: 'tk-rev-item' + (d === current ? ' on' : ''), onclick: () => { current = d; render(); } },
    d.n.length > 30 ? d.n.slice(0, 30) + '…' : d.n, el('span', { class: 'tag', text: d.cat === 'malicious' ? 'mal' : 'vuln' }))));
  if (items.length > 400) $('#list').append(el('div', { class: 'dim', style: 'padding:6px', text: `+${items.length - 400} more — refine` }));
  const d = current;
  if (!d) { $('#detail').replaceChildren(el('p', { class: 'dim', text: 'no match' })); return; }
  $('#detail').replaceChildren(...[
    el('div', { class: 'tk-rev-head' }, el('b', { text: d.n }), el('span', { class: 'dim', text: d.cat + (d.mitre ? ' · ' + d.mitre : '') }), el('a', { href: d.url, target: '_blank', rel: 'noopener', class: 'dim', text: 'loldrivers ↗' })),
    d.product || d.company ? el('p', { class: 'dim', text: [d.product, d.company].filter(Boolean).join(' — ') }) : null,
    d.desc ? el('p', { class: 'dim', text: d.desc }) : null,
    d.cmd ? el('div', { class: 'tk-field' }, el('div', { class: 'tk-label' }, el('span', { text: 'load command' + (d.priv ? '  · ' + d.priv : '') }), el('span', { class: 'r' }, copyBtn(() => d.cmd))), el('textarea', { readonly: true, rows: '2' }, d.cmd)) : null,
    d.sha256.length ? el('div', { class: 'tk-field' }, el('div', { class: 'tk-label' }, el('span', { text: `SHA-256 (${d.sha256.length})` }), el('span', { class: 'r' }, copyBtn(() => d.sha256.join('\n')))), el('textarea', { readonly: true, rows: String(Math.min(5, d.sha256.length)) }, d.sha256.join('\n'))) : null,
  ].filter(Boolean));
}
fetch($('#q').dataset.ld).then((r) => r.json()).then((j) => { DATA = j.drivers; live([$('#q'), ...$$('#cat input')], render); render(); }).catch(() => msg($('#msg'), 'could not load the dataset', 'err'));
