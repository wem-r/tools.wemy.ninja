// Encodings (45). Same shape as the ciphers: { id, name, desc, params, enc, dec, sample, labels? }. Pure.
import { MORSE, MORSE_REV, mod } from './util.js';
import { encode as punyEnc, decode as punyDec, toASCII, toUnicode } from '../punycode.js';

const T = (id, label, def = '', extra = {}) => ({ id, label, type: 'text', def, ...extra });
const N = (id, label, def, min, max) => ({ id, label, type: 'number', def, min, max });
const S = (id, label, opts, def) => ({ id, label, type: 'select', opts, def: def ?? opts[0][0] });
const C = (id, label, def = false) => ({ id, label, type: 'check', def });
const need = (c, m) => { if (!c) throw new Error(m); };
const te = new TextEncoder(), td = new TextDecoder();
const bytes = (s) => te.encode(s);
const text = (b) => td.decode(Uint8Array.from(b));
const tokens = (s) => String(s).trim().split(/[\s,;]+/).filter(Boolean);
const b64 = (b) => { let s = ''; for (const x of b) s += String.fromCharCode(x); return btoa(s); };
const unb64 = (s) => { s = String(s).trim().replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, ''); s += '='.repeat((4 - (s.length % 4)) % 4); return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)); };
const hexOf = (b, sep = '') => [...b].map((x) => x.toString(16).padStart(2, '0')).join(sep);
const unhex = (h) => { h = String(h).replace(/^0x/i, '').replace(/[^0-9a-f]/gi, ''); need(h.length % 2 === 0, 'odd number of hex digits'); return Uint8Array.from(h.match(/../g) || [], (x) => parseInt(x, 16)); };

// ---------- bases ----------
function baseN(b, alpha) { // big-number base conversion, leading zero bytes kept as alpha[0]
  let n = 0n; for (const x of b) n = n * 256n + BigInt(x);
  let s = ''; const B = BigInt(alpha.length);
  while (n > 0n) { s = alpha[Number(n % B)] + s; n /= B; }
  for (const x of b) { if (x) break; s = alpha[0] + s; }
  return s;
}
function unbaseN(s, alpha) {
  let n = 0n; const B = BigInt(alpha.length);
  for (const c of s.trim()) { const i = alpha.indexOf(c); need(i >= 0, `"${c}" is not in the alphabet`); n = n * B + BigInt(i); }
  const out = []; while (n > 0n) { out.unshift(Number(n % 256n)); n /= 256n; }
  for (const c of s.trim()) { if (c !== alpha[0]) break; out.unshift(0); }
  return Uint8Array.from(out);
}
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567', B32H = '0123456789ABCDEFGHIJKLMNOPQRSTUV';
function base32(b, alpha = B32) { let bits = '', o = ''; for (const x of b) bits += x.toString(2).padStart(8, '0'); for (let i = 0; i < bits.length; i += 5) o += alpha[parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)]; return o.padEnd(Math.ceil(o.length / 8) * 8, '='); }
function unbase32(s, alpha = B32) { let bits = ''; for (const c of s.toUpperCase().replace(/[=\s]/g, '')) { const i = alpha.indexOf(c); need(i >= 0, `"${c}" is not Base32`); bits += i.toString(2).padStart(5, '0'); } return Uint8Array.from(bits.match(/.{8}/g) || [], (x) => parseInt(x, 2)); }
function a85(b) {
  let o = '<~';
  for (let i = 0; i < b.length; i += 4) {
    const chunk = [...b.slice(i, i + 4)], pad = 4 - chunk.length; while (chunk.length < 4) chunk.push(0);
    let n = ((chunk[0] << 24) | (chunk[1] << 16) | (chunk[2] << 8) | chunk[3]) >>> 0;
    if (n === 0 && !pad) { o += 'z'; continue; }
    const g = []; for (let k = 0; k < 5; k++) { g.unshift(String.fromCharCode(33 + (n % 85))); n = Math.floor(n / 85); }
    o += g.slice(0, 5 - pad).join('');
  }
  return o + '~>';
}
function una85(s) {
  s = s.trim().replace(/^<~/, '').replace(/~>$/, '').replace(/\s/g, '').replace(/z/g, '!!!!!');
  const out = [];
  for (let i = 0; i < s.length; i += 5) {
    const g = s.slice(i, i + 5), pad = 5 - g.length; let n = 0;
    for (const c of g.padEnd(5, 'u')) { const v = c.charCodeAt(0) - 33; need(v >= 0 && v < 85, `"${c}" is not Ascii85`); n = n * 85 + v; }
    const four = [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]; out.push(...four.slice(0, 4 - pad));
  }
  return Uint8Array.from(out);
}
const BASES = {
  base64: [(b) => b64(b), (s) => unb64(s)], base64url: [(b) => b64(b).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''), (s) => unb64(s)],
  base32: [(b) => base32(b), (s) => unbase32(s)], base32hex: [(b) => base32(b, B32H), (s) => unbase32(s, B32H)],
  base58: [(b) => baseN(b, '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'), (s) => unbaseN(s, '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz')],
  base62: [(b) => baseN(b, '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'), (s) => unbaseN(s, '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz')],
  base36: [(b) => baseN(b, '0123456789abcdefghijklmnopqrstuvwxyz'), (s) => unbaseN(s.toLowerCase(), '0123456789abcdefghijklmnopqrstuvwxyz')],
  ascii85: [(b) => a85(b), (s) => una85(s)],
};

// ---------- fixed tables ----------
const NATO = ['Alfa', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel', 'India', 'Juliett', 'Kilo', 'Lima', 'Mike', 'November', 'Oscar', 'Papa', 'Quebec', 'Romeo', 'Sierra', 'Tango', 'Uniform', 'Victor', 'Whiskey', 'X-ray', 'Yankee', 'Zulu'];
const NATO_D = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
const BRAILLE = { a: '⠁', b: '⠃', c: '⠉', d: '⠙', e: '⠑', f: '⠋', g: '⠛', h: '⠓', i: '⠊', j: '⠚', k: '⠅', l: '⠇', m: '⠍', n: '⠝', o: '⠕', p: '⠏', q: '⠟', r: '⠗', s: '⠎', t: '⠞', u: '⠥', v: '⠧', w: '⠺', x: '⠭', y: '⠽', z: '⠵', ' ': ' ', ',': '⠂', ';': '⠆', ':': '⠒', '.': '⠲', '!': '⠖', '?': '⠦', '-': '⠤', "'": '⠄', '(': '⠶', ')': '⠶' };
const BR_CAP = '⠠', BR_NUM = '⠼';
function braille(t) {
  let out = '', num = false;
  for (const c of t) {
    if (/\d/.test(c)) { if (!num) { out += BR_NUM; num = true; } out += BRAILLE['jabcdefghi'[+c]]; continue; }
    num = false;
    const l = c.toLowerCase();
    if (BRAILLE[l] === undefined) { out += c; continue; }
    out += (c !== l ? BR_CAP : '') + BRAILLE[l];
  }
  return out;
}
function unbraille(t) {
  const rev = {}; for (const [k, v] of Object.entries(BRAILLE)) if (!(v in rev)) rev[v] = k;
  let out = '', cap = false, num = false;
  for (const c of t) {
    if (c === BR_CAP) { cap = true; continue; }
    if (c === BR_NUM) { num = true; continue; }
    if (c === ' ') { num = false; out += ' '; continue; }
    let l = rev[c] ?? c;
    if (num && 'jabcdefghi'.includes(l)) l = String('jabcdefghi'.indexOf(l)); else num = false;
    out += cap ? l.toUpperCase() : l; cap = false;
  }
  return out;
}
const T9 = { 2: 'ABC', 3: 'DEF', 4: 'GHI', 5: 'JKL', 6: 'MNO', 7: 'PQRS', 8: 'TUV', 9: 'WXYZ', 0: ' ' };
const ITA2_L = { A: '11000', B: '10011', C: '01110', D: '10010', E: '10000', F: '10110', G: '01011', H: '00101', I: '01100', J: '11010', K: '11110', L: '01001', M: '00111', N: '00110', O: '00011', P: '01101', Q: '11101', R: '01010', S: '10100', T: '00001', U: '11100', V: '01111', W: '11001', X: '10111', Y: '10101', Z: '10001', ' ': '00100', '\r': '00010', '\n': '01000' };
const ITA2_F = { '-': '11000', '?': '10011', ':': '01110', $: '10010', 3: '10000', '!': '10110', '&': '01011', '#': '00101', 8: '01100', "'": '11010', '(': '11110', ')': '01001', '.': '00111', ',': '00110', 9: '00011', 0: '01101', 1: '11101', 4: '01010', 5: '00001', 7: '11100', ';': '01111', 2: '11001', '/': '10111', 6: '10101', '"': '10001', ' ': '00100' };
const FIGS = '11011', LTRS = '11111';
const DTMF = { 1: [697, 1209], 2: [697, 1336], 3: [697, 1477], A: [697, 1633], 4: [770, 1209], 5: [770, 1336], 6: [770, 1477], B: [770, 1633], 7: [852, 1209], 8: [852, 1336], 9: [852, 1477], C: [852, 1633], '*': [941, 1209], 0: [941, 1336], '#': [941, 1477], D: [941, 1633] };
const LEET = { a: '4', b: '8', e: '3', g: '6', i: '1', l: '1', o: '0', s: '5', t: '7', z: '2' };
const DNA = 'ACGT';
const ROMAN = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', ' ': '&nbsp;', '©': '&copy;', '®': '&reg;', '€': '&euro;', '£': '&pound;', '—': '&mdash;', '–': '&ndash;', '…': '&hellip;', '«': '&laquo;', '»': '&raquo;', 'é': '&eacute;', 'è': '&egrave;', 'à': '&agrave;', 'ç': '&ccedil;', '°': '&deg;', '×': '&times;' };

// ---------- uu / xx / yEnc / quoted-printable ----------
function uuLike(b, alpha, name = 'data.bin') {
  const lines = [`begin 644 ${name}`];
  for (let i = 0; i < b.length; i += 45) {
    const chunk = b.slice(i, i + 45); let l = alpha[chunk.length];
    for (let j = 0; j < chunk.length; j += 3) { const [x, y = 0, z = 0] = chunk.slice(j, j + 3); l += alpha[x >> 2] + alpha[((x & 3) << 4) | (y >> 4)] + alpha[((y & 15) << 2) | (z >> 6)] + alpha[z & 63]; }
    lines.push(l);
  }
  lines.push(alpha[0], 'end');
  return lines.join('\n');
}
function unUuLike(s, alpha) {
  const out = [];
  for (const line of s.split(/\r?\n/)) {
    if (!line || /^(begin|end)/.test(line)) continue;
    const n = alpha.indexOf(line[0]); if (n <= 0) continue;
    const v = [...line.slice(1)].map((c) => { const i = alpha.indexOf(c); return i < 0 ? 0 : i; });
    const got = [];
    for (let j = 0; j + 3 < v.length + 3 && got.length < n; j += 4) { const [a = 0, b = 0, c = 0, d = 0] = v.slice(j, j + 4); got.push((a << 2) | (b >> 4), ((b & 15) << 4) | (c >> 2), ((c & 3) << 6) | d); }
    out.push(...got.slice(0, n));
  }
  return Uint8Array.from(out);
}
const UU = '`' + Array.from({ length: 63 }, (_, i) => String.fromCharCode(33 + i)).join('');
const XX = '+-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
function yenc(b, name = 'data.bin') {
  let line = '', out = `=ybegin line=128 size=${b.length} name=${name}\n`;
  for (const x of b) {
    let c = (x + 42) % 256;
    if ([0, 10, 13, 61].includes(c) || (c === 46 && !line) || ((c === 9 || c === 32) && !line)) { line += '=' + String.fromCharCode((c + 64) % 256); }
    else line += String.fromCharCode(c);
    if (line.length >= 128) { out += line + '\n'; line = ''; }
  }
  return out + (line ? line + '\n' : '') + `=yend size=${b.length}`;
}
function unyenc(s) {
  const out = [];
  for (const line of s.split(/\r?\n/)) {
    if (/^=y(begin|part|end)/.test(line)) continue;
    for (let i = 0; i < line.length; i++) { let c = line.charCodeAt(i) & 255; if (line[i] === '=') { i++; c = (line.charCodeAt(i) - 64) & 255; } out.push((c - 42 + 256) % 256); }
  }
  return Uint8Array.from(out);
}
function qp(t) {
  const lines = [];
  for (const raw of t.split(/\r?\n/)) {
    let l = '';
    for (const x of bytes(raw)) { const c = String.fromCharCode(x); l += (x >= 33 && x <= 126 && x !== 61) || x === 32 ? c : `=${x.toString(16).toUpperCase().padStart(2, '0')}`; }
    l = l.replace(/ $/, '=20');
    while (l.length > 76) { let cut = 75; if (l[cut - 1] === '=') cut -= 1; else if (l[cut - 2] === '=') cut -= 2; lines.push(l.slice(0, cut) + '='); l = l.slice(cut); }
    lines.push(l);
  }
  return lines.join('\r\n');
}
function unqp(s) {
  const t = s.replace(/=\r?\n/g, ''); const out = [];
  for (let i = 0; i < t.length; i++) { if (t[i] === '=' && /^[0-9A-F]{2}$/i.test(t.slice(i + 1, i + 3))) { out.push(parseInt(t.slice(i + 1, i + 3), 16)); i += 2; } else out.push(...bytes(t[i])); }
  return text(out);
}

// ---------- numbers ----------
const toBig = (s) => { const t = String(s).trim().replace(/[_\s]/g, ''); need(/^-?(0x[0-9a-f]+|0b[01]+|0o[0-7]+|\d+)$/i.test(t), `"${s}" is not an integer`); return t.startsWith('-') ? -BigInt(t.slice(1)) : BigInt(t); };
const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const SCALES = ['', 'thousand', 'million', 'billion', 'trillion', 'quadrillion', 'quintillion'];
function words3(n) {
  const h = Math.floor(n / 100), r = n % 100, p = [];
  if (h) p.push(`${ONES[h]} hundred`);
  if (r) p.push(r < 20 ? ONES[r] : TENS[Math.floor(r / 10)] + (r % 10 ? `-${ONES[r % 10]}` : ''));
  return p.join(' and ');
}
export function numberToWords(v) {
  let n = toBig(v);
  if (n === 0n) return 'zero';
  const neg = n < 0n; if (neg) n = -n;
  const parts = []; let i = 0;
  while (n > 0n) { const c = Number(n % 1000n); if (c) { need(i < SCALES.length, 'number too large'); parts.unshift(words3(c) + (SCALES[i] ? ` ${SCALES[i]}` : '')); } n /= 1000n; i++; }
  return (neg ? 'minus ' : '') + parts.join(', ');
}
export function wordsToNumber(s) {
  const w = String(s).toLowerCase().replace(/-/g, ' ').replace(/,| and /g, ' ').split(/\s+/).filter(Boolean);
  let total = 0n, cur = 0n, neg = false;
  for (const x of w) {
    if (x === 'minus' || x === 'negative') { neg = true; continue; }
    if (x === 'and') continue;
    let i = ONES.indexOf(x);
    if (i >= 0) { cur += BigInt(i); continue; }
    i = TENS.indexOf(x); if (i >= 2) { cur += BigInt(i * 10); continue; }
    if (x === 'hundred') { cur *= 100n; continue; }
    i = SCALES.indexOf(x); need(i > 0, `unknown word "${x}"`);
    total += cur * 1000n ** BigInt(i); cur = 0n;
  }
  return String((neg ? -1n : 1n) * (total + cur));
}
function bijective(n) { let s = ''; n = BigInt(n); need(n > 0n, 'use a positive number'); while (n > 0n) { n -= 1n; s = String.fromCharCode(65 + Number(n % 26n)) + s; n /= 26n; } return s; }
function unbijective(s) { let n = 0n; for (const c of String(s).toUpperCase().replace(/[^A-Z]/g, '')) n = n * 26n + BigInt(c.charCodeAt(0) - 64); return String(n); }
function floatEnc(v, bits) { const b = new DataView(new ArrayBuffer(bits / 8)); bits === 32 ? b.setFloat32(0, Number(v)) : b.setFloat64(0, Number(v)); return hexOf(new Uint8Array(b.buffer)); }
function floatDec(h, bits) { const b = unhex(h); need(b.length === bits / 8, `expected ${bits / 4} hex digits`); const d = new DataView(b.buffer); return String(bits === 32 ? d.getFloat32(0) : d.getFloat64(0)); }
function floatParts(v, bits) {
  const h = floatEnc(v, bits), bin = [...unhex(h)].map((x) => x.toString(2).padStart(8, '0')).join(''), e = bits === 32 ? 8 : 11;
  return `${h}\nsign ${bin[0]} · exponent ${bin.slice(1, 1 + e)} · mantissa ${bin.slice(1 + e)}`;
}
const twos = (v, bits) => { const n = toBig(v), m = 1n << BigInt(bits); need(n >= -(m >> 1n) && n < m, `out of range for ${bits} bits`); return (n < 0n ? n + m : n).toString(2).padStart(bits, '0'); };
const untwos = (s, bits) => { const b = String(s).replace(/[^01]/g, ''); need(b.length && b.length <= bits, `expected up to ${bits} bits`); let n = BigInt('0b' + b); if (b.length === bits && b[0] === '1') n -= 1n << BigInt(bits); return String(n); };
const ones = (v, bits) => { const n = toBig(v), m = (1n << BigInt(bits)) - 1n; return (n < 0n ? m + n : n).toString(2).padStart(bits, '0'); };
const unones = (s, bits) => { const b = String(s).replace(/[^01]/g, '').padStart(bits, '0'); let n = BigInt('0b' + b); if (b[0] === '1') n = -((1n << BigInt(bits)) - 1n - n); return String(n); };
const gray = (n) => n ^ (n >> 1n);
const ungray = (g) => { let n = g; for (let s = g >> 1n; s > 0n; s >>= 1n) n ^= s; return n; };
function rle(t) { let o = ''; for (let i = 0; i < t.length;) { let j = i; while (j < t.length && t[j] === t[i]) j++; o += (j - i > 1 ? j - i : '') + t[i]; i = j; } return o; }
function unrle(t) { return t.replace(/(\d+)(\D)/g, (_, n, c) => c.repeat(Math.min(+n, 1e6))); }
const FULL = (c) => { const x = c.codePointAt(0); return x === 32 ? '　' : x > 32 && x < 127 ? String.fromCodePoint(x + 0xfee0) : c; };
const UNFULL = (c) => { const x = c.codePointAt(0); return x === 0x3000 ? ' ' : x > 0xff00 && x < 0xff5f ? String.fromCodePoint(x - 0xfee0) : c; };
const FLIP = Object.fromEntries([...'abcdefghijklmnopqrstuvwxyz'].map((c, i) => [c, 'ɐqɔpǝɟƃɥᴉɾʞlɯuodbɹsʇnʌʍxʎz'[i]]));
const words = (s) => [...s];

export const ENCODINGS = [
  { id: 'base', name: 'Base Encoder', desc: 'Base64, Base64url, Base32, Base32hex, Base58 (Bitcoin), Base62, Base36 and Ascii85 of UTF-8 text.', params: [S('b', 'base', [['base64', 'Base64'], ['base64url', 'Base64url'], ['base32', 'Base32'], ['base32hex', 'Base32hex'], ['base58', 'Base58'], ['base62', 'Base62'], ['base36', 'Base36'], ['ascii85', 'Ascii85']])],
    enc: (t, p) => BASES[p.b][0](bytes(t)), dec: (t, p) => text(BASES[p.b][1](t)), sample: 'Hello, world!' },
  { id: 'hex', name: 'Hex', desc: 'UTF-8 bytes as hexadecimal.', params: [S('sep', 'separator', [['', 'none'], [' ', 'space'], [':', 'colon'], ['\\x', '\\x prefix']]), C('up', 'uppercase')],
    enc: (t, p) => { let h = p.sep === '\\x' ? [...bytes(t)].map((x) => '\\x' + x.toString(16).padStart(2, '0')).join('') : hexOf(bytes(t), p.sep); return p.up ? h.toUpperCase().replace(/\\X/g, '\\x') : h; }, dec: (t) => text(unhex(String(t).replace(/\\x/gi, ''))), sample: 'Hello' },
  { id: 'binary', name: 'Binary', desc: 'UTF-8 bytes as 8-bit groups.', params: [], enc: (t) => [...bytes(t)].map((x) => x.toString(2).padStart(8, '0')).join(' '), dec: (t) => { const b = String(t).replace(/[^01]/g, ''); return text((b.match(/.{8}/g) || []).map((x) => parseInt(x, 2))); }, sample: 'Hi' },
  { id: 'octal', name: 'Octal', desc: 'UTF-8 bytes in base 8.', params: [], enc: (t) => [...bytes(t)].map((x) => x.toString(8).padStart(3, '0')).join(' '), dec: (t) => text(tokens(t).map((x) => parseInt(x, 8))), sample: 'Hi' },
  { id: 'decimal', name: 'Decimal', desc: 'UTF-8 bytes as decimal numbers (or code points).', params: [S('u', 'unit', [['bytes', 'UTF-8 bytes'], ['cp', 'code points']])],
    enc: (t, p) => (p.u === 'cp' ? [...t].map((c) => c.codePointAt(0)) : [...bytes(t)]).join(' '), dec: (t, p) => (p.u === 'cp' ? String.fromCodePoint(...tokens(t).map(Number)) : text(tokens(t).map(Number))), sample: 'Hi!' },
  { id: 'url', name: 'URL Encoding', desc: 'Percent-encoding (encodeURIComponent, or every byte).', params: [C('all', 'encode every byte')],
    enc: (t, p) => (p.all ? [...bytes(t)].map((x) => '%' + x.toString(16).toUpperCase().padStart(2, '0')).join('') : encodeURIComponent(t)), dec: (t) => decodeURIComponent(String(t).replace(/\+/g, ' ')), sample: 'café & crème / 100%' },
  { id: 'morse', name: 'Morse Code', desc: 'International Morse: letters separated by spaces, words by " / ".', params: [T('dot', 'dot', '.', { short: true }), T('dash', 'dash', '-', { short: true })],
    enc: (t, p) => String(t).toUpperCase().trim().split(/\s+/).map((w) => [...w].map((c) => MORSE[c] ?? '').filter(Boolean).join(' ')).join(' / ').replace(/\./g, '\u0001').replace(/-/g, p.dash || '-').replace(/\u0001/g, p.dot || '.'),
    dec: (t, p) => String(t).split(/\s*\/\s*|\s{3,}/).map((w) => w.trim().split(/\s+/).map((c) => MORSE_REV[c.split(p.dot || '.').join('\u0001').split(p.dash || '-').join('-').replace(/\u0001/g, '.')] ?? (c ? '?' : '')).join('')).join(' '), sample: 'SOS help' },
  { id: 'nato', name: 'NATO Phonetic', desc: 'Spell text with the NATO / ICAO alphabet.', params: [],
    enc: (t) => [...String(t).toUpperCase()].map((c) => (c >= 'A' && c <= 'Z' ? NATO[c.charCodeAt(0) - 65] : /\d/.test(c) ? NATO_D[+c] : c === ' ' ? '(space)' : c)).join(' '),
    dec: (t) => tokens(t).map((w) => { const i = NATO.findIndex((x) => x.toLowerCase() === w.toLowerCase().replace('alpha', 'alfa').replace('juliet', 'juliett').replace('xray', 'x-ray')); if (i >= 0) return AZchar(i); const d = NATO_D.findIndex((x) => x.toLowerCase() === w.toLowerCase()); return d >= 0 ? d : w === '(space)' ? ' ' : w; }).join(''), sample: 'WEM 42' },
  { id: 'roman', name: 'Roman Numerals', desc: 'Numbers 1–3999 ↔ Roman numerals.', params: [],
    enc: (t) => tokens(t).map((x) => { let n = +x; need(Number.isInteger(n) && n > 0 && n < 4000, 'use whole numbers 1–3999'); let s = ''; for (const [v, r] of ROMAN) while (n >= v) { s += r; n -= v; } return s; }).join(' '),
    dec: (t) => tokens(t).map((x) => { const s = x.toUpperCase(); need(/^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/.test(s) && s, `"${x}" is not a valid Roman numeral`); let n = 0, i = 0; for (const [v, r] of ROMAN) while (s.startsWith(r, i)) { n += v; i += r.length; } return n; }).join(' '), sample: '2026 1999 14' },
  { id: 'braille', name: 'Braille', desc: 'Grade 1 (uncontracted) Braille with capital and number signs, as Unicode Braille patterns.', params: [], enc: (t) => braille(t), dec: (t) => unbraille(t), sample: 'Hello World 42' },
  { id: 'uuencode', name: 'UUencode', desc: 'Unix-to-Unix encoding (begin / end block).', params: [T('name', 'file name', 'data.txt')], enc: (t, p) => uuLike(bytes(t), UU, p.name || 'data.txt'), dec: (t) => text(unUuLike(t, UU)), sample: 'Cat' },
  { id: 'quoted-printable', name: 'Quoted-Printable', desc: 'MIME quoted-printable (RFC 2045), as in e-mail bodies.', params: [], enc: (t) => qp(t), dec: (t) => unqp(t), sample: 'Réunion à 10h — merci !' },
  { id: 'gray', name: 'Gray Code', desc: 'Binary-reflected Gray code of numbers (consecutive values differ by one bit).', params: [N('bits', 'bits', 8, 1, 64)],
    enc: (t, p) => tokens(t).map((x) => gray(toBig(x)).toString(2).padStart(+p.bits, '0')).join(' '), dec: (t) => tokens(t).map((x) => String(ungray(BigInt('0b' + x.replace(/[^01]/g, ''))))).join(' '), sample: '0 1 2 3 4 5 6 7' },
  { id: 'punycode', name: 'Punycode', desc: 'Internationalised domain names: Unicode ↔ xn-- (whole domains or single labels).', params: [],
    enc: (t) => tokens(t).map((x) => (x.includes('.') ? toASCII(x.toLowerCase()) : 'xn--' + punyEnc(x.toLowerCase()))).join(' '), dec: (t) => tokens(t).map((x) => (x.includes('.') ? toUnicode(x.toLowerCase()) : punyDec(x.toLowerCase().replace(/^xn--/, '')))).join(' '), sample: 'münchen.de bücher' },
  { id: 't9', name: 'T9 / Multi-tap', desc: 'Phone keypad multi-tap: each letter is its key pressed N times (2 = A, 22 = B…); 0 = space.', params: [],
    enc: (t) => [...String(t).toUpperCase()].map((c) => { for (const [k, l] of Object.entries(T9)) { const i = l.indexOf(c); if (i >= 0) return k.repeat(i + 1); } return ''; }).filter(Boolean).join(' '),
    dec: (t) => tokens(t).map((g) => { const k = g[0], l = T9[k]; need(l && /^(\d)\1*$/.test(g), `"${g}" is not a multi-tap group`); return l[(g.length - 1) % l.length]; }).join(''), sample: 'hello world' },
  { id: 'rle', name: 'Run-Length Encoding', desc: 'Runs of the same character become count + character (AAAB → 3AB).', params: [], enc: (t) => rle(t), dec: (t) => unrle(t), sample: 'WWWWWWWWWWWWBWWWWWWWWWWWWBBBWWWWWWWWWWWWWWWWWWWWWWWWBWWWWWWWWWWWWWW' },
  { id: 'reverse', name: 'Reverse Text / Mirror', desc: 'Reverse the characters, or flip the text upside down.', params: [S('m', 'mode', [['rev', 'reverse'], ['flip', 'upside down']])],
    enc: (t, p) => { const r = [...t].reverse(); return p.m === 'flip' ? r.map((c) => FLIP[c.toLowerCase()] ?? c).join('') : r.join(''); },
    dec: (t, p) => { const r = [...t].reverse(); if (p.m !== 'flip') return r.join(''); const inv = Object.fromEntries(Object.entries(FLIP).map(([a, b]) => [b, a])); return r.map((c) => inv[c] ?? c).join(''); }, sample: 'Hello world' },
  { id: 'bcd', name: 'Binary Coded Decimal', desc: 'Each decimal digit as 4 bits (8421 BCD).', params: [], enc: (t) => [...String(t).replace(/\D/g, '')].map((d) => (+d).toString(2).padStart(4, '0')).join(' '), dec: (t) => (String(t).replace(/[^01]/g, '').match(/.{4}/g) || []).map((x) => { const v = parseInt(x, 2); need(v < 10, `${x} is not a BCD digit`); return v; }).join(''), sample: '2026' },
  { id: 'baudot', name: 'Baudot Code (ITA2)', desc: '5-bit teleprinter code with letter / figure shift codes.', params: [],
    enc: (t) => { let fig = false; const out = []; for (const c of String(t).toUpperCase()) { if (ITA2_L[c] && (!fig || c === ' ')) out.push(ITA2_L[c]); else if (ITA2_F[c]) { if (!fig) { out.push(FIGS); fig = true; } out.push(ITA2_F[c]); } else if (ITA2_L[c]) { out.push(LTRS, ITA2_L[c]); fig = false; } } return out.join(' '); },
    dec: (t) => { const L = Object.fromEntries(Object.entries(ITA2_L).map(([a, b]) => [b, a])), F = Object.fromEntries(Object.entries(ITA2_F).map(([a, b]) => [b, a])); let fig = false; return (String(t).replace(/[^01]/g, '').match(/.{5}/g) || []).map((c) => { if (c === FIGS) { fig = true; return ''; } if (c === LTRS) { fig = false; return ''; } return (fig ? F[c] : L[c]) ?? '?'; }).join(''); }, sample: 'CALL 911 NOW' },
  { id: 'dtmf', name: 'DTMF', desc: 'Telephone keys as their two tone frequencies (Hz).', params: [],
    enc: (t) => [...String(t).toUpperCase()].filter((c) => DTMF[c]).map((c) => DTMF[c].join('+')).join(' '), dec: (t) => tokens(t).map((x) => { const [a, b] = x.split('+').map(Number); const k = Object.entries(DTMF).find(([, f]) => f[0] === a && f[1] === b); return k ? k[0] : '?'; }).join(''), sample: '0612345678' },
  { id: 'rot18', name: 'ROT18', desc: 'ROT13 on letters plus ROT5 on digits. Reciprocal.', params: [], enc: (t) => rot18(t), dec: (t) => rot18(t), sample: 'Meet at 1530' },
  { id: 'a1z26', name: 'A1Z26', desc: 'Letters as their position in the alphabet (A = 1 … Z = 26).', params: [T('sep', 'separator', '-', { short: true })],
    enc: (t, p) => String(t).toUpperCase().split(/\s+/).filter(Boolean).map((w) => [...w].filter((c) => c >= 'A' && c <= 'Z').map((c) => c.charCodeAt(0) - 64).join(p.sep || '-')).join(' '), dec: (t) => String(t).trim().split(/\s+/).map((w) => w.split(/\D+/).filter(Boolean).map((n) => AZchar(+n - 1)).join('')).join(' '), sample: 'Hello world' },
  { id: 'excess-3', name: 'Excess-3 (XS-3)', desc: 'Each decimal digit + 3, in 4 bits.', params: [], enc: (t) => [...String(t).replace(/\D/g, '')].map((d) => (+d + 3).toString(2).padStart(4, '0')).join(' '), dec: (t) => (String(t).replace(/[^01]/g, '').match(/.{4}/g) || []).map((x) => parseInt(x, 2) - 3).join(''), sample: '2026' },
  { id: 'custom-base', name: 'Custom Base', desc: 'Encode bytes with any alphabet (its length is the base).', params: [T('alpha', 'alphabet', '0123456789abcdef')],
    enc: (t, p) => { const a = [...new Set(p.alpha)].join(''); need(a.length >= 2, 'the alphabet needs at least 2 characters'); return baseN(bytes(t), a); }, dec: (t, p) => text(unbaseN(t, [...new Set(p.alpha)].join(''))), sample: 'Hi!' },
  { id: 'code-points', name: 'Unicode Code Points', desc: 'Characters ↔ U+XXXX code points.', params: [], enc: (t) => [...t].map((c) => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join(' '), dec: (t) => tokens(t).map((x) => String.fromCodePoint(parseInt(x.replace(/^U\+|^0x|^\\u/i, ''), 16))).join(''), sample: 'Café ☕' },
  { id: 'rot5', name: 'ROT5', desc: 'Rotate digits by 5 (0↔5, 1↔6…). Reciprocal.', params: [], enc: (t) => String(t).replace(/\d/g, (d) => (+d + 5) % 10), dec: (t) => String(t).replace(/\d/g, (d) => (+d + 5) % 10), sample: 'Code 1234567890' },
  { id: 'leet', name: 'Leetspeak (1337)', desc: 'Replace letters with look-alike digits.', params: [], enc: (t) => [...t].map((c) => LEET[c.toLowerCase()] ?? c).join(''), dec: (t) => { const inv = { 4: 'a', 8: 'b', 3: 'e', 6: 'g', 1: 'i', 0: 'o', 5: 's', 7: 't', 2: 'z' }; return [...t].map((c) => inv[c] ?? c).join(''); }, sample: 'Elite hackers' },
  { id: 'fullwidth', name: 'Fullwidth (Vaporwave)', desc: 'ASCII ↔ fullwidth forms (ａｅｓｔｈｅｔｉｃ).', params: [], enc: (t) => [...t].map(FULL).join(''), dec: (t) => [...t].map(UNFULL).join(''), sample: 'aesthetic 2026' },
  { id: 'unary', name: 'Unary Numeral', desc: 'Numbers as repeated marks (5 → 11111).', params: [T('mark', 'mark', '1', { short: true })],
    enc: (t, p) => tokens(t).map((x) => { const n = +x; need(Number.isInteger(n) && n >= 0 && n <= 10000, 'use whole numbers 0–10000'); return (p.mark || '1').repeat(n) || '0'; }).join(' '), dec: (t, p) => tokens(t).map((x) => (x === '0' ? 0 : x.split(p.mark || '1').length - 1)).join(' '), sample: '3 5 1' },
  { id: 'dna', name: 'DNA Encoding', desc: 'Two bits per nucleotide: A = 00, C = 01, G = 10, T = 11.', params: [], enc: (t) => [...bytes(t)].map((x) => [6, 4, 2, 0].map((s) => DNA[(x >> s) & 3]).join('')).join(''), dec: (t) => { const s = String(t).toUpperCase().replace(/[^ACGT]/g, ''); return text((s.match(/.{4}/g) || []).map((q) => [...q].reduce((a, c) => (a << 2) | DNA.indexOf(c), 0))); }, sample: 'Hi' },
  { id: 'ternary', name: 'Ternary (Base 3)', desc: 'UTF-8 bytes in base 3 (6 trits per byte).', params: [], enc: (t) => [...bytes(t)].map((x) => x.toString(3).padStart(6, '0')).join(' '), dec: (t) => text(tokens(t).map((x) => parseInt(x, 3))), sample: 'Hi' },
  { id: 'reverse-words', name: 'Reverse Words', desc: 'Reverse the order of words, or the letters inside each word.', params: [S('m', 'mode', [['order', 'word order'], ['each', 'each word']])],
    enc: (t, p) => (p.m === 'each' ? t.replace(/\S+/g, (w) => [...w].reverse().join('')) : t.split(/(\s+)/).reverse().join('')), dec: (t, p) => (p.m === 'each' ? t.replace(/\S+/g, (w) => [...w].reverse().join('')) : t.split(/(\s+)/).reverse().join('')), sample: 'the quick brown fox' },
  { id: 'bijective-26', name: 'Bijective Base 26', desc: 'Numbers ↔ spreadsheet column letters (1 = A, 26 = Z, 27 = AA).', params: [], enc: (t) => tokens(t).map(bijective).join(' '), dec: (t) => tokens(t).map(unbijective).join(' '), sample: '1 26 27 702 16384' },
  { id: 'html-entities', name: 'HTML Entities', desc: 'Escape text for HTML (named, decimal or hex entities) and back.', params: [S('m', 'style', [['named', 'named where possible'], ['dec', 'decimal &#…;'], ['hex', 'hex &#x…;'], ['min', 'only < > & " \'']])],
    enc: (t, p) => [...t].map((c) => { const cp = c.codePointAt(0); if (p.m === 'min') return ENTITIES[c] && '<>&"\''.includes(c) ? ENTITIES[c] : c; if (cp < 128 && !'<>&"\''.includes(c)) return c; if (p.m === 'named' && ENTITIES[c]) return ENTITIES[c]; return p.m === 'hex' ? `&#x${cp.toString(16)};` : `&#${cp};`; }).join(''),
    dec: (t) => { const inv = Object.fromEntries(Object.entries(ENTITIES).map(([a, b]) => [b, a])); return String(t).replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&[a-z]+;/gi, (e) => inv[e.toLowerCase()] ?? e); }, sample: '<a href="?q=café">Tom & Jerry</a>' },
  { id: 'twos-complement', name: "Two's Complement", desc: 'Signed integers ↔ their n-bit two\'s complement form.', params: [N('bits', 'bits', 8, 2, 128)], enc: (t, p) => tokens(t).map((x) => twos(x, +p.bits)).join(' '), dec: (t, p) => tokens(t).map((x) => untwos(x, +p.bits)).join(' '), sample: '-1 -128 127 5' },
  { id: 'ieee754', name: 'IEEE 754 Float', desc: 'Decimal ↔ 32 / 64-bit floating point (hex, with sign / exponent / mantissa).', params: [S('bits', 'precision', [['32', 'single (32-bit)'], ['64', 'double (64-bit)']])], enc: (t, p) => tokens(t).map((x) => floatParts(x, +p.bits)).join('\n\n'), dec: (t, p) => tokens(t).map((x) => floatDec(x, +p.bits)).join(' '), sample: '3.14159 -0.1' },
  { id: 'endianness', name: 'Endianness Converter', desc: 'Swap byte order of hex values in 16 / 32 / 64-bit words.', params: [S('w', 'word size', [['2', '16-bit'], ['4', '32-bit'], ['8', '64-bit']], '4')],
    enc: (t, p) => { const b = [...unhex(t)], w = +p.w; need(b.length % w === 0, `length must be a multiple of ${w} bytes`); const out = []; for (let i = 0; i < b.length; i += w) out.push(hexOf(b.slice(i, i + w).reverse())); return out.join(' '); },
    dec: (t, p) => { const b = [...unhex(t)], w = +p.w; need(b.length % w === 0, `length must be a multiple of ${w} bytes`); const out = []; for (let i = 0; i < b.length; i += w) out.push(hexOf(b.slice(i, i + w).reverse())); return out.join(' '); }, sample: 'deadbeef 01020304', labels: ['swap', 'swap back'] },
  { id: 'yenc', name: 'yEnc', desc: 'Usenet binary encoding (=ybegin / =yend).', params: [T('name', 'file name', 'data.txt')], enc: (t, p) => yenc(bytes(t), p.name || 'data.txt'), dec: (t) => text(unyenc(t)), sample: 'yEnc test' },
  { id: 'xxencode', name: 'Xxencode', desc: 'Like UUencode, with a safer character set.', params: [T('name', 'file name', 'data.txt')], enc: (t, p) => uuLike(bytes(t), XX, p.name || 'data.txt'), dec: (t) => text(unUuLike(t, XX)), sample: 'Cat' },
  { id: 'number-words', name: 'Number to Words', desc: 'Integers ↔ English words (short scale).', params: [], enc: (t) => tokens(t).map(numberToWords).join('\n'), dec: (t) => String(t).split('\n').filter((l) => l.trim()).map(wordsToNumber).join(' '), sample: '42 1999 1000001' },
  { id: 'ones-complement', name: "Ones' Complement", desc: "Signed integers ↔ n-bit ones' complement.", params: [N('bits', 'bits', 8, 2, 128)], enc: (t, p) => tokens(t).map((x) => ones(x, +p.bits)).join(' '), dec: (t, p) => tokens(t).map((x) => unones(x, +p.bits)).join(' '), sample: '-1 5 -5' },
  { id: 'pem', name: 'PEM Wrap/Unwrap', desc: 'Base64 / hex DER ↔ PEM armour with BEGIN / END lines (64 columns).', params: [S('label', 'label', [['CERTIFICATE', 'CERTIFICATE'], ['PUBLIC KEY', 'PUBLIC KEY'], ['PRIVATE KEY', 'PRIVATE KEY'], ['CERTIFICATE REQUEST', 'CERTIFICATE REQUEST'], ['RSA PRIVATE KEY', 'RSA PRIVATE KEY']])],
    enc: (t, p) => { let s = String(t).replace(/\s/g, ''); if (/^[0-9a-f]+$/i.test(s) && s.length % 2 === 0) s = b64(unhex(s)); return `-----BEGIN ${p.label}-----\n${s.match(/.{1,64}/g).join('\n')}\n-----END ${p.label}-----`; },
    dec: (t) => String(t).replace(/-----(BEGIN|END)[^-]+-----/g, '').replace(/\s/g, ''), sample: 'MIIBCgKCAQEAu1SU1LfVLPHCozMxH2Mo4lgOEePzNm0tRgeLezV6ffAt0gunVTLw7onLRnrq0/IzW7yWR7QkrmBL7jTKEn5u+qKhbwKfBstIs+bMY2Zkp18gnTxKLxoS2tFczGkPLPgizskuemMghRniWaoLcyehkd3qqGElvW/VDL5AaWTg0nLVkjRo9z+40RQzuVaE8AkAFmxZzow3x+VJYKdjykkJ0iT9wCS0DRTXu269V264Vf/3jvredZiKRkgwlL9xNAwxXFg0x/XFw005UWVRIkdgcKWTjpBP2dPwVZ4WWC+9aGVd+Gyn1o0CLelf4rEjGoXbAAEgAqeGUxrcIlbjXfbcmwIDAQAB' },
  { id: 'data-uri', name: 'Base64 Data URI', desc: 'Text ↔ data: URI (any MIME type).', params: [T('mime', 'MIME type', 'text/plain;charset=utf-8')],
    enc: (t, p) => `data:${p.mime || 'text/plain'};base64,${b64(bytes(t))}`, dec: (t) => { const m = String(t).trim().match(/^data:([^,]*?)(;base64)?,(.*)$/s); need(m, 'not a data: URI'); return m[2] ? text(unb64(m[3])) : decodeURIComponent(m[3]); }, sample: 'Hello, data URI!' },
  { id: 'hex-base64', name: 'Hex ↔ Base64', desc: 'Re-encode the same bytes from hex to Base64 and back.', params: [], enc: (t) => b64(unhex(t)), dec: (t) => hexOf(unb64(t)), sample: '48656c6c6f2c20776f726c6421', labels: ['hex → base64', 'base64 → hex'] },
  { id: 'base64url-swap', name: 'Base64 URL-Safe Swap', desc: 'Convert standard Base64 (+ / =) ↔ URL-safe Base64 (- _, no padding).', params: [],
    enc: (t) => String(t).trim().replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''), dec: (t) => { const s = String(t).trim().replace(/-/g, '+').replace(/_/g, '/'); return s + '='.repeat((4 - (s.length % 4)) % 4); }, sample: 'a+b/c+d/ef==', labels: ['to URL-safe', 'to standard'] },
];

function rot18(t) { return String(t).replace(/[a-z]/gi, (c) => { const b = c <= 'Z' ? 65 : 97; return String.fromCharCode(((c.charCodeAt(0) - b + 13) % 26) + b); }).replace(/\d/g, (d) => (+d + 5) % 10); }
function AZchar(i) { return i >= 0 && i < 26 ? String.fromCharCode(65 + i) : '?'; }
void mod; void words;
