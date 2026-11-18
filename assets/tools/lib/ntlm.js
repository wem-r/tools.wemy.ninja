// NT hash and NetNTLMv2 computation. Self-contained MD4 / MD5 / HMAC-MD5 (no deps) so the
// same code runs in the browser and in the test. For building test hashes and checking a
// cracking setup against passwords you are allowed to test.

const rotl = (x, c) => (x << c) | (x >>> (32 - c));
const toBytesLE = (words) => { const b = new Uint8Array(words.length * 4); for (let i = 0; i < words.length; i++) { b[i * 4] = words[i] & 255; b[i * 4 + 1] = (words[i] >>> 8) & 255; b[i * 4 + 2] = (words[i] >>> 16) & 255; b[i * 4 + 3] = (words[i] >>> 24) & 255; } return b; };
const hex = (b) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');

function pad(msg) {
  const len = msg.length, bitLen = len * 8;
  const withOne = len + 1, total = withOne + ((56 - (withOne % 64) + 64) % 64) + 8;
  const p = new Uint8Array(total); p.set(msg); p[len] = 0x80;
  for (let i = 0; i < 8; i++) p[total - 8 + i] = (bitLen / 2 ** (8 * i)) & 255;
  return p;
}
function words(block, off) { const w = new Array(16); for (let i = 0; i < 16; i++) w[i] = block[off + i * 4] | (block[off + i * 4 + 1] << 8) | (block[off + i * 4 + 2] << 16) | (block[off + i * 4 + 3] << 24); return w; }

export function md4(msg) {
  const m = pad(msg); let a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476;
  for (let off = 0; off < m.length; off += 64) {
    const x = words(m, off); let A = a, B = b, C = c, D = d;
    // registers update sequentially (D uses the just-updated A, and so on)
    const FF = (p, q, r, s, k, sh) => rotl((p + ((q & r) | (~q & s)) + x[k]) | 0, sh);
    const GG = (p, q, r, s, k, sh) => rotl((p + ((q & r) | (q & s) | (r & s)) + x[k] + 0x5a827999) | 0, sh);
    const HH = (p, q, r, s, k, sh) => rotl((p + (q ^ r ^ s) + x[k] + 0x6ed9eba1) | 0, sh);
    for (let i = 0; i < 16; i += 4) { A = FF(A, B, C, D, i, 3); D = FF(D, A, B, C, i + 1, 7); C = FF(C, D, A, B, i + 2, 11); B = FF(B, C, D, A, i + 3, 19); }
    for (let i = 0; i < 4; i++) { A = GG(A, B, C, D, i, 3); D = GG(D, A, B, C, i + 4, 5); C = GG(C, D, A, B, i + 8, 9); B = GG(B, C, D, A, i + 12, 13); }
    for (const i of [0, 2, 1, 3]) { A = HH(A, B, C, D, i, 3); D = HH(D, A, B, C, i + 8, 9); C = HH(C, D, A, B, i + 4, 11); B = HH(B, C, D, A, i + 12, 15); }
    a = (a + A) | 0; b = (b + B) | 0; c = (c + C) | 0; d = (d + D) | 0;
  }
  return toBytesLE([a, b, c, d]);
}

const S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32));
export function md5(msg) {
  const m = pad(msg); let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  for (let off = 0; off < m.length; off += 64) {
    const x = words(m, off); let [A, B, C, D] = [a0, b0, c0, d0];
    for (let i = 0; i < 64; i++) {
      let f, g;
      if (i < 16) { f = (B & C) | (~B & D); g = i; }
      else if (i < 32) { f = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { f = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { f = C ^ (B | ~D); g = (7 * i) % 16; }
      const tmp = D; D = C; C = B;
      B = (B + rotl((A + f + K[i] + x[g]) | 0, S[i])) | 0; A = tmp;
    }
    a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0;
  }
  return toBytesLE([a0, b0, c0, d0]);
}

export function hmacMd5(key, msg) {
  if (key.length > 64) key = md5(key);
  const k = new Uint8Array(64); k.set(key);
  const ip = new Uint8Array(64), op = new Uint8Array(64);
  for (let i = 0; i < 64; i++) { ip[i] = k[i] ^ 0x36; op[i] = k[i] ^ 0x5c; }
  const inner = md5(concat(ip, msg));
  return md5(concat(op, inner));
}

const concat = (...a) => { const n = a.reduce((s, x) => s + x.length, 0), r = new Uint8Array(n); let o = 0; for (const x of a) { r.set(x, o); o += x.length; } return r; };
const utf16le = (s) => { const b = new Uint8Array(s.length * 2); for (let i = 0; i < s.length; i++) { b[i * 2] = s.charCodeAt(i) & 255; b[i * 2 + 1] = (s.charCodeAt(i) >> 8) & 255; } return b; };
const fromHex = (h) => { h = h.replace(/[^0-9a-f]/gi, ''); const b = new Uint8Array(h.length / 2); for (let i = 0; i < b.length; i++) b[i] = parseInt(h.substr(i * 2, 2), 16); return b; };

export const ntHash = (password) => hex(md4(utf16le(password)));

// NetNTLMv2, hashcat -m 5600.  challenge/blob are hex; a random blob is made if blank.
export function netNtlmv2(user, domain, password, serverChalHex, blobHex) {
  const ntlm = md4(utf16le(password));
  const v2key = hmacMd5(ntlm, utf16le(user.toUpperCase() + domain));
  const serverChal = serverChalHex ? fromHex(serverChalHex) : crypto.getRandomValues(new Uint8Array(8));
  const blob = blobHex ? fromHex(blobHex) : defaultBlob();
  const proof = hmacMd5(v2key, concat(serverChal, blob));
  const line = `${user}::${domain}:${hex(serverChal)}:${hex(proof)}:${hex(blob)}`;
  return { ntHash: hex(ntlm), v2key: hex(v2key), ntProof: hex(proof), serverChal: hex(serverChal), blob: hex(blob), hashcat: line };
}
function defaultBlob() {
  // 0x01010000 0000 + timestamp + 8-byte client challenge + 0000 + (empty target info) + 0000
  const t = new Uint8Array(8); const now = BigInt(Date.now() + 11644473600000) * 10000n;
  for (let i = 0; i < 8; i++) t[i] = Number((now >> BigInt(8 * i)) & 0xffn);
  const cc = crypto.getRandomValues(new Uint8Array(8));
  return concat(new Uint8Array([1, 1, 0, 0, 0, 0, 0, 0]), t, cc, new Uint8Array([0, 0, 0, 0]), new Uint8Array([0, 0, 0, 0]));
}

export { hex, utf16le };
