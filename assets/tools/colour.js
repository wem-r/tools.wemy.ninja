import { $, kv, live, msg, randInt } from '../js/tk.js';
import { parseColour, rgbToHsl, rgbToCmyk, toHex, contrast } from './lib/colour.js';

const inp = $('#in'), pk = $('#pick'), in2 = $('#in2'), pk2 = $('#pick2');
pk.addEventListener('input', () => { inp.value = pk.value; inp.dispatchEvent(new Event('input')); });
pk2.addEventListener('input', () => { in2.value = pk2.value; in2.dispatchEvent(new Event('input')); });
$('#rnd').addEventListener('click', () => { inp.value = toHex({ r: randInt(256), g: randInt(256), b: randInt(256) }); inp.dispatchEvent(new Event('input')); });

let c1 = null;
const both = () => {
  let c2;
  try { c2 = parseColour(in2.value); } catch { kv($('#cout'), [['', 'second colour not readable']]); return; }
  if (!c1) return;
  pk2.value = toHex({ ...c2, a: 1 });
  const r = contrast(c1, c2);
  const pass = (x) => (r >= x ? '✓ pass' : '✗ fail');
  $('#demo').style.background = toHex({ ...c2, a: 1 }); $('#demo').style.color = toHex({ ...c1, a: 1 });
  kv($('#cout'), [
    ['ratio', `${r.toFixed(2)} : 1`],
    ['AA normal text (4.5)', pass(4.5)], ['AA large text / UI (3)', pass(3)],
    ['AAA normal text (7)', pass(7)], ['AAA large text (4.5)', pass(4.5)],
  ]);
  for (const c of $('#cout').querySelectorAll('td.c')) c.replaceChildren();
};
live(inp, () => {
  try { c1 = parseColour(inp.value); msg($('#msg'), ''); }
  catch (e) { msg($('#msg'), e.message); return; }
  const { r, g, b, a } = c1, h = rgbToHsl(c1), k = rgbToCmyk(c1);
  pk.value = toHex({ r, g, b });
  $('#sw').style.background = toHex(c1);
  const A = a < 1 ? ` / ${+a.toFixed(3)}` : '';
  kv($('#out'), [
    ['hex', toHex(c1)],
    ['rgb', `rgb(${r} ${g} ${b}${A})`, `rgb(${r}, ${g}, ${b})`],
    ['hsl', `hsl(${h.h} ${h.s}% ${h.l}%${A})`],
    ['cmyk', `cmyk(${k.c}% ${k.m}% ${k.y}% ${k.k}%)`],
    ['decimal', String((r << 16) | (g << 8) | b)],
    ['0xRRGGBB', '0x' + toHex({ r, g, b }).slice(1).toUpperCase()],
  ]);
  both();
});
live(in2, both);
