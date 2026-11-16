import { $, el } from '../js/tk.js';

// every scale as [name, toKelvin, fromKelvin]
const S = [
  ['Celsius °C', (x) => x + 273.15, (k) => k - 273.15],
  ['Fahrenheit °F', (x) => ((x + 459.67) * 5) / 9, (k) => (k * 9) / 5 - 459.67],
  ['Kelvin K', (x) => x, (k) => k],
  ['Rankine °R', (x) => (x * 5) / 9, (k) => (k * 9) / 5],
  ['Delisle °De', (x) => 373.15 - (x * 2) / 3, (k) => ((373.15 - k) * 3) / 2],
  ['Newton °N', (x) => (x * 100) / 33 + 273.15, (k) => ((k - 273.15) * 33) / 100],
  ['Réaumur °Ré', (x) => (x * 5) / 4 + 273.15, (k) => ((k - 273.15) * 4) / 5],
  ['Rømer °Rø', (x) => ((x - 7.5) * 40) / 21 + 273.15, (k) => ((k - 273.15) * 21) / 40 + 7.5],
];
const inputs = S.map(([name], i) => {
  const inp = el('input', { type: 'number', step: 'any', 'data-i': i });
  inp.addEventListener('input', () => set(i, parseFloat(inp.value)));
  $('#out').append(el('div', { class: 'tk-field' }, el('div', { class: 'tk-label' }, el('span', { text: name })), inp));
  return inp;
});
function set(from, v) {
  if (!isFinite(v)) return;
  const k = S[from][1](v);
  inputs.forEach((inp, i) => { if (i !== from) inp.value = String(+S[i][2](k).toFixed(4)); });
}
inputs[0].value = '20'; set(0, 20);
