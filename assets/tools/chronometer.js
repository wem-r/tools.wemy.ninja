import { $, el } from '../js/tk.js';

let acc = 0, since = 0, raf = 0, laps = [];
const now = () => acc + (since ? performance.now() - since : 0);
const fmt = (ms) => { const h = Math.floor(ms / 3.6e6), m = Math.floor(ms / 6e4) % 60, s = Math.floor(ms / 1000) % 60, x = Math.floor(ms % 1000); return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(x).padStart(3, '0')}`; };
const tick = () => { $('#t').textContent = fmt(now()); raf = since ? requestAnimationFrame(tick) : 0; };
const toggle = () => { if (since) { acc = now(); since = 0; $('#go').textContent = 'start'; } else { since = performance.now(); $('#go').textContent = 'stop'; tick(); } tick(); };
const lap = () => {
  const t = now(); if (!t) return; const prev = laps.at(-1) || 0; laps.push(t);
  $('#laps').prepend(el('tr', {}, el('td', { class: 'dim', text: `lap ${laps.length}` }), el('td', {}, el('code', { text: fmt(t - prev) })), el('td', { class: 'dim', text: fmt(t) })));
};
const reset = () => { acc = 0; since = 0; laps = []; cancelAnimationFrame(raf); $('#go').textContent = 'start'; $('#laps').replaceChildren(); tick(); };
$('#go').addEventListener('click', toggle); $('#lap').addEventListener('click', lap); $('#reset').addEventListener('click', reset);
addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea, select, [contenteditable]') || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.code === 'Space') { e.preventDefault(); toggle(); } else if (e.key === 'l' || e.key === 'L') lap();
});
