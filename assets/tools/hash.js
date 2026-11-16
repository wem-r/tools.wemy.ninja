import { createMD4, createMD5, createSHA1, createSHA224, createSHA256, createSHA384, createSHA512, createSHA3,
  createRIPEMD160, createBLAKE2b, createBLAKE3, createCRC32, md4 } from 'hash-wasm';
import { $, $$, kv, msg, pick, live, toB64, fromHex } from '../js/tk.js';
import { source } from './lib/source.js';

const ALGS = [
  ['MD5', createMD5], ['SHA-1', createSHA1], ['SHA-224', createSHA224], ['SHA-256', createSHA256],
  ['SHA-384', createSHA384], ['SHA-512', createSHA512], ['SHA3-256', () => createSHA3(256)], ['SHA3-512', () => createSHA3(512)],
  ['RIPEMD-160', createRIPEMD160], ['BLAKE2b-512', () => createBLAKE2b(512)], ['BLAKE3', () => createBLAKE3()],
  ['MD4', createMD4], ['CRC-32', () => createCRC32()],
];
const CHUNK = 4 << 20;
let job = 0, last = [];

const show = () => {
  const f = pick('out');
  kv($('#out'), last.map(([n, h, note]) => [n, f === 'HEX' ? h.toUpperCase() : f === 'base64' ? toB64(fromHex(h)) : h, note]));
};

source(async (getBytes, { mode, file }) => {
  const id = ++job;
  try {
    const hashers = await Promise.all(ALGS.map(([, c]) => c()));
    hashers.forEach((h) => h.init());
    const data = await getBytes();
    for (let i = 0; i < data.length || i === 0; i += CHUNK) {
      const part = data.subarray(i, i + CHUNK);
      hashers.forEach((h) => h.update(part));
      if (id !== job) return;
      if (data.length > CHUNK) msg($('#msg'), `hashing… ${Math.round((100 * (i + part.length)) / data.length)} %`, 'warn');
      if (data.length > CHUNK) await new Promise((r) => setTimeout(r));
      if (!data.length) break;
    }
    last = ALGS.map(([n], i) => [n, hashers[i].digest('hex')]);
    if (mode === 'text' && pick('fmt') === 'utf8') {
      // NTLM = MD4 of the UTF-16LE password
      const s = $('#txt').value, u = new Uint8Array(s.length * 2);
      for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); u[2 * i] = c & 255; u[2 * i + 1] = c >> 8; }
      last.push(['NTLM', await md4(u), 'MD4 of UTF-16LE — Windows password hash']);
    }
    if (id !== job) return;
    msg($('#msg'), mode === 'file' && file ? `${file.name} · ${data.length.toLocaleString()} bytes` : `${data.length.toLocaleString()} bytes`, 'ok');
    show();
  } catch (e) { if (id === job) { msg($('#msg'), e.message); $('#out').replaceChildren(); } }
});
live($$('input[name="out"]'), show);
