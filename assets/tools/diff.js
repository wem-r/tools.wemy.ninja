import { diffLines, diffWords, diffChars, createTwoFilesPatch } from 'diff';
import { $, $$, el, live, pick } from '../js/tk.js';

live([$('#a'), $('#b'), $('#ws'), $('#ic'), ...$$('input[name="mode"]'), ...$$('input[name="view"]')], () => {
  const a = $('#a').value, b = $('#b').value, mode = pick('mode'), view = pick('view');
  const opt = { ignoreWhitespace: $('#ws').checked, ignoreCase: $('#ic').checked };
  if (view === 'patch') {
    $('#out').replaceChildren(el('pre', { class: 'tk-out', text: createTwoFilesPatch('original', 'changed', a, b, '', '', { context: 3, ...opt }) }));
    $('#sum').textContent = '';
    return;
  }
  const parts = (mode === 'lines' ? diffLines : mode === 'words' ? diffWords : diffChars)(a, b, opt);
  const add = parts.filter((p) => p.added).reduce((n, p) => n + p.count, 0), del = parts.filter((p) => p.removed).reduce((n, p) => n + p.count, 0);
  $('#sum').textContent = add || del ? `+${add} −${del} ${mode}` : 'identical';
  if (view === 'inline' || mode !== 'lines') {
    $('#out').replaceChildren(el('pre', { class: 'tk-out' }, ...parts.map((p) => (p.added ? el('ins', { text: p.value }) : p.removed ? el('del', { text: p.value }) : p.value))));
    return;
  }
  // side by side, line mode: pair removed / added blocks
  const rows = [];
  let la = 1, lb = 1;
  const lines = (v) => v.replace(/\n$/, '').split('\n');
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p.removed && parts[i + 1]?.added) {
      const L = lines(p.value), R = lines(parts[i + 1].value);
      for (let k = 0; k < Math.max(L.length, R.length); k++) rows.push([L[k] != null ? la++ : '', L[k], 'del', R[k] != null ? lb++ : '', R[k], 'ins']);
      i++;
    } else if (p.removed) for (const l of lines(p.value)) rows.push([la++, l, 'del', '', undefined, '']);
    else if (p.added) for (const l of lines(p.value)) rows.push(['', undefined, '', lb++, l, 'ins']);
    else for (const l of lines(p.value)) rows.push([la++, l, '', lb++, l, '']);
  }
  $('#out').replaceChildren(el('table', { class: 'tk-list tk-sbs' }, ...rows.map(([na, ta, ca, nb, tb, cb]) => el('tr', {},
    el('td', { class: 'n', text: na }), el('td', { class: ta === undefined ? 'gap' : ca, text: ta ?? '' }),
    el('td', { class: 'n', text: nb }), el('td', { class: tb === undefined ? 'gap' : cb, text: tb ?? '' })))));
});
