import { $, live } from '../js/tk.js';

const f = (x) => (isFinite(x) ? String(+x.toPrecision(10)) : '—');
const n = (id) => parseFloat($(id).value);
live(['#a1', '#b1', '#a2', '#b2', '#a3', '#b3', '#a4', '#b4'].map((s) => $(s)), () => {
  $('#r1').textContent = f((n('#a1') / 100) * n('#b1'));
  $('#r2').textContent = f((n('#a2') / n('#b2')) * 100) + ' %';
  const ch = ((n('#b3') - n('#a3')) / Math.abs(n('#a3'))) * 100;
  $('#r3').textContent = (ch > 0 ? '+' : '') + f(ch) + ' %';
  $('#r4').textContent = f(n('#a4') / (1 + n('#b4') / 100));
});
