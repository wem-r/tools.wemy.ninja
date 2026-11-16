import { $, el, live } from '../js/tk.js';

const stats = (v) => {
  const s = [...v].sort((a, b) => a - b), n = s.length, mean = s.reduce((a, b) => a + b, 0) / n;
  const sd = n > 1 ? Math.sqrt(s.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)) : 0;
  const q = (p) => { const i = (n - 1) * p, lo = Math.floor(i); return s[lo] + (s[Math.ceil(i)] - s[lo]) * (i - lo); };
  return { n, mean, sd, min: s[0], max: s[n - 1], median: q(0.5), p95: q(0.95) };
};
const f = (x) => String(+x.toPrecision(4));
live([$('#in'), $('#lower')], () => {
  const rows = $('#in').value.split('\n').map((l) => l.match(/^\s*([^:]+?)\s*:\s*(.+)$/)).filter(Boolean)
    .map((m) => ({ name: m[1], v: m[2].split(/[,;\s]+/).map(Number).filter(Number.isFinite) })).filter((r) => r.v.length).map((r) => ({ ...r, ...stats(r.v) }));
  const lower = $('#lower').checked;
  rows.sort((a, b) => (lower ? a.mean - b.mean : b.mean - a.mean));
  const best = rows[0]?.mean;
  $('#out').replaceChildren(
    el('tr', {}, ...['#', 'name', 'n', 'mean', '± sd', 'median', 'min', 'max', 'p95', 'vs best'].map((h) => el('th', { text: h }))),
    ...rows.map((r, i) => el('tr', {}, el('td', { text: String(i + 1) }), el('td', {}, el('b', { text: r.name })), el('td', { text: String(r.n) }), el('td', {}, el('code', { text: f(r.mean) })),
      el('td', { text: f(r.sd) }), el('td', { text: f(r.median) }), el('td', { text: f(r.min) }), el('td', { text: f(r.max) }), el('td', { text: f(r.p95) }),
      el('td', { class: i ? '' : 'dim', text: i ? `${lower ? '+' : '−'}${f(Math.abs(r.mean / best - 1) * 100)} % (×${f(lower ? r.mean / best : best / r.mean)})` : 'best' }))),
  );
});
