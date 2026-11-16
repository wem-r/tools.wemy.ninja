// Shared helpers for the Cipher Suite. Pure.

export const AZ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const AZ09 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
export const mod = (a, m) => ((a % m) + m) % m;
export const letters = (s) => String(s).toUpperCase().replace(/[^A-Z]/g, '');
export const alnum = (s) => String(s).toUpperCase().replace(/[^A-Z0-9]/g, '');
export const isUp = (c) => c >= 'A' && c <= 'Z';
export const isLow = (c) => c >= 'a' && c <= 'z';

/** Apply f(index 0-25, k) to each letter, keeping case and everything else. k counts letters only. */
export function mapLetters(text, f) {
  let k = 0, out = '';
  for (const c of String(text)) {
    if (isUp(c)) out += AZ[mod(f(c.charCodeAt(0) - 65, k++), 26)];
    else if (isLow(c)) out += AZ[mod(f(c.charCodeAt(0) - 97, k++), 26)].toLowerCase();
    else out += c;
  }
  return out;
}

/** Keyword-mixed alphabet: key letters first (deduplicated), then the rest of `alpha`. */
export function keyedAlphabet(key, alpha = AZ, merge = null) {
  const seen = new Set(), out = [];
  for (let c of String(key).toUpperCase() + alpha) {
    if (merge && c === merge[0]) c = merge[1];
    if (alpha.includes(c) && !seen.has(c)) { seen.add(c); out.push(c); }
  }
  return out.join('');
}

/** Polybius square from a key: size 5 (I=J merged) or 6 (A-Z0-9). */
export function square(key = '', size = 5) {
  const alpha = size === 6 ? AZ09 : 'ABCDEFGHIKLMNOPQRSTUVWXYZ';
  return keyedAlphabet(String(key).toUpperCase().replace(/J/g, size === 6 ? 'J' : 'I'), alpha, size === 6 ? null : ['J', 'I']);
}
export const clean5 = (s) => letters(s).replace(/J/g, 'I');
export const clean6 = (s) => alnum(s);

/** Numeric order of a key: "ZEBRA" → [4, 2, 1, 3, 0] (rank of each position, stable for repeated letters). */
export function keyOrder(key) {
  const k = String(key).toUpperCase().split('');
  const idx = k.map((c, i) => [c, i]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] - b[1]));
  const rank = new Array(k.length);
  idx.forEach(([, i], r) => { rank[i] = r; });
  return rank;
}

/** Columnar transposition: write row by row under the key, read columns in key order. */
export function columnarEnc(text, key, pad = '') {
  const n = key.length, order = keyOrder(key);
  let t = text;
  if (pad && t.length % n) t += pad.repeat(n - (t.length % n));
  const cols = Array.from({ length: n }, () => '');
  [...t].forEach((c, i) => { cols[i % n] += c; });
  return order.map((r, i) => [r, cols[i]]).sort((a, b) => a[0] - b[0]).map((x) => x[1]).join('');
}
export function columnarDec(text, key) {
  const n = key.length, order = keyOrder(key), L = text.length, rows = Math.ceil(L / n), full = L % n || n;
  const lens = Array.from({ length: n }, (_, i) => (i < full ? rows : rows - 1));
  const cols = new Array(n);
  let p = 0;
  for (let r = 0; r < n; r++) { const i = order.indexOf(r); cols[i] = text.slice(p, p + lens[i]); p += lens[i]; }
  let out = '';
  for (let r = 0; r < rows; r++) for (let i = 0; i < n; i++) if (r < cols[i].length) out += cols[i][r];
  return out;
}

export const groups = (s, n = 5) => (n > 0 ? s.replace(new RegExp(`(.{${n}})(?=.)`, 'g'), '$1 ') : s);

/** Deterministic PRNG (mulberry32) from a string seed — for keyed tables that must be reproducible. */
export function rng(seed) {
  let h = 1779033703 ^ String(seed).length;
  for (const c of String(seed)) { h = Math.imul(h ^ c.charCodeAt(0), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export const MORSE = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
  0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--', '/': '-..-.', '(': '-.--.', ')': '-.--.-', '&': '.-...', ':': '---...', ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-', _: '..--.-', '"': '.-..-.', $: '...-..-', '@': '.--.-.',
};
export const MORSE_REV = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));

/** English letter frequencies (%), A–Z. */
export const EN_FREQ = [8.167, 1.492, 2.782, 4.253, 12.702, 2.228, 2.015, 6.094, 6.966, 0.153, 0.772, 4.025, 2.406, 6.749, 7.507, 1.929, 0.095, 5.987, 6.327, 9.056, 2.758, 0.978, 2.36, 0.15, 1.974, 0.074];
export function chi2(s) {
  const t = letters(s), n = t.length;
  if (!n) return Infinity;
  const c = new Array(26).fill(0);
  for (const ch of t) c[ch.charCodeAt(0) - 65]++;
  return c.reduce((a, o, i) => { const e = (EN_FREQ[i] / 100) * n; return a + ((o - e) ** 2) / e; }, 0);
}
export function ioc(s) {
  const t = letters(s), n = t.length;
  if (n < 2) return 0;
  const c = new Array(26).fill(0);
  for (const ch of t) c[ch.charCodeAt(0) - 65]++;
  return c.reduce((a, x) => a + x * (x - 1), 0) / (n * (n - 1));
}
