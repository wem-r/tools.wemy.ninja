import { $, el, kv, live, copyBtn } from '../js/tk.js';

let groups = [];
const show = (e) => {
  const cps = [...e.emoji].map((c) => c.codePointAt(0));
  kv($('#sel'), [['emoji', e.emoji, e.name], ['code points', cps.map((c) => 'U+' + c.toString(16).toUpperCase()).join(' ')], ['HTML', cps.map((c) => `&#x${c.toString(16)};`).join('')], ['JavaScript', cps.map((c) => `\\u{${c.toString(16)}}`).join('')], ['shortcode', `:${e.slug}:`]]);
  navigator.clipboard?.writeText(e.emoji).catch(() => {});
};
const render = () => {
  const q = $('#q').value.trim().toLowerCase(), g = $('#grp').value;
  let n = 0;
  $("#out").replaceChildren(...groups.filter((gr) => !g || gr.name === g).map((gr) => {
    const list = gr.emojis.filter((e) => !q || e.name.includes(q) || e.slug.includes(q));
    n += list.length; if (!list.length) return null;
    return el('div', {}, el('div', { class: 'tk-sec', text: `${gr.name} (${list.length})` }), el('div', { class: 'tk-emoji' }, ...list.slice(0, 600).map((e) => el('button', { type: 'button', title: e.name, text: e.emoji, onclick: () => show(e) }))));
  }).filter(Boolean));
  if (!n) $('#out').textContent = 'no emoji found';
};
fetch($('#q').dataset.emoji).then((r) => r.json()).then((j) => {
  groups = Array.isArray(j) ? j : Object.entries(j).map(([name, emojis]) => ({ name, emojis }));
  $('#grp').append(...groups.map((g) => el('option', { value: g.name, text: g.name })));
  live([$('#q'), $('#grp')], render);
});
void copyBtn;
