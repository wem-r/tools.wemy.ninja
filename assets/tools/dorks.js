import { $, $$, el, live, pick, copyBtn } from '../js/tk.js';
import { build, ENGINES, PRESETS, preset } from './lib/dorks.js';

const ids = ['terms', 'exact', 'any', 'site', 'notSite', 'inurl', 'intitle', 'intext', 'filetype', 'exclude', 'after', 'before'];
const list = (v) => v.split(',').map((x) => x.trim()).filter(Boolean);
live([...ids.map((i) => $('#' + i)), ...$$('input[name="eng"]')], () => {
  const v = Object.fromEntries(ids.map((i) => [i, $('#' + i).value.trim()]));
  const r = build({ ...v, any: list(v.any), notSite: list(v.notSite), filetype: list(v.filetype), exclude: list(v.exclude) }, pick('eng'));
  $('#q').textContent = r.query || '—';
  $('#go').href = r.url; $('#go').textContent = `search on ${ENGINES[pick('eng')].name} ↗`;
  $('#drop2').textContent = r.dropped.length ? `not supported by ${ENGINES[pick('eng')].name}, left out: ${r.dropped.join(', ')}` : '';
});
live([$('#dom'), ...$$('input[name="eng"]')], () => {
  const eng = ENGINES[pick('eng')];
  $('#pre').replaceChildren(...PRESETS.map(([name, tpl]) => {
    const q = preset(tpl, $('#dom').value);
    return el('tr', {}, el('td', { text: name }), el('td', {}, el('code', { text: q })), el('td', {}, copyBtn(() => q)), el('td', {}, el('a', { href: eng.url + encodeURIComponent(q), target: '_blank', rel: 'noopener noreferrer', text: `${eng.name} ↗` })));
  }));
});
