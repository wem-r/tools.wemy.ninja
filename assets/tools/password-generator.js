import { $, $$, kv, live, pick, randInt, toHex, toB64, toB64url } from '../js/tk.js';

let words = null;
const n = (id, lo, hi) => Math.max(lo, Math.min(hi, parseInt($(id).value, 10) || lo));
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const base32 = (b) => { let bits = '', o = ''; for (const x of b) bits += x.toString(2).padStart(8, '0'); for (let i = 0; i < bits.length; i += 5) o += B32[parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)]; return o; };

function charset() {
  const amb = $('#amb').checked ? /[Il1O0o|`'"]/g : null;
  const sets = [];
  if ($('#lo').checked) sets.push('abcdefghijklmnopqrstuvwxyz');
  if ($('#up').checked) sets.push('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  if ($('#di').checked) sets.push('0123456789');
  if ($('#sy').checked) sets.push([...new Set($('#set').value)].join(''));
  return sets.map((s) => (amb ? s.replace(amb, '') : s)).filter(Boolean);
}
function password(len, sets) {
  const all = sets.join('');
  for (;;) { // regenerate until every chosen class is present (unbiased: no forced positions)
    const p = Array.from({ length: len }, () => all[randInt(all.length)]).join('');
    if (len < sets.length || sets.every((s) => [...p].some((c) => s.includes(c)))) return p;
  }
}
function passphrase(k) {
  const w = Array.from({ length: k }, () => words[randInt(words.length)]).map((x) => ($('#cap').checked ? x[0].toUpperCase() + x.slice(1) : x));
  if ($('#num').checked) { const i = randInt(w.length); w[i] += randInt(10); }
  return w.join($('#sep').value);
}
function token(b) {
  const r = crypto.getRandomValues(new Uint8Array(b));
  return { hex: toHex, b64: toB64, b64url: toB64url, b32: base32 }[pick('tfmt')](r);
}

const gen = async () => {
  const mode = pick('mode');
  $$('[data-mode]').forEach((d) => { d.hidden = d.dataset.mode !== mode; });
  const count = n('#count', 1, 100);
  let make, bits;
  if (mode === 'password') {
    const sets = charset(), len = n('#len', 4, 256);
    if (!sets.length) { kv($('#out'), [['', 'choose at least one character set']]); return; }
    bits = len * Math.log2(new Set(sets.join('')).size);
    make = () => password(len, sets);
  } else if (mode === 'passphrase') {
    if (!words) {
      kv($('#out'), [['', 'loading the word list…']]);
      words = await fetch($('#eff').value).then((r) => r.json());
    }
    const k = n('#words', 3, 20);
    bits = k * Math.log2(words.length) + ($('#num').checked ? Math.log2(10 * k) : 0);
    make = () => passphrase(k);
  } else {
    const b = n('#bytes', 4, 512);
    bits = b * 8; make = () => token(b);
  }
  $('#ent').textContent = `≈ ${Math.floor(bits)} bits of entropy each`;
  kv($('#out'), Array.from({ length: count }, (_, i) => [String(i + 1), make()]));
};
live([...$$('input[name="mode"]'), ...$$('input[name="tfmt"]'), ...$$('[data-mode] input'), $('#count')], gen);
$('#go').addEventListener('click', gen);
