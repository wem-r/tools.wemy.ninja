// Target hash generator: build test hashes to validate a cracking setup, from a known
// password. NT/MD4/MD5 come from ntlm.js, LM from des.js, SHA via WebCrypto.
import { md5, ntHash, hex } from './ntlm.js';
import { desEncryptBlock } from './des.js';

const te = new TextEncoder();
const toHex = (b) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
const utf16le = (s) => { const b = new Uint8Array(s.length * 2); for (let i = 0; i < s.length; i++) { b[i * 2] = s.charCodeAt(i) & 255; b[i * 2 + 1] = s.charCodeAt(i) >> 8; } return b; };
const sha = async (algo, bytes) => new Uint8Array(await crypto.subtle.digest(algo, bytes));

function strToKey(s7) {
  const k = new Uint8Array(8);
  k[0] = s7[0] >> 1;
  k[1] = ((s7[0] & 0x01) << 6) | (s7[1] >> 2);
  k[2] = ((s7[1] & 0x03) << 5) | (s7[2] >> 3);
  k[3] = ((s7[2] & 0x07) << 4) | (s7[3] >> 4);
  k[4] = ((s7[3] & 0x0f) << 3) | (s7[4] >> 5);
  k[5] = ((s7[4] & 0x1f) << 2) | (s7[5] >> 6);
  k[6] = ((s7[5] & 0x3f) << 1) | (s7[6] >> 7);
  k[7] = s7[6] & 0x7f;
  for (let i = 0; i < 8; i++) k[i] = (k[i] << 1) & 0xff;
  return k;
}
export function lmHash(password) {
  const up = password.toUpperCase().slice(0, 14);
  const buf = new Uint8Array(14); for (let i = 0; i < up.length; i++) buf[i] = up.charCodeAt(i) & 0xff;
  const KGS = Uint8Array.from([0x4b, 0x47, 0x53, 0x21, 0x40, 0x23, 0x24, 0x25]);
  const h1 = desEncryptBlock(strToKey(buf.slice(0, 7)), KGS);
  const h2 = desEncryptBlock(strToKey(buf.slice(7, 14)), KGS);
  return (toHex(h1) + toHex(h2)).toUpperCase();
}

// MySQL OLD_PASSWORD (pre-4.1)
function mysql323(pw) {
  let nr = 1345345333, add = 7, nr2 = 0x12345671;
  for (const ch of pw) { if (ch === ' ' || ch === '\t') continue; const c = ch.charCodeAt(0); nr ^= ((((nr & 63) + add) * c) + (nr << 8)) >>> 0; nr2 = (nr2 + ((nr2 << 8) ^ nr)) >>> 0; add += c; }
  const a = (nr & 0x7fffffff) >>> 0, b = (nr2 & 0x7fffffff) >>> 0;
  return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0');
}

const ITOA64 = './0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
function to64(v, n) { let s = ''; while (n-- > 0) { s += ITOA64[v & 0x3f]; v >>>= 6; } return s; }
function md5cryptEncode(final) {
  const perm = [[0, 6, 12], [1, 7, 13], [2, 8, 14], [3, 9, 15], [4, 10, 5]];
  let out = '';
  for (const [a, b, c] of perm) out += to64((final[a] << 16) | (final[b] << 8) | final[c], 4);
  out += to64(final[11], 2);
  return out;
}
export function md5crypt(password, salt = randSalt(8), magic = '$1$') {
  const pw = te.encode(password), s = te.encode(salt);
  const cat = (...a) => { const n = a.reduce((x, y) => x + y.length, 0), r = new Uint8Array(n); let o = 0; for (const y of a) { r.set(y, o); o += y.length; } return r; };
  let final = md5(cat(pw, s, pw));
  const parts = [pw, te.encode(magic), s];
  let ctx = [pw, s];
  let acc = cat(pw, te.encode(magic), s);
  for (let i = pw.length; i > 0; i -= 16) acc = cat(acc, final.slice(0, Math.min(16, i)));
  for (let i = pw.length; i > 0; i >>= 1) acc = cat(acc, (i & 1) ? new Uint8Array([0]) : pw.slice(0, 1));
  final = md5(acc);
  for (let i = 0; i < 1000; i++) {
    let t = (i & 1) ? pw : final;
    if (i % 3) t = cat(t, s);
    if (i % 7) t = cat(t, pw);
    t = cat(t, (i & 1) ? final : pw);
    final = md5(t);
  }
  return `${magic}${salt}$${md5cryptEncode(final)}`;
}

function randSalt(n) { const c = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; return [...crypto.getRandomValues(new Uint8Array(n))].map((b) => c[b % c.length]).join(''); }

export async function generate(password, opts = {}) {
  const pw = te.encode(password);
  const sha1 = await sha('SHA-1', pw), sha256 = await sha('SHA-256', pw), sha512 = await sha('SHA-512', pw);
  const out = [
    ['NTLM', ntHash(password), 'hashcat -m 1000'],
    ['LM', lmHash(password), 'hashcat -m 3000 (legacy, DES)'],
    ['MD5', hex(md5(pw)), 'hashcat -m 0'],
    ['SHA-1', toHex(sha1), 'hashcat -m 100'],
    ['SHA-256', toHex(sha256), 'hashcat -m 1400'],
    ['SHA-512', toHex(sha512), 'hashcat -m 1700'],
    ['MySQL 4.1+', '*' + toHex(await sha('SHA-1', sha1)).toUpperCase(), 'hashcat -m 300'],
    ['MySQL 323 (old)', mysql323(password), 'hashcat -m 200'],
    ['Postgres (md5)', 'md5' + hex(md5(te.encode(password + (opts.user || 'postgres')))), 'md5($pass.$user)'],
    ['md5crypt $1$', md5crypt(password), 'hashcat -m 500'],
  ];
  // MSSQL 2005
  const salt = crypto.getRandomValues(new Uint8Array(4));
  const d = await sha('SHA-1', concat(utf16le(password), salt));
  out.push(['MSSQL 2005', '0x0100' + toHex(salt) + toHex(d).toUpperCase(), 'hashcat -m 132']);
  // Django PBKDF2-SHA256
  const iter = 600000;
  const key = await crypto.subtle.importKey('raw', pw, 'PBKDF2', false, ['deriveBits']);
  const dk = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: te.encode(opts.djangoSalt || randSalt(12)), iterations: iter, hash: 'SHA-256' }, key, 256));
  out.push(['Django pbkdf2_sha256', `pbkdf2_sha256$${iter}$${opts.djangoSalt || 'salt'}$${btoa(String.fromCharCode(...dk))}`, 'hashcat -m 10000']);
  return out;
}
function concat(...a) { const n = a.reduce((x, y) => x + y.length, 0), r = new Uint8Array(n); let o = 0; for (const y of a) { r.set(y, o); o += y.length; } return r; }
