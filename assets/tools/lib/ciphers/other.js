// Analysis and other tools of the Cipher Suite (the ones not already covered by a dedicated page). Pure.
import { AZ, mod, letters, mapLetters, chi2, ioc, EN_FREQ, rng } from './util.js';
import { CORPUS } from './corpus.js';

const T = (id, label, def = '', extra = {}) => ({ id, label, type: 'text', def, ...extra });
const N = (id, label, def, min, max) => ({ id, label, type: 'number', def, min, max });
const S = (id, label, opts, def) => ({ id, label, type: 'select', opts, def: def ?? opts[0][0] });
const C = (id, label, def = false) => ({ id, label, type: 'check', def });
const A = (id, label, def = '') => ({ id, label, type: 'textarea', def });
const need = (c, m) => { if (!c) throw new Error(m); };
const te = new TextEncoder(), td = new TextDecoder();
const hexOf = (b) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
const unhex = (h) => { h = String(h).replace(/^0x/i, '').replace(/[^0-9a-f]/gi, ''); need(h.length % 2 === 0, 'odd number of hex digits'); return Uint8Array.from(h.match(/../g) || [], (x) => parseInt(x, 16)); };
const unb64 = (s) => { s = String(s).trim().replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, ''); s += '='.repeat((4 - (s.length % 4)) % 4); return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)); };
const pct = (n, t) => (t ? ((100 * n) / t).toFixed(2) : '0.00');
const bar = (v, max, w = 30) => '█'.repeat(Math.round((v / (max || 1)) * w));
const printable = (b) => [...b].map((x) => (x >= 32 && x < 127 ? String.fromCharCode(x) : x === 10 ? '⏎' : '·')).join('');

// ---------- English scoring (from the embedded corpus) ----------
let STATS = null;
function stats() {
  if (STATS) return STATS;
  const t = letters(CORPUS), tri = new Map(); let n = 0;
  for (let i = 0; i + 3 <= t.length; i++) { const g = t.slice(i, i + 3); tri.set(g, (tri.get(g) || 0) + 1); n++; }
  const floor = Math.log10(0.01 / n), logp = new Map();
  for (const [g, c] of tri) logp.set(g, Math.log10(c / n));
  STATS = { logp, floor };
  return STATS;
}
export function englishScore(s) { // higher = more English-like (trigram log-probability per trigram)
  const { logp, floor } = stats(), t = letters(s); let sc = 0, k = 0;
  for (let i = 0; i + 3 <= t.length; i++) { sc += logp.get(t.slice(i, i + 3)) ?? floor; k++; }
  return k ? sc / k : floor;
}
const BYTE_FREQ = (() => { const f = new Array(256).fill(0.01); for (let i = 0; i < 26; i++) { f[97 + i] = EN_FREQ[i]; f[65 + i] = EN_FREQ[i] / 10; } f[32] = 15; f[46] = 0.6; f[44] = 0.6; f[10] = 0.5; f[39] = 0.2; for (let i = 48; i < 58; i++) f[i] = 0.3; return f.map((x) => Math.log(x)); })();
const byteScore = (b) => { let s = 0; for (const x of b) s += x < 9 || (x > 13 && x < 32) || x > 126 ? -12 : BYTE_FREQ[x]; return s / Math.max(1, b.length); };

// ---------- crackers ----------
function vigShift(col) { let best = 0, bs = Infinity; for (let s = 0; s < 26; s++) { const x = chi2([...col].map((c) => AZ[mod(c.charCodeAt(0) - 65 - s, 26)]).join('')); if (x < bs) { bs = x; best = s; } } return best; }
function keyLengths(t, max = 20) {
  const out = [];
  for (let L = 1; L <= Math.min(max, Math.floor(t.length / 2)); L++) {
    let s = 0; for (let i = 0; i < L; i++) { let col = ''; for (let j = i; j < t.length; j += L) col += t[j]; s += ioc(col); }
    out.push([L, s / L]);
  }
  return out;
}
function vigCrack(text, maxLen) {
  const t = letters(text);
  need(t.length >= 20, 'paste more ciphertext (at least ~20 letters, ideally 100+)');
  const cand = keyLengths(t, maxLen).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const rows = cand.map(([L, ic]) => {
    let key = '';
    for (let i = 0; i < L; i++) { let col = ''; for (let j = i; j < t.length; j += L) col += t[j]; key += AZ[vigShift(col)]; }
    // a key made of a repeated shorter key: keep the short form
    for (let d = 1; d < L; d++) if (L % d === 0 && key === key.slice(0, d).repeat(L / d)) { key = key.slice(0, d); break; }
    const k = [...key].map((c) => c.charCodeAt(0) - 65), plain = mapLetters(text, (x, j) => x - k[j % k.length]);
    return [key, L, ic.toFixed(4), chi2(plain).toFixed(1), plain.slice(0, 160)];
  });
  const seen = new Set();
  return { head: ['key', 'length', 'avg IoC', 'χ²', 'plaintext'], rows: rows.filter((r) => !seen.has(r[0]) && seen.add(r[0])).sort((a, b) => a[3] - b[3]) };
}
function hamming(a, b) { let d = 0; for (let i = 0; i < Math.min(a.length, b.length); i++) { let x = a[i] ^ b[i]; while (x) { d += x & 1; x >>= 1; } } return d; }
function bestSingleByte(b) { let best = 0, bs = -Infinity; for (let k = 0; k < 256; k++) { const s = byteScore(b.map((x) => x ^ k)); if (s > bs) { bs = s; best = k; } } return [best, bs]; }
function readBytes(t, fmt) { return fmt === 'hex' ? unhex(t) : fmt === 'base64' ? unb64(t) : te.encode(t); }
function xorCrack(text, fmt, maxKey) {
  const b = [...readBytes(text, fmt)];
  need(b.length >= 4, 'paste more data');
  const sizes = [];
  for (let k = 1; k <= Math.min(maxKey, Math.floor(b.length / 2)); k++) {
    let d = 0, n = 0;
    for (let i = 0; i + 2 * k <= b.length && n < 12; i += k, n++) d += hamming(b.slice(i, i + k), b.slice(i + k, i + 2 * k)) / k;
    sizes.push([k, n ? d / n : 99]);
  }
  sizes.sort((a, c) => a[1] - c[1]);
  const rows = sizes.slice(0, 6).map(([k, dist]) => {
    const key = [];
    for (let i = 0; i < k; i++) key.push(bestSingleByte(b.filter((_, j) => j % k === i))[0]);
    for (let d = 1; d < k; d++) if (k % d === 0 && key.every((x, i) => x === key[i % d])) { key.length = d; break; } // WEMWEM → WEM
    const plain = Uint8Array.from(b, (x, j) => x ^ key[j % key.length]);
    return [hexOf(key), printable(Uint8Array.from(key)), key.length, dist.toFixed(2), byteScore(plain).toFixed(2), printable(plain.slice(0, 120))];
  }).sort((a, c) => c[4] - a[4] || a[2] - c[2]).filter((r, i, all) => all.findIndex((x) => x[0] === r[0]) === i);
  return { head: ['key (hex)', 'key', 'size', 'norm. Hamming', 'score', 'plaintext'], rows };
}
function monoSolve(text, iters, seed) {
  const t = letters(text);
  need(t.length >= 40, 'paste more ciphertext (100+ letters works best)');
  const r = rng(seed || 'solve'), decode = (key) => mapLetters(text, (i) => key.indexOf(AZ[i]));
  // start from frequency order
  const cnt = new Array(26).fill(0); for (const c of t) cnt[c.charCodeAt(0) - 65]++;
  const engOrder = [...AZ].sort((a, b) => EN_FREQ[b.charCodeAt(0) - 65] - EN_FREQ[a.charCodeAt(0) - 65]);
  const ciphOrder = [...AZ].sort((a, b) => cnt[b.charCodeAt(0) - 65] - cnt[a.charCodeAt(0) - 65]);
  // key[p] = cipher letter used for plaintext letter p
  let key = new Array(26); engOrder.forEach((p, i) => { key[p.charCodeAt(0) - 65] = ciphOrder[i]; }); key = key.join('');
  const score = (k) => englishScore(decode(k));
  let best = key, bestS = score(key);
  for (let restart = 0; restart < 6; restart++) {
    let cur = restart ? best : key, curS = score(cur), stale = 0;
    for (let it = 0; it < iters && stale < 1500; it++) {
      const a = Math.floor(r() * 26), b = Math.floor(r() * 26); if (a === b) continue;
      const k = [...cur]; [k[a], k[b]] = [k[b], k[a]]; const ks = k.join(''), s = score(ks);
      if (s > curS) { cur = ks; curS = s; stale = 0; } else stale++;
    }
    if (curS > bestS) { best = cur; bestS = curS; }
    // perturb for the next restart
    const k = [...best]; for (let i = 0; i < 3; i++) { const a = Math.floor(r() * 26), b = Math.floor(r() * 26); [k[a], k[b]] = [k[b], k[a]]; } key = k.join('');
  }
  const plainToCipher = best, cipherToPlain = [...AZ].map((c) => AZ[plainToCipher.indexOf(c)]).join('');
  return { text: decode(best), rows: [['plain', AZ], ['cipher', plainToCipher], ['cipher → plain key', cipherToPlain], ['score', bestS.toFixed(3)]], head: ['', ''] };
}
function kasiski(text, minLen = 3) {
  const t = letters(text), rep = new Map();
  for (let L = minLen; L <= 6; L++) for (let i = 0; i + L <= t.length; i++) { const g = t.slice(i, i + L); (rep.get(g) || rep.set(g, []).get(g)).push(i); }
  const rows = [], factors = new Array(21).fill(0);
  for (const [g, pos] of rep) {
    if (pos.length < 2) continue;
    const ds = pos.slice(1).map((p, i) => p - pos[i]);
    for (const d of ds) for (let f = 2; f <= 20; f++) if (d % f === 0) factors[f]++;
    rows.push([g, pos.length, pos.join(', '), ds.join(', ')]);
  }
  rows.sort((a, b) => b[0].length - a[0].length || b[1] - a[1]);
  const fr = factors.map((n, f) => [f, n]).slice(2).sort((a, b) => b[1] - a[1]).slice(0, 8);
  return { text: `most common distance factors (likely key lengths): ${fr.map(([f, n]) => `${f} (${n})`).join(', ') || 'none'}`, head: ['repeat', 'times', 'positions', 'distances'], rows: rows.slice(0, 60) };
}
function freqTable(items, total, n = 50) {
  const m = new Map(); for (const x of items) m.set(x, (m.get(x) || 0) + 1);
  const rows = [...m].sort((a, b) => b[1] - a[1]).slice(0, n), max = rows[0]?.[1] || 1;
  return rows.map(([k, c]) => [k === ' ' ? '␠' : k, c, pct(c, total), bar(c, max)]);
}

// ---------- esoteric languages ----------
function bf(code, input = '', maxSteps = 5e6) {
  const prog = [...code].filter((c) => '+-<>[].,'.includes(c)), jump = new Map(), st = [];
  prog.forEach((c, i) => { if (c === '[') st.push(i); else if (c === ']') { need(st.length, `unmatched ] at ${i}`); const j = st.pop(); jump.set(i, j); jump.set(j, i); } });
  need(!st.length, 'unmatched [');
  const tape = new Uint8Array(30000), inp = te.encode(input), out = []; let p = 0, ip = 0, k = 0, steps = 0;
  while (ip < prog.length) {
    need(++steps < maxSteps, `stopped after ${maxSteps.toLocaleString()} steps (infinite loop?)`);
    switch (prog[ip]) {
      case '+': tape[p]++; break; case '-': tape[p]--; break;
      case '>': p = (p + 1) % 30000; break; case '<': p = (p + 29999) % 30000; break;
      case '.': out.push(tape[p]); break; case ',': tape[p] = k < inp.length ? inp[k++] : 0; break;
      case '[': if (!tape[p]) ip = jump.get(ip); break; case ']': if (tape[p]) ip = jump.get(ip); break;
    }
    ip++;
  }
  return td.decode(Uint8Array.from(out));
}
function textToBf(s) { // compact: one cell, move by difference with a multiplication loop when large
  let cur = 0, out = '';
  for (const b of te.encode(s)) {
    let d = b - cur;
    const sign = d > 0 ? '+' : '-'; d = Math.abs(d);
    if (d > 15) { const f = Math.floor(Math.sqrt(d)), q = Math.floor(d / f), r = d - f * q; out += `>${'+'.repeat(f)}[<${sign.repeat(q)}>-]<${sign.repeat(r)}.`; }
    else out += sign.repeat(d) + '.';
    cur = b;
  }
  return out;
}
const OOK = { '>': 'Ook. Ook?', '<': 'Ook? Ook.', '+': 'Ook. Ook.', '-': 'Ook! Ook!', '.': 'Ook! Ook.', ',': 'Ook. Ook!', '[': 'Ook! Ook?', ']': 'Ook? Ook!' };
const bfToOok = (b) => [...b].filter((c) => OOK[c]).map((c) => OOK[c]).join(' ');
function ookToBf(o) { const inv = Object.fromEntries(Object.entries(OOK).map(([a, b]) => [b, a])); const w = String(o).match(/Ook[.?!]/g) || []; let out = ''; for (let i = 0; i + 1 < w.length; i += 2) out += inv[`${w[i]} ${w[i + 1]}`] ?? ''; return out; }
function hq9(code) {
  let out = '', acc = 0;
  for (const c of String(code)) {
    if (c === 'H' || c === 'h') out += 'Hello, world!\n';
    else if (c === 'Q' || c === 'q') out += code + '\n';
    else if (c === '9') for (let i = 99; i > 0; i--) out += `${i} bottle${i > 1 ? 's' : ''} of beer on the wall, ${i} bottle${i > 1 ? 's' : ''} of beer.\nTake one down and pass it around, ${i - 1 || 'no more'} bottle${i - 1 === 1 ? '' : 's'} of beer on the wall.\n\n`;
    else if (c === '+') acc++;
  }
  return out + (acc ? `(accumulator: ${acc})` : '');
}
function deadfish(code) { let a = 0, out = []; for (const c of String(code)) { if (c === 'i') a++; else if (c === 'd') a--; else if (c === 's') a *= a; else if (c === 'o') out.push(a); if (a === 256 || a < 0) a = 0; } return out.join(' '); }
function deadfishFrom(text) { // a deadfish program printing these numbers
  let a = 0, code = '';
  for (const n of String(text).split(/[\s,]+/).filter(Boolean).map(Number)) {
    need(Number.isInteger(n) && n >= 0 && n < 256, 'numbers 0–255 only');
    while (a !== n) { const r = Math.floor(Math.sqrt(n)); if (a > 1 && a * a <= n && a * a > a && n - a * a < n - a) { code += 's'; a *= a; } else if (a < n) { if (a < r && r * r <= n && (r - a) + (n - r * r) + 1 < n - a) { code += 'i'.repeat(r - a) + 's'; a = r * r; } else { code += 'i'; a++; } } else { code += 'd'; a--; } }
    code += 'o';
  }
  return code;
}

// ---------- misc ----------
function levenshtein(a, b) {
  const m = [...a], n = [...b]; let prev = Array.from({ length: n.length + 1 }, (_, i) => i);
  for (let i = 1; i <= m.length; i++) { const cur = [i]; for (let j = 1; j <= n.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (m[i - 1] === n[j - 1] ? 0 : 1)); prev = cur; }
  return prev[n.length];
}
export function soundex(w) {
  const s = letters(w); if (!s) return '';
  const code = { B: 1, F: 1, P: 1, V: 1, C: 2, G: 2, J: 2, K: 2, Q: 2, S: 2, X: 2, Z: 2, D: 3, T: 3, L: 4, M: 5, N: 5, R: 6 };
  let out = s[0], last = code[s[0]] || 0;
  for (const c of s.slice(1)) { const d = code[c] || 0; if (d && d !== last) out += d; if (c !== 'H' && c !== 'W') last = d; }
  return (out + '000').slice(0, 4);
}
function recursiveDecode(t) {
  const layers = []; let cur = String(t).trim();
  for (let i = 0; i < 20; i++) {
    let next = null, how = '';
    const c = cur.replace(/\s/g, '');
    if (/^[0-9a-f]+$/i.test(c) && c.length % 2 === 0 && c.length >= 4) { try { next = td.decode(unhex(c), { fatal: true }); how = 'hex'; } catch { next = null; } }
    if (next === null && /^[A-Za-z0-9+/_-]+={0,2}$/.test(c) && c.length >= 4 && c.length % 4 !== 1) { try { next = td.decode(unb64(c), { fatal: true }); how = 'base64'; } catch { next = null; } }
    if (next === null && /%[0-9a-f]{2}/i.test(cur)) { try { next = decodeURIComponent(cur); how = 'URL'; } catch { next = null; } }
    if (next === null || next === cur || /[\x00-\x08\x0e-\x1f]/.test(next)) break;
    layers.push([i + 1, how, next.length > 200 ? next.slice(0, 200) + '…' : next]); cur = next;
  }
  return { text: cur, head: ['layer', 'decoded from', 'result'], rows: layers };
}
const MIME = {
  html: 'text/html', htm: 'text/html', css: 'text/css', js: 'text/javascript', mjs: 'text/javascript', json: 'application/json', jsonld: 'application/ld+json', xml: 'application/xml', txt: 'text/plain', csv: 'text/csv', tsv: 'text/tab-separated-values', md: 'text/markdown', ics: 'text/calendar', vcf: 'text/vcard', yaml: 'application/yaml', yml: 'application/yaml', toml: 'application/toml',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif', svg: 'image/svg+xml', ico: 'image/x-icon', bmp: 'image/bmp', tif: 'image/tiff', tiff: 'image/tiff', heic: 'image/heic', heif: 'image/heif', jxl: 'image/jxl', psd: 'image/vnd.adobe.photoshop',
  mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/opus', flac: 'audio/flac', aac: 'audio/aac', m4a: 'audio/mp4', weba: 'audio/webm', mid: 'audio/midi', midi: 'audio/midi',
  mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', ogv: 'video/ogg', mov: 'video/quicktime', avi: 'video/x-msvideo', mkv: 'video/x-matroska', mpeg: 'video/mpeg', '3gp': 'video/3gpp', ts: 'video/mp2t',
  pdf: 'application/pdf', zip: 'application/zip', gz: 'application/gzip', tar: 'application/x-tar', '7z': 'application/x-7z-compressed', rar: 'application/vnd.rar', bz2: 'application/x-bzip2', xz: 'application/x-xz', zst: 'application/zstd',
  doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  odt: 'application/vnd.oasis.opendocument.text', ods: 'application/vnd.oasis.opendocument.spreadsheet', odp: 'application/vnd.oasis.opendocument.presentation', rtf: 'application/rtf', epub: 'application/epub+zip',
  woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', otf: 'font/otf', eot: 'application/vnd.ms-fontobject',
  wasm: 'application/wasm', exe: 'application/vnd.microsoft.portable-executable', dll: 'application/vnd.microsoft.portable-executable', msi: 'application/x-msi', deb: 'application/vnd.debian.binary-package', rpm: 'application/x-rpm', apk: 'application/vnd.android.package-archive', dmg: 'application/x-apple-diskimage', iso: 'application/x-iso9660-image', jar: 'application/java-archive',
  sh: 'application/x-sh', py: 'text/x-python', php: 'application/x-httpd-php', sql: 'application/sql', bin: 'application/octet-stream', pem: 'application/x-pem-file', crt: 'application/x-x509-ca-cert', der: 'application/pkix-cert', p12: 'application/x-pkcs12', pfx: 'application/x-pkcs12', csr: 'application/pkcs10', p7s: 'application/pkcs7-signature',
  eml: 'message/rfc822', msg: 'application/vnd.ms-outlook', mbox: 'application/mbox', webmanifest: 'application/manifest+json', rss: 'application/rss+xml', atom: 'application/atom+xml', gpx: 'application/gpx+xml', kml: 'application/vnd.google-earth.kml+xml', geojson: 'application/geo+json', pcap: 'application/vnd.tcpdump.pcap',
};
function mimeLookup(q) {
  const s = String(q).trim().toLowerCase().replace(/^\*?\./, '');
  const rows = Object.entries(MIME).filter(([e, m]) => !s || e === s || e.includes(s) || m.includes(s)).map(([e, m]) => [`.${e}`, m]);
  return { head: ['extension', 'MIME type'], rows: rows.slice(0, 200), text: rows.length ? '' : 'no match' };
}
function ordinal(n) { const v = Math.abs(n) % 100; return n + (v >= 11 && v <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][v % 10] || 'th'); }
const ORD_W = { one: 'first', two: 'second', three: 'third', five: 'fifth', eight: 'eighth', nine: 'ninth', twelve: 'twelfth' };
function ordinalWords(words) { return words.replace(/(\w+)$/, (w) => ORD_W[w] || (w.endsWith('y') ? w.slice(0, -1) + 'ieth' : w + 'th')); }
const BITOPS = { and: (a, b) => a & b, or: (a, b) => a | b, xor: (a, b) => a ^ b, nand: (a, b, m) => ~(a & b) & m, nor: (a, b, m) => ~(a | b) & m, xnor: (a, b, m) => ~(a ^ b) & m, shl: (a, b, m) => (a << b) & m, shr: (a, b) => a >> b, not: (a, b, m) => ~a & m };
const big = (s) => { const t = String(s).trim().replace(/[_\s]/g, ''); need(/^(0x[0-9a-f]+|0b[01]+|0o[0-7]+|\d+)$/i.test(t), `"${s}" is not a non-negative integer`); return BigInt(t); };

export const OTHER = [
  { id: 'xor', name: 'XOR', desc: 'XOR text with a repeating text key. Output as hex; decrypt takes hex.', params: [T('key', 'key', 'secret')],
    enc: (t, p) => { const k = te.encode(p.key); need(k.length, 'enter a key'); return hexOf(te.encode(t).map((b, i) => b ^ k[i % k.length])); }, dec: (t, p) => { const k = te.encode(p.key); need(k.length, 'enter a key'); return td.decode(unhex(t).map((b, i) => b ^ k[i % k.length])); }, sample: 'Attack at dawn' },
  { id: 'rot47', name: 'ROT47', desc: 'Rotate the 94 printable ASCII characters by 47. Reciprocal.', params: [], enc: (t) => rot47(t), dec: (t) => rot47(t), sample: 'The Quick Brown Fox Jumps Over The Lazy Dog.' },
  { id: 'letter-frequency', name: 'Letter Frequency', desc: 'Count of each letter compared with English.', params: [C('all', 'all characters, not only letters')], modes: ['run'], labels: ['analyse'],
    run: (t, p) => { const items = p.all ? [...t] : [...letters(t)]; const rows = freqTable(items, items.length, 100); if (!p.all) for (const r of rows) r.push(`${EN_FREQ[r[0].charCodeAt(0) - 65]?.toFixed(2) ?? ''}`); return { head: ['char', 'count', '%', '', ...(p.all ? [] : ['English %'])], rows, text: `${items.length} characters` }; }, sample: 'Uifsf jt b ijeefo nfttbhf jo uijt ufyu, dbo zpv gjoe ju?' },
  { id: 'vigenere-key-length', name: 'Vigenère Key Length', desc: 'Index of coincidence of the columns for each key length: English ≈ 0.066, random ≈ 0.038.', params: [N('max', 'longest key to test', 20, 2, 40)], modes: ['run'], labels: ['analyse'],
    run: (t, p) => { const l = letters(t); need(l.length >= 20, 'paste more ciphertext'); const r = keyLengths(l, +p.max), mx = Math.max(...r.map((x) => x[1])); return { head: ['length', 'avg IoC', ''], rows: r.map(([L, ic]) => [L, ic.toFixed(4), bar(ic, mx)]), text: `Friedman estimate: ${((0.027 * l.length) / ((l.length - 1) * ioc(l) - 0.038 * l.length + 0.065)).toFixed(1)}` }; }, sample: 'LXFOPVEFRNHRLXFOPVEFRNHRMEKNXUOAFFHFTCLXFOPVEFRNHR' },
  { id: 'vigenere-crack', name: 'Vigenère Auto-Crack', desc: 'Guess the key length (index of coincidence), then each key letter (χ² against English).', params: [N('max', 'longest key to test', 20, 2, 40)], modes: ['run'], labels: ['crack'],
    run: (t, p) => vigCrack(t, +p.max), sample: 'Vvhqwvvrhmusgjgthkihtssejchlsfcbgvwcrlryqtfsvgahwkcuhwauglqhnslrljshbltspisprdxljsveeghlqwkasskuwepwqtwvspgoelkcqyfnsvwljsniqkgnrgybwlwgoviokhkazkqkxzgyhcecmeiujoqkwfwvefqhkijrclrlkbienqfrjljsdhgrhlsfqtwlauqrhwdmwlgusgikkflryvcwvspgpmlkassjvoqxeggveyggzmljcxxljsvpaivwikvrdrygfrjljslveggveyggeiapuuisfpbtgnwwmuczrvtwglrwugumnczvile' },
  { id: 'ascii-shift', name: 'ASCII Shift', desc: 'Shift every printable ASCII character (32–126) by N, wrapping around.', params: [N('shift', 'shift', 1, -94, 94)], enc: (t, p) => asciiShift(t, +p.shift), dec: (t, p) => asciiShift(t, -p.shift), sample: 'Hello, World!' },
  { id: 'bitwise', name: 'Bitwise Operations', desc: 'AND, OR, XOR, NAND, NOR, XNOR, NOT and shifts on integers (decimal, 0x, 0b).', params: [S('op', 'operation', [['and', 'AND'], ['or', 'OR'], ['xor', 'XOR'], ['nand', 'NAND'], ['nor', 'NOR'], ['xnor', 'XNOR'], ['not', 'NOT a'], ['shl', 'a << b'], ['shr', 'a >> b']]), T('b', 'b', '0x0F', { short: true }), N('bits', 'width (bits)', 32, 1, 128)], modes: ['run'], labels: ['compute'],
    run: (t, p) => { const a = big(t), b = p.op === 'not' ? 0n : big(p.b), m = (1n << BigInt(+p.bits)) - 1n, r = BITOPS[p.op](a & m, b & m, m) & m; const w = +p.bits; return { head: ['', 'decimal', 'hex', 'binary'], rows: [['a', a & m, (a & m).toString(16), (a & m).toString(2).padStart(w, '0')], p.op === 'not' ? null : ['b', b & m, (b & m).toString(16), (b & m).toString(2).padStart(w, '0')], ['result', r, r.toString(16), r.toString(2).padStart(w, '0')]].filter(Boolean).map((r2) => r2.map(String)) }; }, sample: '0b10110110' },
  { id: 'kasiski', name: 'Kasiski Examination', desc: 'Repeated sequences in a ciphertext and the factors of their distances: the key length is usually a common factor.', params: [N('min', 'shortest repeat', 3, 2, 6)], modes: ['run'], labels: ['analyse'], run: (t, p) => kasiski(t, +p.min), sample: 'LXFOPVEFRNHRLXFOPVEFRNHRMEKNXUOAFFHFTCLXFOPVEFRNHR' },
  { id: 'ngram', name: 'N-Gram Frequency', desc: 'Most frequent bigrams, trigrams… of the letters.', params: [N('n', 'n', 2, 1, 8), C('spaces', 'keep word boundaries')], modes: ['run'], labels: ['analyse'],
    run: (t, p) => { const n = +p.n, src = p.spaces ? String(t).toUpperCase().replace(/[^A-Z]+/g, ' ') : letters(t), g = []; for (let i = 0; i + n <= src.length; i++) { const x = src.slice(i, i + n); if (!x.includes(' ')) g.push(x); } return { head: ['n-gram', 'count', '%', ''], rows: freqTable(g, g.length, 60), text: `${g.length} ${n}-grams` }; }, sample: 'The quick brown fox jumps over the lazy dog then the dog sleeps' },
  { id: 'mono-solver', name: 'Monoalphabetic Solver', desc: 'Breaks a simple substitution cipher by hill climbing on English trigram statistics. Needs 100+ letters; re-run with another seed if the result is close but not right.', params: [N('iters', 'iterations per round', 6000, 500, 50000), T('seed', 'random seed', 'a', { short: true })], modes: ['run'], labels: ['solve'],
    run: (t, p) => monoSolve(t, +p.iters, p.seed), sample: 'Bfq ywkhxsu dkmsr ckt lqw ibj ys ifwy pb tbrjwql ysd dkxl fwj cqol yqqi itp tfwq ywq ydkxl axlknnr kdjxuwi xy okt lqknnr anns, kli ywq ibbdt bvwlwi ojyf k nbsu yxdwi tjuf, kt xa ywq hkmfxlw xytwna okt tbddr abd ywq iwnkr.' },
  { id: 'xor-hex', name: 'XOR (Hex Key)', desc: 'XOR bytes (hex, Base64 or text) with a repeating hex key.', params: [S('fmt', 'input', [['hex', 'hex'], ['base64', 'Base64'], ['text', 'text']]), T('key', 'key (hex)', '2a')],
    enc: (t, p) => { const k = unhex(p.key); need(k.length, 'enter a hex key'); return hexOf(readBytes(t, p.fmt).map((b, i) => b ^ k[i % k.length])); }, dec: (t, p) => { const k = unhex(p.key); need(k.length, 'enter a hex key'); const r = unhex(t).map((b, i) => b ^ k[i % k.length]); return `${hexOf(r)}\n\n${printable(r)}`; }, sample: '48656c6c6f2c20776f726c6421', labels: ['XOR → hex', 'XOR hex → hex + text'] },
  { id: 'levenshtein', name: 'Levenshtein Distance', desc: 'Minimum number of insertions, deletions and substitutions to turn one text into another.', params: [A('b', 'second text', 'sitting')], modes: ['run'], labels: ['compare'],
    run: (t, p) => { const d = levenshtein(t, p.b), L = Math.max([...t].length, [...p.b].length); return { head: ['', ''], rows: [['distance', String(d)], ['similarity', `${pct(L - d, L)} %`]] }; }, sample: 'kitten' },
  { id: 'soundex', name: 'Soundex', desc: 'Phonetic code of English names (R163 = Robert, Rupert).', params: [], modes: ['run'], labels: ['encode'], run: (t) => ({ head: ['word', 'Soundex'], rows: String(t).split(/[\s,]+/).filter(Boolean).map((w) => [w, soundex(w)]) }), sample: 'Robert Rupert Rubin Ashcraft Tymczak Pfister' },
  { id: 'brainfuck', name: 'Brainfuck', desc: 'Run a Brainfuck program, or generate one that prints your text.', params: [T('input', 'program input (for ,)', '')], labels: ['text → program', 'run program'],
    enc: (t) => textToBf(t), dec: (t, p) => bf(t, p.input), sample: 'Hello!' },
  { id: 'ook', name: 'Ook!', desc: 'Brainfuck for orang-utans: text ↔ Ook! program, which is also run.', params: [], labels: ['text → Ook!', 'run Ook!'], enc: (t) => bfToOok(textToBf(t)), dec: (t) => bf(ookToBf(t)), sample: 'Ook' },
  { id: 'hq9', name: 'HQ9+', desc: 'H prints "Hello, world!", Q prints the program, 9 prints 99 Bottles of Beer, + increments an accumulator.', params: [], modes: ['run'], labels: ['run'], run: (t) => hq9(t), sample: 'HQ+' },
  { id: 'deadfish', name: 'Deadfish', desc: 'i increments, d decrements, s squares, o outputs (the value resets at 256 and −1). Or generate code for numbers.', params: [], labels: ['numbers → code', 'run code'], enc: (t) => deadfishFrom(t), dec: (t) => deadfish(t), sample: '72 101 108' },
  { id: 'xor-crack', name: 'XOR Auto-Crack', desc: 'Breaks single-byte and repeating-key XOR: key size by normalised Hamming distance, each key byte by English scoring.', params: [S('fmt', 'input', [['hex', 'hex'], ['base64', 'Base64']]), N('max', 'longest key', 16, 1, 40)], modes: ['run'], labels: ['crack'],
    run: (t, p) => xorCrack(t, p.fmt, +p.max), sample: '0b3637272a2b2e63622c2e69692a23693a2a3c6324202d623d63343c2a26226324272765272a282b2f20430a652e2c652a3124333a653e2b2027630c692b20283165286326302e27282f' },
  { id: 'base64-recursive', name: 'Base64 Recursive Decoder', desc: 'Peel nested Base64 / hex / URL encodings layer by layer.', params: [], modes: ['run'], labels: ['decode'], run: (t) => recursiveDecode(t), sample: 'Vm0xd1MyUXlVWGxUYTJScFRUSjRWRll3WkRSV1ZteFZVMjA1VmsxV1duaFdNbmhoVmpGYWRGVnNiRlZXYlUweFZtcEtTMUl5U2tsaVJuQk9VbXhXTmxkV1VrdFVNVnBYVW01S1VGWkdTbkpVVjNSWFRXeHNjMUp1Y0d0TlJGWjZWa1JLZDFaSFNsaFZhMlJVWW10dk1BPT0=' },
  { id: 'ioc', name: 'Index of Coincidence', desc: 'Probability that two random letters are equal: English ≈ 0.0667, random text ≈ 0.0385.', params: [], modes: ['run'], labels: ['analyse'], run: (t) => { const v = ioc(t), n = letters(t).length; return { head: ['', ''], rows: [['letters', String(n)], ['IoC', v.toFixed(5)], ['× 26 (normalised)', (v * 26).toFixed(3)], ['looks like', v > 0.06 ? 'monoalphabetic / plain language' : v > 0.045 ? 'polyalphabetic with a short key' : 'polyalphabetic / random']] }; }, sample: 'Hello world, this is a plain English sentence for testing.' },
  { id: 'chi-squared', name: 'Chi-Squared Statistic', desc: 'χ² of the letter counts against English: lower = more English-like (English text is usually < 100).', params: [], modes: ['run'], labels: ['analyse'], run: (t) => ({ head: ['', ''], rows: [['letters', String(letters(t).length)], ['χ²', chi2(t).toFixed(2)]] }), sample: 'Defend the east wall of the castle' },
  { id: 'entropy', name: 'Shannon Entropy', desc: 'Bits of information per character / byte: ~4 for English text, ~8 for random or compressed data.', params: [S('unit', 'unit', [['chars', 'characters'], ['bytes', 'UTF-8 bytes']])], modes: ['run'], labels: ['analyse'],
    run: (t, p) => { const it = p.unit === 'bytes' ? [...te.encode(t)] : [...t], m = new Map(); for (const x of it) m.set(x, (m.get(x) || 0) + 1); let h = 0; for (const c of m.values()) { const q = c / it.length; h -= q * Math.log2(q); } return { head: ['', ''], rows: [['symbols', String(it.length)], ['distinct', String(m.size)], ['entropy', `${h.toFixed(4)} bits / symbol`], ['total', `${(h * it.length).toFixed(0)} bits`], ['maximum for this alphabet', `${Math.log2(m.size || 1).toFixed(4)} bits`]] }; }, sample: 'correct horse battery staple' },
  { id: 'palindrome', name: 'Palindrome Checker', desc: 'Does the text read the same backwards (ignoring case, spaces and punctuation)?', params: [], modes: ['run'], labels: ['check'],
    run: (t) => { const s = String(t).toLowerCase().normalize('NFD').replace(/[^\p{L}\p{N}]/gu, ''); const ok = s.length > 0 && s === [...s].reverse().join(''); return { head: ['', ''], rows: [['normalised', s], ['palindrome', ok ? '✓ yes' : '✗ no']] }; }, sample: 'A man, a plan, a canal: Panama' },
  { id: 'anagram', name: 'Anagram Checker', desc: 'Are two texts made of the same letters?', params: [A('b', 'second text', 'Dormitory')], modes: ['run'], labels: ['check'],
    run: (t, p) => { const k = (s) => [...String(s).toLowerCase().normalize('NFD').replace(/[^\p{L}\p{N}]/gu, '')].sort().join(''); const a = k(t), b = k(p.b); const diff = (x, y) => { const m = new Map(); for (const c of x) m.set(c, (m.get(c) || 0) + 1); for (const c of y) m.set(c, (m.get(c) || 0) - 1); return [...m].filter(([, n]) => n).map(([c, n]) => `${c}${n > 0 ? '+' : ''}${n}`).join(' '); }; return { head: ['', ''], rows: [['first, sorted', a], ['second, sorted', b], ['anagrams', a === b && a ? '✓ yes' : `✗ no — difference: ${diff(a, b)}`]] }; }, sample: 'Dirty room' },
  { id: 'hamming', name: 'Hamming Distance', desc: 'Positions that differ between two equal-length strings, and differing bits.', params: [A('b', 'second text', 'karolin'), S('as', 'compare', [['chars', 'characters'], ['bits', 'bits of UTF-8 bytes'], ['hex', 'bits of hex values']])], modes: ['run'], labels: ['compare'],
    run: (t, p) => {
      if (p.as === 'chars') { const a = [...t], b = [...p.b]; need(a.length === b.length, `lengths differ (${a.length} vs ${b.length})`); const d = a.filter((c, i) => c !== b[i]).length; return { head: ['', ''], rows: [['distance', String(d)], ['positions', a.map((c, i) => (c !== b[i] ? i + 1 : null)).filter(Boolean).join(', ') || '—']] }; }
      const A2 = p.as === 'hex' ? unhex(t) : te.encode(t), B2 = p.as === 'hex' ? unhex(p.b) : te.encode(p.b); need(A2.length === B2.length, `byte lengths differ (${A2.length} vs ${B2.length})`);
      return { head: ['', ''], rows: [['bit distance', String(hamming(A2, B2))], ['of', `${A2.length * 8} bits`]] };
    }, sample: 'kathrin' },
  { id: 'mime', name: 'MIME Type Lookup', desc: 'File extension ↔ MIME type (search either).', params: [], modes: ['run'], labels: ['search'], run: (t) => mimeLookup(t), sample: 'docx' },
  { id: 'random-number', name: 'Random Number Generator', desc: 'Cryptographically secure random integers.', params: [N('min', 'min', 1, -1e12, 1e12), N('max', 'max', 100, -1e12, 1e12), N('count', 'how many', 10, 1, 10000), C('unique', 'no repeats'), C('sort', 'sorted')], modes: ['run'], labels: ['generate'],
    run: (t, p) => {
      const lo = Math.ceil(+p.min), hi = Math.floor(+p.max), n = +p.count; need(hi >= lo, 'max must be ≥ min'); const span = hi - lo + 1; need(!p.unique || n <= span, 'not enough distinct values in this range');
      const pick = () => { const a = new Uint32Array(2); crypto.getRandomValues(a); return lo + Math.floor(((a[0] * 2 ** 21 + (a[1] >>> 11)) / 2 ** 53) * span); };
      const set = new Set(), out = []; while (out.length < n) { const v = pick(); if (p.unique) { if (set.has(v)) continue; set.add(v); } out.push(v); }
      if (p.sort) out.sort((a, b) => a - b); return out.join(' ');
    }, sample: '' },
  { id: 'ordinal', name: 'Ordinal Number Converter', desc: '1 → 1st / first, 22 → 22nd / twenty-second.', params: [], modes: ['run'], labels: ['convert'],
    run: (t) => ({ head: ['number', 'ordinal', 'words'], rows: String(t).split(/[\s,]+/).filter(Boolean).map((x) => { const n = parseInt(x, 10); need(Number.isFinite(n), `"${x}" is not a number`); return [String(n), ordinal(n), ordinalWords(numberWords(n))]; }) }), sample: '1 2 3 4 11 12 13 21 22 101 1000' },
  { id: 'number-base', name: 'Number Base Viewer', desc: 'An integer in bases 2, 8, 10, 16, 32, 36 and any base 2–36 you pick.', params: [N('base', 'extra base', 7, 2, 36)], modes: ['run'], labels: ['show'],
    run: (t, p) => { const n = big(t); return { head: ['base', 'value'], rows: [[2, n.toString(2)], [8, n.toString(8)], [10, n.toString(10)], [16, n.toString(16)], [32, n.toString(32)], [36, n.toString(36)], [+p.base, n.toString(+p.base)]].map((r) => r.map(String)) }; }, sample: '0xDEADBEEF' },
];

function rot47(t) { return [...String(t)].map((c) => { const x = c.charCodeAt(0); return x >= 33 && x <= 126 ? String.fromCharCode(33 + ((x + 14) % 94)) : c; }).join(''); }
function asciiShift(t, s) { return [...String(t)].map((c) => { const x = c.charCodeAt(0); return x >= 32 && x <= 126 ? String.fromCharCode(32 + mod(x - 32 + s, 95)) : c; }).join(''); }
function numberWords(n) {
  const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  if (n < 0) return 'minus ' + numberWords(-n);
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '');
  if (n < 1000) return `${ONES[Math.floor(n / 100)]} hundred${n % 100 ? ' and ' + numberWords(n % 100) : ''}`;
  for (const [v, w] of [[1e9, 'billion'], [1e6, 'million'], [1e3, 'thousand']]) if (n >= v) return `${numberWords(Math.floor(n / v))} ${w}${n % v ? (n % v < 100 ? ' and ' : ' ') + numberWords(n % v) : ''}`;
  return String(n);
}
