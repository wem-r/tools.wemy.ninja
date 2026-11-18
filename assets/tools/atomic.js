import { $, $$, el, live, pick, msg, copyBtn } from '../js/tk.js';
let DATA = [], current = null;
function list() {
  const q = $('#q').value.trim().toLowerCase(), plat = pick('plat'), terms = q.split(/\s+/).filter(Boolean);
  return DATA.map((tech) => {
    const tests = tech.tests.filter((t) => !plat || t.plat.includes(plat));
    return { ...tech, tests };
  }).filter((tech) => {
    if (!tech.tests.length) return false;
    if (!terms.length) return true;
    const hay = (tech.id + ' ' + tech.name + ' ' + tech.tests.map((t) => t.name + ' ' + t.cmd).join(' ')).toLowerCase();
    return terms.every((x) => hay.includes(x));
  });
}
const sub = (cmd, args) => { if (!args) return cmd; return cmd.replace(/#\{(\w+)\}/g, (m, k) => (k in args ? args[k] : m)); };
function render() {
  const items = list();
  if (!items.find((t) => current && t.id === current.id)) current = items[0] || null;
  else current = items.find((t) => t.id === current.id);
  msg($('#msg'), `${items.length} techniques · ${items.reduce((n, t) => n + t.tests.length, 0)} tests`);
  $('#list').replaceChildren(...items.slice(0, 400).map((t) => el('button', { type: 'button', class: 'tk-rev-item' + (current && t.id === current.id ? ' on' : ''), onclick: () => { current = t; render(); } },
    `${t.id}  ${t.name || ''}`.slice(0, 40), el('span', { class: 'tag', text: String(t.tests.length) }))));
  if (items.length > 400) $('#list').append(el('div', { class: 'dim', style: 'padding:6px', text: `+${items.length - 400} more — refine` }));
  const tech = current;
  if (!tech) { $('#detail').replaceChildren(el('p', { class: 'dim', text: 'no match' })); return; }
  $('#detail').replaceChildren(...[
    el('div', { class: 'tk-rev-head' }, el('b', { text: `${tech.id} — ${tech.name || ''}` }), el('a', { href: `https://attack.mitre.org/techniques/${tech.id.replace('.', '/')}`, target: '_blank', rel: 'noopener', class: 'dim', text: 'ATT&CK ↗' })),
    ...tech.tests.map((t) => {
      const cmd = sub(t.cmd, t.args), cleanup = t.cleanup ? sub(t.cleanup, t.args) : '';
      return el('div', { style: 'margin-bottom:12px' },
        el('div', { class: 'tk-label' }, el('span', { text: `${t.name}  ·  ${t.plat.join('/')}  ·  ${t.exec}${t.elevated ? '  · admin' : ''}` }), el('span', { class: 'r' }, copyBtn(() => cmd))),
        el('textarea', { readonly: true, rows: String(Math.min(8, (cmd.match(/\n/g)?.length || 0) + 1)) }, cmd),
        cleanup ? el('details', { class: 'tk-details' }, el('summary', { text: 'cleanup' }), el('textarea', { readonly: true, rows: String(Math.min(5, (cleanup.match(/\n/g)?.length || 0) + 1)) }, cleanup)) : null);
    }),
  ].filter(Boolean));
}
fetch($('#q').dataset.atomic).then((r) => r.json()).then((j) => { DATA = j.techniques; live([$('#q'), ...$$('#plat input')], render); render(); }).catch(() => msg($('#msg'), 'could not load the dataset', 'err'));
