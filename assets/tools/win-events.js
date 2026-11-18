import { $, $$, el, live, pick, msg } from '../js/tk.js';
let DATA = [];
function render() {
  const q = $('#q').value.trim().toLowerCase(), log = pick('log'), terms = q.split(/\s+/).filter(Boolean);
  const rows = DATA.filter((e) => {
    if (log && e.log !== log) return false;
    if (!terms.length) return true;
    const hay = (e.id + ' ' + e.log + ' ' + e.cat + ' ' + e.name + ' ' + e.note).toLowerCase();
    return terms.every((t) => hay.includes(t));
  });
  msg($('#msg'), `${rows.length} events`);
  $('#out').replaceChildren(
    el('tr', {}, ...['ID', 'log', 'category', 'event', 'why it matters'].map((h) => el('th', { text: h }))),
    ...rows.map((e) => el('tr', {}, el('td', {}, el('code', { text: String(e.id) })), el('td', { class: 'dim', text: e.log }), el('td', { class: 'dim', text: e.cat }), el('td', {}, el('b', { text: e.name })), el('td', { class: 'dim', text: e.note }))));
}
fetch($('#q').dataset.ev).then((r) => r.json()).then((j) => { DATA = j.events; live([$('#q'), ...$$('#log input')], render); render(); }).catch(() => msg($('#msg'), 'could not load', 'err'));
