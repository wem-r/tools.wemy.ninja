import { $, el, live, msg } from '../js/tk.js';

function diff(a, b, path, out, ordered) {
  const t = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);
  if (t(a) !== t(b)) { out.push(['changed', path || '/', a, b]); return; }
  if (t(a) === 'object') {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const p = `${path}/${k}`;
      if (!(k in b)) out.push(['removed', p, a[k], undefined]); else if (!(k in a)) out.push(['added', p, undefined, b[k]]); else diff(a[k], b[k], p, out, ordered);
    }
  } else if (t(a) === 'array') {
    if (ordered) { for (let i = 0; i < Math.max(a.length, b.length); i++) { const p = `${path}[${i}]`; if (i >= b.length) out.push(['removed', p, a[i], undefined]); else if (i >= a.length) out.push(['added', p, undefined, b[i]]); else diff(a[i], b[i], p, out, ordered); } }
    else {
      const key = (v) => JSON.stringify(v), bs = b.map(key), as = a.map(key);
      a.forEach((v, i) => { if (!bs.includes(as[i])) out.push(['removed', `${path}[${i}]`, v, undefined]); });
      b.forEach((v, i) => { if (!as.includes(bs[i])) out.push(['added', `${path}[${i}]`, undefined, v]); });
    }
  } else if (a !== b) out.push(['changed', path || '/', a, b]);
  return out;
}
const show = (v) => (v === undefined ? '' : JSON.stringify(v));
live([$('#a'), $('#b'), $('#order')], () => {
  let a, b;
  try { a = JSON.parse($('#a').value); } catch (e) { return msg($('#msg'), `original: ${e.message}`); }
  try { b = JSON.parse($('#b').value); } catch (e) { return msg($('#msg'), `changed: ${e.message}`); }
  msg($('#msg'), '');
  const d = diff(a, b, '', [], $('#order').checked);
  const n = (k) => d.filter((x) => x[0] === k).length;
  $('#sum').textContent = d.length ? `${n('added')} added · ${n('removed')} removed · ${n('changed')} changed` : 'identical';
  $('#out').replaceChildren(...(d.length ? [el('tr', {}, ...['', 'path', 'before', 'after'].map((h) => el('th', { text: h })))] : []),
    ...d.map(([k, p, x, y]) => el('tr', { class: k === 'removed' ? 'bad' : k === 'added' ? '' : 'warn' }, el('td', { class: k === 'added' ? 'ok' : k === 'removed' ? 'bad' : 'warn', text: k }), el('td', {}, el('code', { text: p })), el('td', {}, el('del', { text: show(x) })), el('td', {}, el('ins', { text: show(y) })))));
});
