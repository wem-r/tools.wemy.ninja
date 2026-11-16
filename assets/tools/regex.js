import { $, $$, el, live, msg } from '../js/tk.js';

const re = $('#re'), flags = $('#flags'), txt = $('#txt');
const boxes = $$('input[data-f]');
const syncBoxes = () => boxes.forEach((b) => { b.checked = flags.value.includes(b.dataset.f); });
boxes.forEach((b) => b.addEventListener('change', () => {
  flags.value = [...'dgimsuvy'].filter((f) => (f === b.dataset.f ? b.checked : flags.value.includes(f))).join('');
  flags.dispatchEvent(new Event('input'));
}));
flags.addEventListener('input', syncBoxes);

live([re, flags, txt, $('#rep')], () => {
  let r;
  try { r = new RegExp(re.value, flags.value); msg($('#msg'), ''); }
  catch (e) { msg($('#msg'), e.message); $('#hl').textContent = txt.value; $('#list').replaceChildren(); $('#repout').textContent = ''; $('#cnt').textContent = ''; return; }
  const t = txt.value;
  const all = r.global || r.sticky ? [...t.matchAll(new RegExp(r.source, r.flags.includes('g') ? r.flags : r.flags + 'g'))] : [r.exec(t)].filter(Boolean);
  $('#cnt').textContent = `${all.length} match${all.length === 1 ? '' : 'es'}`;
  // highlight
  const parts = []; let at = 0;
  all.slice(0, 2000).forEach((m, i) => {
    if (m.index > at) parts.push(t.slice(at, m.index));
    parts.push(el('mark', { class: i % 2 ? 'alt' : '', title: `#${i + 1}`, text: m[0] || '∅' }));
    at = m.index + m[0].length;
  });
  parts.push(t.slice(at));
  $('#hl').replaceChildren(...parts);
  // list
  const names = all[0]?.groups ? Object.keys(all[0].groups) : [];
  const ng = all[0] ? all[0].length - 1 : 0;
  $('#list').replaceChildren(
    all.length ? el('tr', {}, el('th', { text: '#' }), el('th', { text: 'index' }), el('th', { text: 'match' }),
      ...Array.from({ length: ng }, (_, i) => el('th', { text: names[i] ? `$${i + 1} ‹${names[i]}›` : `$${i + 1}` }))) : null,
    ...all.slice(0, 500).map((m, i) => el('tr', {}, el('td', { class: 'dim', text: i + 1 }), el('td', { class: 'dim', text: m.index }),
      el('td', {}, el('code', { text: m[0] })), ...m.slice(1).map((g) => el('td', { class: g === undefined ? 'dim' : '', text: g ?? 'undefined' })))),
  );
  // names map positional order differently if groups are mixed; label them by position only when names exist
  if (names.length && names.length !== ng) $$('#list th').slice(3).forEach((th, i) => { th.textContent = `$${i + 1}`; });
  $('#repout').textContent = t.replace(r, $('#rep').value);
});
syncBoxes();
