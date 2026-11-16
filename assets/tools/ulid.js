import { $, kv, live, msg } from '../js/tk.js';

const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const enc = (n, len) => { let s = ''; for (let i = 0; i < len; i++) { s = B32[Number(n % 32n)] + s; n /= 32n; } return s; };
let lastT = -1, lastR = 0n;
function ulid(mono) {
  const t = Date.now();
  let r;
  if (mono && t <= lastT) r = lastR + 1n;
  else { const b = crypto.getRandomValues(new Uint8Array(10)); r = b.reduce((a, x) => a * 256n + BigInt(x), 0n); }
  lastT = Math.max(t, lastT); lastR = r;
  return enc(BigInt(lastT), 10) + enc(r & ((1n << 80n) - 1n), 16);
}
const gen = () => { const n = Math.max(1, Math.min(500, +$('#n').value || 1)); const out = Array.from({ length: n }, () => ulid($('#mono').checked)).join('\n'); $('#out').value = $('#lower').checked ? out.toLowerCase() : out; };
$('#go').addEventListener('click', gen); live([$('#n'), $('#mono'), $('#lower')], gen);
live($('#in'), () => {
  const s = $('#in').value.trim().toUpperCase().replace(/[IL]/g, '1').replace(/O/g, '0');
  if (!/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/.test(s)) { msg($('#msg'), s ? 'a ULID is 26 Crockford Base32 characters' : ''); kv($('#dec'), []); return; }
  const t = [...s.slice(0, 10)].reduce((a, c) => a * 32n + BigInt(B32.indexOf(c)), 0n), r = [...s.slice(10)].reduce((a, c) => a * 32n + BigInt(B32.indexOf(c)), 0n);
  msg($('#msg'), '');
  kv($('#dec'), [['time', new Date(Number(t)).toISOString(), `${t} ms`], ['randomness', r.toString(16).padStart(20, '0')], ['as UUID', [...(t.toString(16).padStart(12, '0') + r.toString(16).padStart(20, '0'))].join('').replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5')]]);
});
