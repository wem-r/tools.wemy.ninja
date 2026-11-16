import { $, $$, el, live, pick } from '../js/tk.js';

const U = (cp) => 'U+' + cp.toString(16).toUpperCase().padStart(4, '0');
const hexb = (b) => [...b].map((x) => x.toString(16).padStart(2, '0').toUpperCase()).join(' ');
const CTRL = ['NUL', 'SOH', 'STX', 'ETX', 'EOT', 'ENQ', 'ACK', 'BEL', 'BS', 'TAB', 'LF', 'VT', 'FF', 'CR', 'SO', 'SI', 'DLE', 'DC1', 'DC2', 'DC3', 'DC4', 'NAK', 'SYN', 'ETB', 'CAN', 'EM', 'SUB', 'ESC', 'FS', 'GS', 'RS', 'US'];
const ENT = { 34: '&quot;', 38: '&amp;', 39: '&#39;', 60: '&lt;', 62: '&gt;', 160: '&nbsp;', 169: '&copy;', 174: '&reg;', 8364: '&euro;' };
function category(ch) {
  const t = [['Lu', 'uppercase letter'], ['Ll', 'lowercase letter'], ['Lt', 'titlecase letter'], ['Lm', 'modifier letter'], ['Lo', 'letter'], ['Mn', 'combining mark'], ['Mc', 'spacing mark'], ['Me', 'enclosing mark'], ['Nd', 'digit'], ['Nl', 'letter number'], ['No', 'number'], ['Pc', 'connector punctuation'], ['Pd', 'dash'], ['Ps', 'opening punctuation'], ['Pe', 'closing punctuation'], ['Pi', 'initial quote'], ['Pf', 'final quote'], ['Po', 'punctuation'], ['Sm', 'math symbol'], ['Sc', 'currency symbol'], ['Sk', 'modifier symbol'], ['So', 'symbol'], ['Zs', 'space'], ['Zl', 'line separator'], ['Zp', 'paragraph separator'], ['Cc', 'control'], ['Cf', 'format (invisible)'], ['Co', 'private use'], ['Cs', 'surrogate']];
  for (const [c, n] of t) if (new RegExp(`^\\p{${c}}$`, 'u').test(ch)) return n;
  return 'unassigned';
}
live($('#in'), () => {
  const t = $('#in').value;
  const seg = Intl.Segmenter ? [...new Intl.Segmenter().segment(t)].length : [...t].length;
  $('#cnt').textContent = `${seg} visible · ${[...t].length} code points · ${t.length} UTF-16 units · ${new TextEncoder().encode(t).length} bytes`;
  $('#out').replaceChildren(el('tr', {}, ...['char', 'code point', 'kind', 'UTF-8', 'UTF-16', 'decimal', 'HTML', 'JS / CSS'].map((h) => el('th', { text: h }))),
    ...[...t].slice(0, 500).map((ch) => {
      const cp = ch.codePointAt(0);
      const u16 = [...ch].length && ch.length === 2 ? `${ch.charCodeAt(0).toString(16).toUpperCase()} ${ch.charCodeAt(1).toString(16).toUpperCase()}` : ch.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0');
      return el('tr', {}, el('td', { text: cp < 32 ? CTRL[cp] : cp === 32 ? '␠' : ch, style: 'font-size:15px' }), el('td', {}, el('code', { text: U(cp) })), el('td', { class: 'dim', text: category(ch) }),
        el('td', {}, el('code', { text: hexb(new TextEncoder().encode(ch)) })), el('td', {}, el('code', { text: u16 })), el('td', { text: cp }),
        el('td', {}, el('code', { text: ENT[cp] || `&#${cp};` })), el('td', {}, el('code', { text: cp > 0xffff ? `\\u{${cp.toString(16)}} / \\${cp.toString(16)}` : `\\u${cp.toString(16).padStart(4, '0')} / \\${cp.toString(16)}` })));
    }));
});
live($$('input[name="rng"]'), () => {
  const base = +pick('rng'), rows = [];
  for (let r = 0; r < 32; r++) rows.push(el('tr', {}, ...[0, 32, 64, 96].map((c) => {
    const n = base + c + r, ch = n < 32 ? CTRL[n] : n === 32 ? 'SP' : n === 127 ? 'DEL' : n >= 128 && n < 160 ? '·' : String.fromCharCode(n);
    return [el('td', { class: 'dim', text: `${n} · ${n.toString(16).toUpperCase().padStart(2, '0')}` }), el('td', { text: ch })];
  }).flat()));
  $('#ascii').replaceChildren(el('tr', {}, ...Array.from({ length: 4 }, () => [el('th', { text: 'dec · hex' }), el('th', { text: 'char' })]).flat()), ...rows);
});
