import { $, $$, el, live, pick, msg, copyBtn } from '../js/tk.js';

const SRC = { gtfobins: ['GTFOBins', 'unix'], lolbas: ['LOLBAS', 'win'], wadcoms: ['WADComs', 'ad'] };
let DATA = [], current = null;

function list() {
  const q = $('#q').value.trim().toLowerCase(), src = pick('src');
  const terms = q.split(/\s+/).filter(Boolean);
  return DATA.filter((b) => {
    if (src && b.src !== src) return false;
    if (!terms.length) return true;
    const hay = (b.n + ' ' + b.src + ' ' + (b.desc || '') + ' ' + b.fns.map((f) => f.f + ' ' + f.code).join(' ')).toLowerCase();
    return terms.every((t) => hay.includes(t));
  });
}

function buildList() {
  const items = list();
  if (!items.some((b) => b === current)) current = items[0] || null;
  msg($('#msg'), `${items.length} binaries`);
  $('#list').replaceChildren(...items.slice(0, 400).map((b) => el('button', {
    type: 'button', class: 'tk-rev-item' + (b === current ? ' on' : ''), onclick: () => { current = b; render(); },
  }, b.n, el('span', { class: 'tag', text: SRC[b.src][1] }))));
  if (items.length > 400) $('#list').append(el('div', { class: 'dim', style: 'padding:6px', text: `+${items.length - 400} more — refine the search` }));
  if (!items.length) $('#list').append(el('p', { class: 'dim', text: 'nothing found' }));
}

function render() {
  buildList();
  for (const btn of $$('.tk-rev-item')) btn.classList.toggle('on', false);
  const d = $('#detail');
  if (!current) { d.replaceChildren(el('p', { class: 'dim', text: 'no selection' })); return; }
  const b = current;
  d.replaceChildren(...[
    el('div', { class: 'tk-rev-head' }, el('b', { text: b.full || b.n }), el('span', { class: 'dim', text: `${SRC[b.src][0]}${b.tool ? ' · ' + b.tool : ''}` }), el('a', { href: b.url, target: '_blank', rel: 'noopener', class: 'dim', text: 'docs ↗' })),
    b.desc ? el('p', { class: 'dim', text: b.desc }) : null,
    b.paths ? el('p', { class: 'dim', style: 'font-size:11px', text: b.paths.join('  ·  ') }) : null,
    ...b.fns.map((f) => el('div', { class: 'tk-field' },
      el('div', { class: 'tk-label' }, el('span', { text: f.f + (f.ctx ? '  [' + f.ctx.join(', ') + ']' : '') + (f.priv ? '  · ' + f.priv : '') + (f.mitre ? '  · ' + f.mitre : '') }), el('span', { class: 'r' }, copyBtn(() => f.code))),
      el('textarea', { readonly: true, rows: String(Math.min(6, (f.code.match(/\n/g)?.length || 0) + 1)) }, f.code),
      f.c ? el('p', { class: 'dim', style: 'margin:2px 0 0;font-size:12px', text: f.c }) : null)),
  ].filter(Boolean));
}

fetch($('#q').dataset.lol).then((r) => r.json()).then((j) => {
  DATA = j.bins;
  live([$('#q'), ...$$('#src input')], render);
  render();
}).catch(() => msg($('#msg'), 'could not load the dataset', 'err'));
