import { $, el, live, msg, copyBtn } from '../js/tk.js';
let DATA = [], current = null;
const TAC = ['reconnaissance', 'resource-development', 'initial-access', 'execution', 'persistence', 'privilege-escalation', 'defense-evasion', 'credential-access', 'discovery', 'lateral-movement', 'collection', 'command-and-control', 'exfiltration', 'impact'];
function list() {
  const q = $('#q').value.trim().toLowerCase(), tac = $('#tactic').value, terms = q.split(/\s+/).filter(Boolean);
  return DATA.filter((t) => {
    if (tac && !t.tactics.includes(tac)) return false;
    if (!terms.length) return true;
    const hay = (t.id + ' ' + t.name + ' ' + t.desc + ' ' + t.tactics.join(' ')).toLowerCase();
    return terms.every((x) => hay.includes(x));
  });
}
function render() {
  const items = list();
  if (!items.includes(current)) current = items[0] || null;
  msg($('#msg'), `${items.length} techniques`);
  $('#list').replaceChildren(...items.slice(0, 400).map((t) => el('button', { type: 'button', class: 'tk-rev-item' + (t === current ? ' on' : ''), onclick: () => { current = t; render(); } },
    el('span', { style: t.sub ? 'padding-left:10px' : '' }, `${t.id}  ${t.name}`))));
  if (items.length > 400) $('#list').append(el('div', { class: 'dim', style: 'padding:6px', text: `+${items.length - 400} more — refine` }));
  const t = current;
  if (!t) { $('#detail').replaceChildren(el('p', { class: 'dim', text: 'no match' })); return; }
  $('#detail').replaceChildren(...[
    el('div', { class: 'tk-rev-head' }, el('b', { text: `${t.id} — ${t.name}` }), el('a', { href: t.url, target: '_blank', rel: 'noopener', class: 'dim', text: 'attack.mitre.org ↗' })),
    el('p', { class: 'dim', style: 'font-size:12px' }, el('span', { text: 'tactics: ' + t.tactics.join(', ') })),
    t.plat && t.plat.length ? el('p', { class: 'dim', style: 'font-size:12px', text: 'platforms: ' + t.plat.join(', ') }) : null,
    t.data && t.data.length ? el('p', { class: 'dim', style: 'font-size:12px', text: 'data sources: ' + t.data.join(', ') }) : null,
    el('p', { text: t.desc }),
    t.detect ? el('div', {}, el('div', { class: 'tk-sec', text: 'detection' }), el('p', { class: 'dim', text: t.detect })) : null,
  ].filter(Boolean));
}
fetch($('#q').dataset.mitre).then((r) => r.json()).then((j) => {
  DATA = j.techniques;
  $('#tactic').append(el('option', { value: '', text: 'all tactics' }), ...TAC.map((t) => el('option', { value: t, text: t.replace(/-/g, ' ') })));
  live([$('#q'), $('#tactic')], render); render();
}).catch(() => msg($('#msg'), 'could not load the dataset', 'err'));
