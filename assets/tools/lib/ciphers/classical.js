// Classical ciphers (53). Each entry: { id, name, desc, params, enc(text, p), dec(text, p), crack?, sample }.
// Pure functions; tested in tests/ciphers.test.js.
import {
  AZ, AZ09, mod, letters, alnum, mapLetters, keyedAlphabet, square, clean5, clean6, keyOrder,
  columnarEnc, columnarDec, groups, rng, MORSE, MORSE_REV, chi2,
} from './util.js';

const T = (id, label, def = '', extra = {}) => ({ id, label, type: 'text', def, ...extra });
const N = (id, label, def, min, max) => ({ id, label, type: 'number', def, min, max });
const S = (id, label, opts, def) => ({ id, label, type: 'select', opts, def: def ?? opts[0][0] ?? opts[0] });
const C = (id, label, def = false) => ({ id, label, type: 'check', def });
const A = (id, label, def = '') => ({ id, label, type: 'textarea', def });
const noSpace = (s) => String(s).replace(/\s+/g, '');
const keyShifts = (key) => { const k = letters(key); if (!k) throw new Error('enter a key (letters)'); return [...k].map((c) => c.charCodeAt(0) - 65); };
const need = (cond, m) => { if (!cond) throw new Error(m); };
const sq = (s, n) => Object.fromEntries([...s].map((c, i) => [c, [Math.floor(i / n), i % n]]));

// ---------- substitution family ----------
const caesar = (t, s) => mapLetters(t, (i) => i + s);
const vig = (t, key, sign) => { const k = keyShifts(key); return mapLetters(t, (i, j) => i + sign * k[j % k.length]); };
const beaufort = (t, key) => { const k = keyShifts(key); return mapLetters(t, (i, j) => k[j % k.length] - i); };
const subst = (t, from, to) => { const m = Object.fromEntries([...from].map((c, i) => [c, to[i]])); return [...t].map((c) => { const u = c.toUpperCase(); if (!m[u]) return c; return c === u ? m[u] : m[u].toLowerCase(); }).join(''); };

function autokey(t, primer, dec, beau = false, cipherKey = false) {
  const k = keyShifts(primer);
  let out = '', j = 0;
  for (const ch of t) {
    const up = ch.toUpperCase();
    if (up < 'A' || up > 'Z') { out += ch; continue; }
    const p = up.charCodeAt(0) - 65, s = k[j++];
    let r;
    if (beau) r = mod(s - p, 26);
    else r = dec ? mod(p - s, 26) : mod(p + s, 26);
    out += ch === up ? AZ[r] : AZ[r].toLowerCase();
    // the key grows with the plaintext (autokey) or with the ciphertext (autoclave)
    const plain = beau ? (dec ? r : p) : dec ? r : p, cipher = beau ? (dec ? p : r) : dec ? p : r;
    k.push(cipherKey ? cipher : plain);
  }
  return out;
}

// ---------- Polybius-based ----------
function polyEnc(t, key, n, sep = ' ') {
  const s = square(key, n), pos = sq(s, n);
  return [...(n === 6 ? clean6(t) : clean5(t))].map((c) => `${pos[c][0] + 1}${pos[c][1] + 1}`).join(sep);
}
function polyDec(t, key, n) {
  const s = square(key, n), d = String(t).replace(/[^1-9]/g, '');
  need(d.length % 2 === 0, 'expected pairs of digits');
  return d.match(/../g).map(([r, c]) => s[(+r - 1) * n + (+c - 1)] ?? '?').join('');
}
function bifid(t, key, period, n, dec) {
  const s = square(key, n), pos = sq(s, n), txt = n === 6 ? clean6(t) : clean5(t);
  const P = period > 0 ? period : txt.length || 1;
  let out = '';
  for (let b = 0; b < txt.length; b += P) {
    const blk = txt.slice(b, b + P), co = [...blk].map((c) => pos[c]);
    if (!dec) {
      const seq = [...co.map((x) => x[0]), ...co.map((x) => x[1])];
      for (let i = 0; i < seq.length; i += 2) out += s[seq[i] * n + seq[i + 1]];
    } else {
      const seq = co.flat(), L = blk.length;
      for (let i = 0; i < L; i++) out += s[seq[i] * n + seq[L + i]];
    }
  }
  return out;
}
function playfairPrep(t, n) {
  let s = n === 6 ? clean6(t) : clean5(t), out = '';
  for (let i = 0; i < s.length; i++) {
    const a = s[i], b = s[i + 1];
    if (b === undefined) { out += a + (a === 'X' ? 'Q' : 'X'); break; }
    if (a === b) { out += a + (a === 'X' ? 'Q' : 'X'); continue; }
    out += a + b; i++;
  }
  return out;
}
function playfair(t, key, n, dec) {
  const s = square(key, n), pos = sq(s, n), d = dec ? -1 : 1;
  const txt = dec ? (n === 6 ? clean6(t) : clean5(t)) : playfairPrep(t, n);
  need(txt.length % 2 === 0, 'ciphertext must have an even number of letters');
  let out = '';
  for (let i = 0; i < txt.length; i += 2) {
    const [r1, c1] = pos[txt[i]], [r2, c2] = pos[txt[i + 1]];
    if (r1 === r2) out += s[r1 * n + mod(c1 + d, n)] + s[r2 * n + mod(c2 + d, n)];
    else if (c1 === c2) out += s[mod(r1 + d, n) * n + c1] + s[mod(r2 + d, n) * n + c2];
    else out += s[r1 * n + c2] + s[r2 * n + c1];
  }
  return out;
}
function adfgvx(t, sqKey, trKey, n, dec) {
  const L = n === 6 ? 'ADFGVX' : 'ADFGX', s = square(sqKey, n), pos = sq(s, n), k = letters(trKey);
  need(k.length > 1, 'enter a transposition key');
  if (!dec) return groups(columnarEnc([...(n === 6 ? clean6(t) : clean5(t))].map((c) => L[pos[c][0]] + L[pos[c][1]]).join(''), k), 5);
  const f = columnarDec(String(t).toUpperCase().replace(new RegExp(`[^${L}]`, 'g'), ''), k);
  return f.match(/../g)?.map((p) => s[L.indexOf(p[0]) * n + L.indexOf(p[1])]).join('') ?? '';
}
function nihilist(t, sqKey, numKey, n, dec) {
  const s = square(sqKey, n), pos = sq(s, n), code = (c) => (pos[c][0] + 1) * 10 + pos[c][1] + 1;
  const kk = [...(n === 6 ? clean6(numKey) : clean5(numKey))].map(code);
  need(kk.length, 'enter a key word');
  if (!dec) return [...(n === 6 ? clean6(t) : clean5(t))].map((c, i) => code(c) + kk[i % kk.length]).join(' ');
  return String(t).trim().split(/[\s,]+/).filter(Boolean).map((x, i) => { const v = +x - kk[i % kk.length], r = Math.floor(v / 10) - 1, c = (v % 10) - 1; return s[r * n + c] ?? '?'; }).join('');
}
function trifid(t, key, period, dec) {
  const alpha = AZ + '+', s = keyedAlphabet(key, alpha), pos = Object.fromEntries([...s].map((c, i) => [c, [Math.floor(i / 9), Math.floor((i % 9) / 3), i % 3]]));
  const txt = String(t).toUpperCase().replace(/[^A-Z+]/g, ''), P = period > 0 ? period : txt.length || 1;
  let out = '';
  for (let b = 0; b < txt.length; b += P) {
    const blk = [...txt.slice(b, b + P)], co = blk.map((c) => pos[c]), L = blk.length;
    const seq = dec ? co.flat() : [...co.map((x) => x[0]), ...co.map((x) => x[1]), ...co.map((x) => x[2])];
    for (let i = 0; i < L; i++) {
      const [a, bb, c] = dec ? [seq[i], seq[L + i], seq[2 * L + i]] : [seq[3 * i], seq[3 * i + 1], seq[3 * i + 2]];
      out += s[a * 9 + bb * 3 + c];
    }
  }
  return out;
}
function quadSquares(t, k1, k2, dec, four) {
  const plain = square('', 5), A = square(k1, 5), B = square(k2, 5);
  let txt = clean5(t); if (txt.length % 2) txt += 'X';
  const pp = sq(plain, 5), pa = sq(A, 5), pb = sq(B, 5);
  let out = '';
  for (let i = 0; i < txt.length; i += 2) {
    const x = txt[i], y = txt[i + 1];
    if (four) {
      if (!dec) { const [r1, c1] = pp[x], [r2, c2] = pp[y]; out += A[r1 * 5 + c2] + B[r2 * 5 + c1]; }
      else { const [r1, c2] = pa[x], [r2, c1] = pb[y]; out += plain[r1 * 5 + c1] + plain[r2 * 5 + c2]; }
    } else if (!dec) { const [r1, c1] = pa[x], [r2, c2] = pb[y]; out += B[r1 * 5 + c2] + A[r2 * 5 + c1]; }
    else { const [r1, c2] = pb[x], [r2, c1] = pa[y]; out += A[r1 * 5 + c1] + B[r2 * 5 + c2]; }
  }
  return out;
}

// ---------- transposition ----------
function railPattern(n, rails, offset = 0) {
  const cyc = Math.max(1, 2 * (rails - 1));
  return Array.from({ length: n }, (_, i) => { const p = (i + offset) % cyc; return rails === 1 ? 0 : p < rails ? p : cyc - p; });
}
function railEnc(t, rails, offset, order) {
  const pat = railPattern(t.length, rails, offset), r = Array.from({ length: rails }, () => '');
  [...t].forEach((c, i) => { r[pat[i]] += c; });
  return (order || r.map((_, i) => i)).map((i) => r[i]).join('');
}
function railDec(t, rails, offset, order) {
  const pat = railPattern(t.length, rails, offset), lens = new Array(rails).fill(0);
  pat.forEach((r) => lens[r]++);
  const rows = new Array(rails); let p = 0;
  for (const i of order || [...Array(rails).keys()]) { rows[i] = [...t.slice(p, p + lens[i])]; p += lens[i]; }
  return pat.map((r) => rows[r].shift()).join('');
}
function amsco(t, key, dec, start2 = false) {
  const k = letters(key), n = k.length, order = keyOrder(k), txt = noSpace(t);
  need(n > 1, 'enter a key');
  // cell sizes, alternating 1/2, continuing row after row (each row starts where the previous one left off)
  const cells = []; let used = 0, two = start2;
  while (used < txt.length) { const sz = Math.min(two ? 2 : 1, txt.length - used); cells.push(sz); used += sz; two = !two; }
  if (!dec) {
    let p = 0; const cols = Array.from({ length: n }, () => '');
    cells.forEach((sz, i) => { cols[i % n] += txt.slice(p, p + sz); p += sz; });
    return order.map((r, i) => [r, cols[i]]).sort((a, b) => a[0] - b[0]).map((x) => x[1]).join('');
  }
  const colCells = Array.from({ length: n }, () => []);
  cells.forEach((sz, i) => colCells[i % n].push(sz));
  const parts = new Array(n); let p = 0;
  for (let r = 0; r < n; r++) { const i = order.indexOf(r); parts[i] = []; for (const sz of colCells[i]) { parts[i].push(txt.slice(p, p + sz)); p += sz; } }
  return cells.map((_, i) => parts[i % n].shift()).join('');
}
function myszkowski(t, key, dec) {
  const k = letters(key), n = k.length, txt = noSpace(t);
  need(n > 1, 'enter a key');
  const uniq = [...new Set(k)].sort(), rows = Math.ceil(txt.length / n);
  const cellsOf = (u) => { const cols = [...k].map((c, i) => (c === u ? i : -1)).filter((i) => i >= 0); const out = []; for (let r = 0; r < rows; r++) for (const c of cols) if (r * n + c < txt.length) out.push(r * n + c); return out; };
  const order = uniq.flatMap(cellsOf);
  if (!dec) return order.map((i) => txt[i]).join('');
  const out = new Array(txt.length); order.forEach((pos, j) => { out[pos] = txt[j]; });
  return out.join('');
}
function routeSpiral(rows, cols) {
  const out = []; let t = 0, b = rows - 1, l = 0, r = cols - 1;
  while (t <= b && l <= r) {
    for (let c = l; c <= r; c++) out.push(t * cols + c); t++;
    for (let rr = t; rr <= b; rr++) out.push(rr * cols + r); r--;
    if (t <= b) { for (let c = r; c >= l; c--) out.push(b * cols + c); b--; }
    if (l <= r) { for (let rr = b; rr >= t; rr--) out.push(rr * cols + l); l++; }
  }
  return out;
}
function route(t, cols, dec, pad = 'X') {
  let txt = noSpace(t);
  const rows = Math.ceil(txt.length / cols);
  if (!dec) txt = txt.padEnd(rows * cols, pad);
  const order = routeSpiral(rows, cols);
  if (!dec) return order.map((i) => txt[i]).join('');
  const out = new Array(rows * cols); order.forEach((pos, j) => { out[pos] = txt[j] ?? ''; });
  return out.join('');
}

// ---------- Hill ----------
function hillMatrix(key, n) {
  const nums = /\d/.test(key) ? key.split(/[\s,;]+/).filter(Boolean).map(Number) : [...letters(key)].map((c) => c.charCodeAt(0) - 65);
  need(nums.length === n * n, `the key needs ${n * n} numbers or letters for a ${n}×${n} matrix`);
  return Array.from({ length: n }, (_, r) => nums.slice(r * n, r * n + n));
}
const det = (m) => (m.length === 2 ? m[0][0] * m[1][1] - m[0][1] * m[1][0]
  : m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]));
function inv26(m) {
  const n = m.length, d = mod(det(m), 26);
  let di = -1; for (let x = 1; x < 26; x++) if ((d * x) % 26 === 1) di = x;
  need(di > 0, `the key matrix is not invertible mod 26 (determinant ${d}): pick another key`);
  if (n === 2) return [[mod(m[1][1] * di, 26), mod(-m[0][1] * di, 26)], [mod(-m[1][0] * di, 26), mod(m[0][0] * di, 26)]];
  const cof = (r, c) => { const s = m.filter((_, i) => i !== r).map((row) => row.filter((_, j) => j !== c)); return (s[0][0] * s[1][1] - s[0][1] * s[1][0]) * ((r + c) % 2 ? -1 : 1); };
  return Array.from({ length: 3 }, (_, r) => Array.from({ length: 3 }, (_, c) => mod(cof(c, r) * di, 26)));
}
function hill(t, key, n, dec) {
  let m = hillMatrix(key, n);
  if (dec) m = inv26(m); else inv26(m); // check invertible on encrypt too
  let txt = letters(t); while (txt.length % n) txt += 'X';
  let out = '';
  for (let i = 0; i < txt.length; i += n) {
    const v = [...txt.slice(i, i + n)].map((c) => c.charCodeAt(0) - 65);
    for (let r = 0; r < n; r++) out += AZ[mod(m[r].reduce((a, x, j) => a + x * v[j], 0), 26)];
  }
  return out;
}

// ---------- Enigma (M3 / I) ----------
const ROTORS = {
  I: ['EKMFLGDQVZNTOWYHXUSPAIBRCJ', 'Q'], II: ['AJDKSIRUXBLHWTMCQGZNPYFVOE', 'E'], III: ['BDFHJLCPRTXVZNYEIWGAKMUSQO', 'V'],
  IV: ['ESOVPZJAYQUIRHXLNFTGKDCMWB', 'J'], V: ['VZBRGITYUPSDNHLXAWMJQOFECK', 'Z'],
};
const REFLECTORS = { B: 'YRUHQSLDPXNGOKMIEBFZCWVJAT', C: 'FVPJIAOYEDRZXWGCTKUQSBNMHL' };
function enigma(t, p) {
  const names = [p.r1, p.r2, p.r3], rs = names.map((n) => ROTORS[n]);
  need(new Set(names).size === 3, 'use three different rotors');
  const ring = letters(p.rings).padEnd(3, 'A').slice(0, 3).split('').map((c) => c.charCodeAt(0) - 65);
  const posn = letters(p.pos).padEnd(3, 'A').slice(0, 3).split('').map((c) => c.charCodeAt(0) - 65);
  const plug = {};
  for (const pair of String(p.plug).toUpperCase().split(/[\s,]+/).filter(Boolean)) {
    need(/^[A-Z]{2}$/.test(pair) && !plug[pair[0]] && !plug[pair[1]], `bad plugboard pair "${pair}"`);
    plug[pair[0]] = pair[1]; plug[pair[1]] = pair[0];
  }
  const refl = REFLECTORS[p.refl];
  const fwd = (r, c, i) => { const sh = posn[i] - ring[i]; return mod(rs[i][0].charCodeAt(mod(c + sh, 26)) - 65 - sh, 26); };
  const back = (r, c, i) => { const sh = posn[i] - ring[i]; return mod(rs[i][0].indexOf(AZ[mod(c + sh, 26)]) - sh, 26); };
  let out = '';
  for (const ch of t.toUpperCase()) {
    if (ch < 'A' || ch > 'Z') { if (p.keepOther) out += ch; continue; }
    // stepping, with the double step of the middle rotor
    const notch = (i) => AZ[posn[i]] === rs[i][1];
    if (notch(1)) { posn[1] = (posn[1] + 1) % 26; posn[0] = (posn[0] + 1) % 26; }
    else if (notch(2)) posn[1] = (posn[1] + 1) % 26;
    posn[2] = (posn[2] + 1) % 26;
    let c = (plug[ch] || ch).charCodeAt(0) - 65;
    for (const i of [2, 1, 0]) c = fwd(rs[i], c, i);
    c = refl.charCodeAt(c) - 65;
    for (const i of [0, 1, 2]) c = back(rs[i], c, i);
    const o = AZ[c];
    out += plug[o] || o;
  }
  return out;
}

// ---------- Morse-based ----------
const morseX = (t) => String(t).toUpperCase().trim().split(/\s+/).map((w) => [...w].map((c) => MORSE[c]).filter(Boolean).join('x')).join('xx');
const fromMorseX = (m) => m.split('xx').map((w) => w.split('x').map((c) => MORSE_REV[c] ?? '').join('')).join(' ');
function fracMorse(t, key, dec) {
  const alpha = keyedAlphabet(key), tri = [];
  for (const a of '.-x') for (const b of '.-x') for (const c of '.-x') if (a + b + c !== 'xxx') tri.push(a + b + c);
  if (!dec) { let m = morseX(t) + 'x'; while (m.length % 3) m += 'x'; return m.match(/.../g).map((x) => alpha[tri.indexOf(x)]).join(''); }
  return fromMorseX([...letters(t)].map((c) => tri[alpha.indexOf(c)]).join('').replace(/x+$/, ''));
}
const MORBIT_PAIRS = ['..', '.-', '.x', '-.', '--', '-x', 'x.', 'x-', 'xx'];
function morbit(t, key, dec) {
  const k = letters(key);
  need(k.length >= 9, 'the key needs 9 letters');
  const digits = keyOrder(k.slice(0, 9)).map((r) => r + 1); // pair i ↔ digit digits[i]
  if (!dec) { let m = morseX(t) + 'x'; if (m.length % 2) m += 'x'; return m.match(/../g).map((p) => digits[MORBIT_PAIRS.indexOf(p)]).join(''); }
  return fromMorseX(String(t).replace(/\D/g, '').split('').map((d) => MORBIT_PAIRS[digits.indexOf(+d)]).join('').replace(/x+$/, ''));
}
function pollux(t, p, dec) {
  const sets = { '.': [...String(p.dots).replace(/\D/g, '')], '-': [...String(p.dashes).replace(/\D/g, '')], x: [...String(p.seps).replace(/\D/g, '')] };
  need(sets['.'].length && sets['-'].length && sets.x.length, 'give digits for dots, dashes and separators');
  need(new Set([...sets['.'], ...sets['-'], ...sets.x]).size === sets['.'].length + sets['-'].length + sets.x.length, 'each digit may only be used once');
  if (!dec) { const r = rng(t + p.dots); return [...morseX(t)].map((s) => sets[s][Math.floor(r() * sets[s].length)]).join(''); }
  const inv = {}; for (const [s, ds] of Object.entries(sets)) for (const d of ds) inv[d] = s;
  return fromMorseX(String(t).replace(/\D/g, '').split('').map((d) => inv[d] ?? '').join(''));
}

// ---------- others ----------
function homophonic(t, seed, dec) {
  const r = rng(seed || 'key'), nums = Array.from({ length: 100 }, (_, i) => String(i).padStart(2, '0'));
  for (let i = nums.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [nums[i], nums[j]] = [nums[j], nums[i]]; }
  const share = [8, 2, 3, 4, 12, 2, 2, 6, 6, 1, 1, 4, 2, 6, 7, 2, 1, 6, 6, 9, 3, 1, 2, 1, 2, 1]; // = 100
  const table = {}; let p = 0;
  AZ.split('').forEach((c, i) => { table[c] = nums.slice(p, p + share[i]); p += share[i]; });
  if (!dec) { const pick = rng(t); return [...letters(t)].map((c) => table[c][Math.floor(pick() * table[c].length)]).join(' '); }
  const inv = {}; for (const [c, l] of Object.entries(table)) for (const x of l) inv[x] = c;
  return (String(t).replace(/\D/g, '').match(/../g) || []).map((x) => inv[x] ?? '?').join('');
}
function checkerboard(t, key, b1, b2, dec) {
  need(b1 !== b2, 'the two blank columns must differ');
  const seq = keyedAlphabet(key) + './', grid = {};
  let k = 0;
  for (let c = 0; c < 10; c++) if (c !== b1 && c !== b2) grid[seq[k++]] = String(c);
  for (const row of [b1, b2]) for (let c = 0; c < 10; c++) grid[seq[k++]] = `${row}${c}`;
  if (!dec) return [...String(t).toUpperCase()].map((c) => (grid[c] ?? (/\d/.test(c) ? grid['/'] + c : c === ' ' ? '' : grid['.']))).join('');
  const inv = Object.fromEntries(Object.entries(grid).map(([a, b]) => [b, a]));
  const d = String(t).replace(/\D/g, ''); let out = '';
  for (let i = 0; i < d.length;) {
    let code = d[i];
    if (+code === b1 || +code === b2) { code = d.slice(i, i + 2); i += 2; } else i++;
    const ch = inv[code];
    if (ch === '/') { out += d[i] ?? ''; i++; } else out += ch === '.' ? '.' : ch ?? '?';
  }
  return out;
}
function bookCipher(t, book, dec) {
  const words = String(book).split(/\s+/).filter(Boolean).map((w) => w.replace(/^[^A-Za-z]+/, ''));
  need(words.length > 10, 'paste a book / key text (more than a few words)');
  if (dec) return String(t).split(/[\s,]+/).filter(Boolean).map((n) => (words[+n - 1]?.[0] || '?').toUpperCase()).join('');
  const byLetter = {};
  words.forEach((w, i) => { const c = w[0]?.toUpperCase(); if (c) (byLetter[c] ||= []).push(i + 1); });
  const used = {};
  return [...letters(t)].map((c) => { const l = byLetter[c]; need(l, `no word in the book starts with ${c}`); const k = (used[c] = (used[c] ?? -1) + 1); return l[k % l.length]; }).join(' ');
}
const QWERTY = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
const qwerty = (t, n) => [...t].map((ch) => { const up = ch.toUpperCase(); const row = QWERTY.find((r) => r.includes(up)); if (!row) return ch; const o = row[mod(row.indexOf(up) + n, row.length)]; return ch === up ? o : o.toLowerCase(); }).join('');
function porta(t, key) {
  const k = keyShifts(key);
  return mapLetters(t, (p, j) => { const s = Math.floor(k[j % k.length] / 2); return p < 13 ? mod(p + s, 13) + 13 : mod(p - 13 - s, 13); });
}
function alberti(t, p, dec) {
  const inner = keyedAlphabet(p.key), outer = AZ, per = Math.max(1, +p.period || 1), step = +p.step || 1;
  let shift = AZ.indexOf((letters(p.index) || 'A')[0]), j = 0;
  return [...t].map((ch) => {
    const up = ch.toUpperCase(); if (up < 'A' || up > 'Z') return ch;
    const s = shift + Math.floor(j++ / per) * step;
    const o = dec ? outer[mod(inner.indexOf(up) - s, 26)] : inner[mod(outer.indexOf(up) + s, 26)];
    return ch === up ? o : o.toLowerCase();
  }).join('');
}
function nicodemus(t, key, dec) {
  const k = letters(key), n = k.length, order = keyOrder(k), sh = keyShifts(k);
  need(n > 1, 'enter a key');
  const txt = letters(t);
  if (!dec) {
    const out = [];
    for (let b = 0; b < txt.length; b += 5 * n) {
      const blk = txt.slice(b, b + 5 * n), cols = Array.from({ length: n }, () => '');
      [...blk].forEach((c, i) => { cols[i % n] += AZ[mod(c.charCodeAt(0) - 65 + sh[i % n], 26)]; });
      out.push(order.map((r, i) => [r, cols[i]]).sort((a, b2) => a[0] - b2[0]).map((x) => x[1]).join(''));
    }
    return out.join('');
  }
  let out = '';
  for (let b = 0; b < txt.length; b += 5 * n) {
    const blk = txt.slice(b, b + 5 * n);
    const plainCols = columnarDec(blk, k);
    out += [...plainCols].map((c, i) => AZ[mod(c.charCodeAt(0) - 65 - sh[i % n], 26)]).join('');
  }
  return out;
}
const NULL_WORDS = 'able about above across after again against air all almost along also always among animal answer any apple area army around art ask away back bad ball band bank base bear beat bed before begin behind bell best better big bird black blue boat body bone book born both box boy bread bring brother brown build burn busy but buy call came camp can car care carry case cat cause cell center change check child city class clean clear close cloud coast cold color come common copy corn cost could count cover cross crowd cry cut dark day dead deal deep did dog door down draw dream dress drink drive drop dry duck during dust each early earth east easy eat edge egg eight else end enough even ever every eye face fact fair fall family far farm fast father fear feel few field fight fill final find fine fire first fish five flat floor flow fly follow food foot for force form four free fresh friend from front fruit full fun game garden gas gave get gift girl give glad glass go gold good got grass gray great green ground group grow guess guide had hair half hall hand happy hard hat have head hear heart heat heavy help her here high hill him his hold hole home hope horse hot hour house how huge hunt ice idea inch iron island its job join joy jump just keep key kick kind king kitchen knee knew know lake land large last late laugh law lay lead learn leave left leg less let letter level lie life lift light like line lion list little live long look lost lot loud love low lucky made main make man many map mark market may meat meet men metal middle might mile milk mind miss modern money month moon more most mother move much music must name near neck need never new next nice night nine noise north nose note now number ocean odd off office often oil old once one only open orange order other our out over own page paint pair paper park part party pass past path pay peace pen people pick piece pink place plain plan plant play please poor port post pull push put queen question quick quiet quite race rain raise ran rather reach read ready real red rest rich ride right ring river road rock roll roof room root rope rose round row rule run safe said sail salt same sand save saw say school sea seat second see seed sell send seven shape sharp she ship shoe shop short should show side sign silver simple sing sister sit six size skin sky sleep slow small smell smile snow soft soil some son song soon sound south space speak speed spend spring square stand star start stay step stick still stone stop store storm story street strong such sugar summer sun sure swim table tail take talk tall teach team tell ten test than that their them then there these they thick thin thing think three through tie time tiny today told tone too took top touch town track trade train tree trip true try turn two under until upon use usual valley very view village visit voice vote wait walk wall want warm wash watch water wave way wear week well went were west wet what wheel when where which while white who whole why wide wild will win wind window wing winter wire wise wish with woman wonder wood word work world write wrong yard year yellow yes yet you young your zero zone'.split(' ');
function nullCipher(t, n, dec) {
  const i = Math.max(1, +n || 1) - 1;
  if (dec) return String(t).split(/\s+/).filter(Boolean).map((w) => w.replace(/[^A-Za-z]/g, '')[i] || '').join('').toUpperCase();
  const r = rng(t);
  return [...letters(t)].map((c) => { const pool = NULL_WORDS.filter((w) => w[i]?.toUpperCase() === c); need(pool.length, `no cover word with ${c} in position ${i + 1}`); return pool[Math.floor(r() * pool.length)]; }).join(' ');
}
function vernam(t, key, kind, dec) {
  if (kind === 'letters') {
    const k = keyShifts(key); need(k.length >= letters(t).length, 'a one-time pad key must be at least as long as the message');
    return mapLetters(t, (i, j) => i + (dec ? -1 : 1) * k[j]);
  }
  const kb = new TextEncoder().encode(key);
  if (!dec) { const tb = new TextEncoder().encode(t); need(kb.length >= tb.length, 'a one-time pad key must be at least as long as the message (bytes)'); return [...tb].map((b, i) => (b ^ kb[i]).toString(16).padStart(2, '0')).join(''); }
  const h = String(t).replace(/[^0-9a-f]/gi, ''); need(h.length % 2 === 0, 'expected hex'); const bytes = h.match(/../g).map((x) => parseInt(x, 16));
  need(kb.length >= bytes.length, 'the key is shorter than the message');
  return new TextDecoder().decode(Uint8Array.from(bytes, (b, i) => b ^ kb[i]));
}

const caesarCrack = (t) => ({ head: ['shift', 'χ²', 'text'], rows: Array.from({ length: 26 }, (_, s) => [s, chi2(caesar(t, -s)), caesar(t, -s)]).sort((a, b) => a[1] - b[1]).map(([s, c, x]) => [s, c.toFixed(1), x.slice(0, 120)]) });
const R = (id, label, def) => S(id, label, [['I', 'I'], ['II', 'II'], ['III', 'III'], ['IV', 'IV'], ['V', 'V']], def);

export const CLASSICAL = [
  { id: 'caesar', name: 'Caesar / ROT-N', desc: 'Shift every letter by N places. ROT13 is N = 13. "crack" tries all 26 shifts.', params: [N('shift', 'shift', 3, -25, 25)], enc: (t, p) => caesar(t, +p.shift), dec: (t, p) => caesar(t, -p.shift), crack: caesarCrack, sample: 'Attack at dawn!' },
  { id: 'atbash', name: 'Atbash', desc: 'Reverse the alphabet: A↔Z, B↔Y… Encrypting and decrypting are the same.', params: [], enc: (t) => mapLetters(t, (i) => 25 - i), dec: (t) => mapLetters(t, (i) => 25 - i), sample: 'Wizard of Oz' },
  { id: 'vigenere', name: 'Vigenère', desc: 'Each letter is shifted by the matching letter of a repeating key.', params: [T('key', 'key', 'LEMON')], enc: (t, p) => vig(t, p.key, 1), dec: (t, p) => vig(t, p.key, -1), sample: 'Attack at dawn' },
  { id: 'affine', name: 'Affine', desc: 'E(x) = a·x + b mod 26. a must be coprime with 26 (1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25).', params: [N('a', 'a', 5, 1, 25), N('b', 'b', 8, 0, 25)],
    enc: (t, p) => { need([1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25].includes(+p.a), 'a must be coprime with 26'); return mapLetters(t, (i) => +p.a * i + +p.b); },
    dec: (t, p) => { let ai = 0; for (let x = 1; x < 26; x++) if ((+p.a * x) % 26 === 1) ai = x; need(ai, 'a must be coprime with 26'); return mapLetters(t, (i) => ai * (i - +p.b)); }, sample: 'Affine cipher' },
  { id: 'rail-fence', name: 'Rail Fence', desc: 'Write the text in a zigzag over N rails, then read rail by rail.', params: [N('rails', 'rails', 3, 2, 50), N('offset', 'offset', 0, 0, 98), C('spaces', 'keep spaces')],
    enc: (t, p) => railEnc(p.spaces ? t : noSpace(t), +p.rails, +p.offset), dec: (t, p) => railDec(p.spaces ? t : noSpace(t), +p.rails, +p.offset), sample: 'WE ARE DISCOVERED FLEE AT ONCE' },
  { id: 'substitution', name: 'Substitution', desc: 'Every letter is replaced by the letter at the same place in a 26-letter key alphabet.', params: [T('key', 'key alphabet (26 letters)', 'QWERTYUIOPASDFGHJKLZXCVBNM')],
    enc: (t, p) => { const k = letters(p.key); need(k.length === 26 && new Set(k).size === 26, 'the key must contain each letter once'); return subst(t, AZ, k); },
    dec: (t, p) => { const k = letters(p.key); need(k.length === 26 && new Set(k).size === 26, 'the key must contain each letter once'); return subst(t, k, AZ); }, sample: 'Flee at once' },
  { id: 'baconian', name: 'Baconian', desc: 'Each letter becomes 5 symbols of A/B. The 24-letter version merges I/J and U/V.', params: [S('v', 'alphabet', [['26', '26 letters'], ['24', '24 letters (I=J, U=V)']]), T('a', 'symbol A', 'A', { short: true }), T('b', 'symbol B', 'B', { short: true })],
    enc: (t, p) => { const al = p.v === '24' ? 'ABCDEFGHIKLMNOPQRSTUWXYZ' : AZ; return [...letters(t)].map((c) => { if (p.v === '24') c = c === 'J' ? 'I' : c === 'V' ? 'U' : c; return al.indexOf(c).toString(2).padStart(5, '0').replace(/0/g, p.a || 'A').replace(/1/g, p.b || 'B'); }).join(' '); },
    dec: (t, p) => { const al = p.v === '24' ? 'ABCDEFGHIKLMNOPQRSTUWXYZ' : AZ, a = p.a || 'A', b = p.b || 'B'; const bits = [...String(t)].map((c) => (c === a || c.toUpperCase() === a.toUpperCase() ? '0' : c === b || c.toUpperCase() === b.toUpperCase() ? '1' : '')).join(''); return (bits.match(/.{5}/g) || []).map((x) => al[parseInt(x, 2)] ?? '?').join(''); }, sample: 'Bacon' },
  { id: 'polybius', name: 'Polybius Square', desc: 'Each letter becomes its row and column in a 5×5 square (I = J), optionally keyed.', params: [T('key', 'key (optional)', '')], enc: (t, p) => polyEnc(t, p.key, 5), dec: (t, p) => polyDec(t, p.key, 5), sample: 'Polybius' },
  { id: 'playfair', name: 'Playfair', desc: 'Digraph cipher on a keyed 5×5 square (I = J). Doubled letters are split with X.', params: [T('key', 'key', 'PLAYFAIR EXAMPLE')], enc: (t, p) => groups(playfair(t, p.key, 5, false), 2), dec: (t, p) => playfair(t, p.key, 5, true), sample: 'Hide the gold in the tree stump' },
  { id: 'bifid', name: 'Bifid', desc: 'Polybius coordinates are split, mixed by period and recombined (Delastelle).', params: [T('key', 'key', 'BGWKZQPNDSIOAXEFCLUMTHYVR'), N('period', 'period (0 = whole text)', 5, 0, 100)], enc: (t, p) => bifid(t, p.key, +p.period, 5, false), dec: (t, p) => bifid(t, p.key, +p.period, 5, true), sample: 'Flee at once' },
  { id: 'beaufort', name: 'Beaufort', desc: 'C = key − plaintext. Reciprocal: the same operation decrypts.', params: [T('key', 'key', 'FORTIFICATION')], enc: (t, p) => beaufort(t, p.key), dec: (t, p) => beaufort(t, p.key), sample: 'Defend the east wall of the castle' },
  { id: 'autokey', name: 'Autokey', desc: 'Vigenère whose key is a primer followed by the plaintext itself.', params: [T('key', 'primer', 'QUEENLY')], enc: (t, p) => autokey(t, p.key, false), dec: (t, p) => autokey(t, p.key, true), sample: 'Attack at dawn' },
  { id: 'columnar', name: 'Columnar Transposition', desc: 'Write the text in rows under the key, read the columns in alphabetical key order.', params: [T('key', 'key', 'ZEBRAS'), T('pad', 'pad character (optional)', '', { short: true })],
    enc: (t, p) => columnarEnc(noSpace(t), letters(p.key) || 'A', p.pad?.[0] || ''), dec: (t, p) => columnarDec(noSpace(t), letters(p.key) || 'A'), sample: 'WE ARE DISCOVERED FLEE AT ONCE' },
  { id: 'scytale', name: 'Scytale', desc: 'A strip wound around a rod with N faces: rows of the rod become the ciphertext columns.', params: [N('d', 'faces (rows)', 4, 2, 50)],
    enc: (t, p) => { const s = noSpace(t); const cols = Math.ceil(s.length / +p.d); return columnarEnc(s, AZ.slice(0, cols)); }, dec: (t, p) => { const s = noSpace(t); const cols = Math.ceil(s.length / +p.d); return columnarDec(s, AZ.slice(0, cols)); }, sample: 'I am hurt very badly help' },
  { id: 'adfgvx', name: 'ADFGVX', desc: 'German WW1 cipher: 6×6 Polybius square labelled ADFGVX, then a columnar transposition.', params: [T('sq', 'square key', 'PH0QG64MEA1YL2NOFDXKR3CVS5ZW7BJ9UTI8'), T('key', 'transposition key', 'PRIVACY')], enc: (t, p) => adfgvx(t, p.sq, p.key, 6, false), dec: (t, p) => adfgvx(t, p.sq, p.key, 6, true), sample: 'Attack at 1200AM' },
  { id: 'hill', name: 'Hill Cipher', desc: 'Blocks of letters multiplied by a key matrix mod 26. The key: 4 / 9 letters or numbers.', params: [S('n', 'size', [['2', '2×2'], ['3', '3×3']]), T('key', 'key matrix', 'HILL')], enc: (t, p) => hill(t, p.key, +p.n, false), dec: (t, p) => hill(t, p.key, +p.n, true), sample: 'Short example' },
  { id: 'trithemius', name: 'Trithemius', desc: 'Progressive shift: the 1st letter moves by 0, the 2nd by 1, and so on.', params: [N('start', 'start shift', 0, 0, 25)], enc: (t, p) => mapLetters(t, (i, j) => i + +p.start + j), dec: (t, p) => mapLetters(t, (i, j) => i - +p.start - j), sample: 'Trithemius' },
  { id: 'four-square', name: 'Four-Square', desc: 'Digraphs through four 5×5 squares: two plain, two keyed.', params: [T('k1', 'key 1', 'EXAMPLE'), T('k2', 'key 2', 'KEYWORD')], enc: (t, p) => groups(quadSquares(t, p.k1, p.k2, false, true), 2), dec: (t, p) => quadSquares(t, p.k1, p.k2, true, true), sample: 'Help me Obi Wan Kenobi' },
  { id: 'nihilist', name: 'Nihilist', desc: 'Polybius numbers of the text plus those of a repeating key word (Russian nihilists, 1880s).', params: [T('sq', 'square key', 'ZEBRAS'), T('key', 'key word', 'RUSSIAN')], enc: (t, p) => nihilist(t, p.sq, p.key, 5, false), dec: (t, p) => nihilist(t, p.sq, p.key, 5, true), sample: 'Dynamite winter palace' },
  { id: 'tap-code', name: 'Tap Code', desc: 'Prison code: row taps, pause, column taps, on a 5×5 grid where K = C.', params: [],
    enc: (t) => { const s = 'ABCDEFGHIJLMNOPQRSTUVWXYZ'; return [...letters(t).replace(/K/g, 'C')].map((c) => { const i = s.indexOf(c); return `${'.'.repeat(Math.floor(i / 5) + 1)} ${'.'.repeat((i % 5) + 1)}`; }).join(' / '); },
    dec: (t) => { const s = 'ABCDEFGHIJLMNOPQRSTUVWXYZ'; return String(t).split('/').map((g) => { const [r, c] = g.trim().split(/\s+/).map((x) => x.length); return s[(r - 1) * 5 + c - 1] ?? '?'; }).join(''); }, sample: 'Water' },
  { id: 'enigma', name: 'Enigma', desc: 'Enigma I / M3: three rotors with double stepping, reflector, ring settings and plugboard. Reciprocal.', params: [R('r1', 'left rotor', 'I'), R('r2', 'middle rotor', 'II'), R('r3', 'right rotor', 'III'), S('refl', 'reflector', [['B', 'UKW-B'], ['C', 'UKW-C']]), T('rings', 'ring settings', 'AAA', { short: true }), T('pos', 'start positions', 'AAA', { short: true }), T('plug', 'plugboard pairs', 'BQ CR DI EJ KW MT OS PX UZ GH'), C('keepOther', 'keep spaces & punctuation', true)],
    enc: (t, p) => enigma(t, p), dec: (t, p) => enigma(t, p), sample: 'Weather report clear skies' },
  { id: 'vernam', name: 'Vernam / OTP', desc: 'One-time pad: the key is as long as the message. Letters mod 26, or bytes XOR (hex output).', params: [S('kind', 'mode', [['letters', 'letters (mod 26)'], ['xor', 'bytes XOR → hex']]), T('key', 'key', 'XMCKLQZPWEDRTYUIOPASDF')], enc: (t, p) => vernam(t, p.key, p.kind, false), dec: (t, p) => vernam(t, p.key, p.kind, true), sample: 'Hello world' },
  { id: 'homophonic', name: 'Homophonic Substitution', desc: 'Frequent letters get several two-digit codes (00–99), flattening the frequencies. The table is built from the seed.', params: [T('seed', 'table seed', 'wemy')], enc: (t, p) => homophonic(t, p.seed, false), dec: (t, p) => homophonic(t, p.seed, true), sample: 'Meet me at the station' },
  { id: 'checkerboard', name: 'Straddling Checkerboard', desc: 'Letters become one or two digits; the two blank columns of the top row label the other rows. "/" escapes digits.', params: [T('key', 'key', 'FKMCPDYEHBIGQROSAZLUTJNWVX'), N('b1', 'blank column 1', 2, 0, 9), N('b2', 'blank column 2', 6, 0, 9)], enc: (t, p) => checkerboard(t, p.key, +p.b1, +p.b2, false), dec: (t, p) => checkerboard(t, p.key, +p.b1, +p.b2, true), sample: 'Attack at dawn' },
  { id: 'book', name: 'Book Cipher', desc: 'Each letter becomes the number of a word of the book starting with that letter. Paste the book text.', params: [A('book', 'book / key text', 'In the beginning God created the heaven and the earth. And the earth was without form, and void; and darkness was upon the face of the deep. And the Spirit of God moved upon the face of the waters. And God said, Let there be light: and there was light. And God saw the light, that it was good: and God divided the light from the darkness. Every man, young or old, keeps hope near; quiet rivers run under sunlit valleys while zealous explorers journey.')],
    enc: (t, p) => bookCipher(t, p.book, false), dec: (t, p) => bookCipher(t, p.book, true), sample: 'Meet at dawn' },
  { id: 'porta', name: 'Porta', desc: 'Reciprocal polyalphabetic cipher with 13 alphabets (della Porta, 1563).', params: [T('key', 'key', 'FORTIFICATION')], enc: (t, p) => porta(t, p.key), dec: (t, p) => porta(t, p.key), sample: 'Defend the east wall' },
  { id: 'caesar-box', name: 'Caesar Box', desc: 'Write the text in a square row by row, read it column by column.', params: [],
    enc: (t) => { const s = noSpace(t), n = Math.ceil(Math.sqrt(s.length)); return columnarEnc(s, AZ.slice(0, n)); }, dec: (t) => { const s = noSpace(t), n = Math.ceil(Math.sqrt(s.length)); return columnarDec(s, AZ.slice(0, n)); }, sample: 'Caesar box cipher' },
  { id: 'keyword', name: 'Keyword Cipher', desc: 'Substitution with an alphabet that starts with a keyword (duplicates removed).', params: [T('key', 'keyword', 'KRYPTOS')], enc: (t, p) => subst(t, AZ, keyedAlphabet(p.key)), dec: (t, p) => subst(t, keyedAlphabet(p.key), AZ), sample: 'Knowledge is power' },
  { id: 'trifid', name: 'Trifid', desc: 'Delastelle\'s 3×3×3 cube (A–Z and +), split and recombined by period.', params: [T('key', 'key', 'FELIX MARIE DELASTELLE'), N('period', 'period (0 = whole text)', 5, 0, 100)], enc: (t, p) => trifid(t, p.key, +p.period, false), dec: (t, p) => trifid(t, p.key, +p.period, true), sample: 'Aide toi le ciel t aidera' },
  { id: 'fractionated-morse', name: 'Fractionated Morse', desc: 'Morse (x = separator) cut into triplets, each mapped to a letter of a keyed alphabet.', params: [T('key', 'key', 'ROUNDTABLE')], enc: (t, p) => fracMorse(t, p.key, false), dec: (t, p) => fracMorse(t, p.key, true), sample: 'Come at once' },
  { id: 'route', name: 'Route Cipher', desc: 'Fill a grid row by row, read it along a clockwise spiral from the top-left corner.', params: [N('cols', 'columns', 6, 2, 50)], enc: (t, p) => route(t, +p.cols, false), dec: (t, p) => route(t, +p.cols, true), sample: 'WE ARE DISCOVERED FLEE AT ONCE' },
  { id: 'two-square', name: 'Two-Square', desc: 'Digraphs through two keyed 5×5 squares side by side (horizontal two-square).', params: [T('k1', 'left key', 'EXAMPLE'), T('k2', 'right key', 'KEYWORD')], enc: (t, p) => groups(quadSquares(t, p.k1, p.k2, false, false), 2), dec: (t, p) => quadSquares(t, p.k1, p.k2, true, false), sample: 'Help me Obi Wan Kenobi' },
  { id: 'gronsfeld', name: 'Gronsfeld', desc: 'Vigenère with a numeric key: each digit is the shift.', params: [T('key', 'numeric key', '31415')],
    enc: (t, p) => { const k = String(p.key).replace(/\D/g, ''); need(k, 'enter digits'); return mapLetters(t, (i, j) => i + +k[j % k.length]); }, dec: (t, p) => { const k = String(p.key).replace(/\D/g, ''); need(k, 'enter digits'); return mapLetters(t, (i, j) => i - +k[j % k.length]); }, sample: 'Gronsfeld' },
  { id: 'morbit', name: 'Morbit', desc: 'Morse (x = separator) in pairs, each pair replaced by a digit from a 9-letter key.', params: [T('key', 'key (9 letters)', 'WISECRACK')], enc: (t, p) => morbit(t, p.key, false), dec: (t, p) => morbit(t, p.key, true), sample: 'Once upon a time' },
  { id: 'variant-beaufort', name: 'Variant Beaufort', desc: 'C = plaintext − key (Vigenère decryption used to encrypt).', params: [T('key', 'key', 'FORTIFICATION')], enc: (t, p) => vig(t, p.key, -1), dec: (t, p) => vig(t, p.key, 1), sample: 'Defend the east wall' },
  { id: 'polybius-6', name: 'Polybius Square (6×6)', desc: '6×6 square with A–Z and 0–9, optionally keyed.', params: [T('key', 'key (optional)', '')], enc: (t, p) => polyEnc(t, p.key, 6), dec: (t, p) => polyDec(t, p.key, 6), sample: 'Agent 007' },
  { id: 'amsco', name: 'AMSCO', desc: 'Columnar transposition where cells alternately hold one and two letters.', params: [T('key', 'key', '41325'), C('two', 'start with two letters')], enc: (t, p) => amsco(t, p.key.replace(/\d/g, (d) => AZ[+d]), false, p.two), dec: (t, p) => amsco(t, p.key.replace(/\d/g, (d) => AZ[+d]), true, p.two), sample: 'Incomplete columnar with alternating single letters and digraphs' },
  { id: 'myszkowski', name: 'Myszkowski', desc: 'Columnar transposition where repeated key letters are read together, row by row.', params: [T('key', 'key (with repeated letters)', 'TOMATO')], enc: (t, p) => myszkowski(t, p.key, false), dec: (t, p) => myszkowski(t, p.key, true), sample: 'WE ARE DISCOVERED FLEE AT ONCE' },
  { id: 'alberti', name: 'Alberti Cipher', desc: 'Cipher disk: a keyed inner ring turns by `step` every `period` letters, starting at the index letter.', params: [T('key', 'inner disk key', 'ALBERTI'), T('index', 'index letter', 'G', { short: true }), N('period', 'turn every N letters', 4, 1, 100), N('step', 'turn by', 1, 1, 25)], enc: (t, p) => alberti(t, p, false), dec: (t, p) => alberti(t, p, true), sample: 'La lettera segreta' },
  { id: 'keyed-rail-fence', name: 'Keyed Rail Fence', desc: 'Rail fence where the rails are read in the order of a key.', params: [T('key', 'key (one letter per rail)', 'CAB')],
    enc: (t, p) => { const k = letters(p.key); need(k.length > 1, 'key: one letter per rail'); const ord = keyOrder(k), o = [...Array(k.length).keys()].sort((a, b) => ord[a] - ord[b]); return railEnc(noSpace(t), k.length, 0, o); },
    dec: (t, p) => { const k = letters(p.key); need(k.length > 1, 'key: one letter per rail'); const ord = keyOrder(k), o = [...Array(k.length).keys()].sort((a, b) => ord[a] - ord[b]); return railDec(noSpace(t), k.length, 0, o); }, sample: 'Keyed rail fence cipher' },
  { id: 'bifid-6', name: 'Bifid (6×6)', desc: 'Bifid on a 6×6 square (letters and digits).', params: [T('key', 'key', 'ENCRYPT'), N('period', 'period (0 = whole text)', 5, 0, 100)], enc: (t, p) => bifid(t, p.key, +p.period, 6, false), dec: (t, p) => bifid(t, p.key, +p.period, 6, true), sample: 'Meet at 10pm' },
  { id: 'adfgx', name: 'ADFGX', desc: 'The first version of ADFGVX: 5×5 square (I = J), labels ADFGX, then columnar transposition.', params: [T('sq', 'square key', 'BTALPDHOZKQFVSNGICUXMREWY'), T('key', 'transposition key', 'CARGO')], enc: (t, p) => adfgvx(t, p.sq, p.key, 5, false), dec: (t, p) => adfgvx(t, p.sq, p.key, 5, true), sample: 'Attack at once' },
  { id: 'playfair-6', name: 'Playfair (6×6)', desc: 'Playfair on a 6×6 square with digits; no I/J merge.', params: [T('key', 'key', 'PLAYFAIR 2026')], enc: (t, p) => groups(playfair(t, p.key, 6, false), 2), dec: (t, p) => playfair(t, p.key, 6, true), sample: 'Meet at 9 at gate 4' },
  { id: 'beaufort-autokey', name: 'Beaufort Autokey', desc: 'Beaufort (key − plaintext) whose key continues with the plaintext.', params: [T('key', 'primer', 'KEY')], enc: (t, p) => autokey(t, p.key, false, true), dec: (t, p) => autokey(t, p.key, true, true), sample: 'Attack at dawn' },
  { id: 'pollux', name: 'Pollux', desc: 'Morse code where dots, dashes and separators are each written with digits from a set.', params: [T('dots', 'digits for dots', '147', { short: true }), T('dashes', 'digits for dashes', '258', { short: true }), T('seps', 'digits for separators', '3690', { short: true })], enc: (t, p) => pollux(t, p, false), dec: (t, p) => pollux(t, p, true), sample: 'Pollux' },
  { id: 'autoclave', name: 'Autoclave', desc: 'Ciphertext autokey: the key continues with the ciphertext (weaker than the plaintext autokey).', params: [T('key', 'primer', 'KEY')], enc: (t, p) => autokey(t, p.key, false, false, true), dec: (t, p) => autokey(t, p.key, true, false, true), sample: 'Attack at dawn' },
  { id: 'tap-code-keyed', name: 'Tap Code (Keyed)', desc: 'Tap code on a keyed 5×5 square (K = C).', params: [T('key', 'key', 'PRISON')],
    enc: (t, p) => { const s = keyedAlphabet(letters(p.key).replace(/K/g, 'C'), 'ABCDEFGHIJLMNOPQRSTUVWXYZ'); return [...letters(t).replace(/K/g, 'C')].map((c) => { const i = s.indexOf(c); return `${'.'.repeat(Math.floor(i / 5) + 1)} ${'.'.repeat((i % 5) + 1)}`; }).join(' / '); },
    dec: (t, p) => { const s = keyedAlphabet(letters(p.key).replace(/K/g, 'C'), 'ABCDEFGHIJLMNOPQRSTUVWXYZ'); return String(t).split('/').map((g) => { const [r, c] = g.trim().split(/\s+/).map((x) => x.length); return s[(r - 1) * 5 + c - 1] ?? '?'; }).join(''); }, sample: 'Escape' },
  { id: 'running-key', name: 'Running Key', desc: 'Vigenère with a key as long as the text, usually taken from a book.', params: [A('key', 'key text', 'The quick brown fox jumps over the lazy dog and keeps running far away')], enc: (t, p) => vig(t, p.key, 1), dec: (t, p) => vig(t, p.key, -1), sample: 'Flee at once we are discovered' },
  { id: 'qwerty-shift', name: 'QWERTY Shift', desc: 'Shift each letter along its keyboard row (wrapping around).', params: [N('shift', 'shift', 1, -9, 9)], enc: (t, p) => qwerty(t, +p.shift), dec: (t, p) => qwerty(t, -p.shift), sample: 'Hello world' },
  { id: 'nicodemus', name: 'Nicodemus Cipher', desc: 'Vigenère by columns under a key, then the columns are read in key order, in blocks of 5 rows.', params: [T('key', 'key', 'CAT')], enc: (t, p) => groups(nicodemus(t, p.key, false), 5), dec: (t, p) => nicodemus(t, p.key, true), sample: 'The quick brown fox jumps over the lazy dog' },
  { id: 'null-cipher', name: 'Null Cipher', desc: 'The message hides in the Nth letter of each word of an innocent text.', params: [N('n', 'letter position', 1, 1, 5)], enc: (t, p) => nullCipher(t, p.n, false), dec: (t, p) => nullCipher(t, p.n, true), sample: 'Help' },
  { id: 'double-columnar', name: 'Double Columnar Transposition', desc: 'Two columnar transpositions in a row, with two keys.', params: [T('k1', 'key 1', 'BALLOON'), T('k2', 'key 2', 'TEACUP')],
    enc: (t, p) => columnarEnc(columnarEnc(noSpace(t), letters(p.k1) || 'A'), letters(p.k2) || 'A'), dec: (t, p) => columnarDec(columnarDec(noSpace(t), letters(p.k2) || 'A'), letters(p.k1) || 'A'), sample: 'WE ARE DISCOVERED FLEE AT ONCE' },
  { id: 'nihilist-6', name: 'Nihilist (6×6)', desc: 'Nihilist on a 6×6 square with digits.', params: [T('sq', 'square key', 'ZEBRAS'), T('key', 'key word', 'RUSSIA1')], enc: (t, p) => nihilist(t, p.sq, p.key, 6, false), dec: (t, p) => nihilist(t, p.sq, p.key, 6, true), sample: 'Meet at 2200' },
];
