import QRCode from 'qrcode';
import { $, $$, live, msg, pick } from '../js/tk.js';

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const unb32 = (s) => { let bits = ''; for (const c of s.toUpperCase().replace(/[\s=-]/g, '')) { const i = B32.indexOf(c); if (i < 0) throw new Error(`"${c}" is not Base32`); bits += i.toString(2).padStart(5, '0'); } return Uint8Array.from(bits.match(/.{8}/g) || [], (x) => parseInt(x, 2)); };
const b32 = (b) => { let bits = '', o = ''; for (const x of b) bits += x.toString(2).padStart(8, '0'); for (let i = 0; i + 5 <= bits.length; i += 5) o += B32[parseInt(bits.slice(i, i + 5), 2)]; return o; };
async function hotp(key, counter, alg, digits) {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: { SHA1: 'SHA-1', SHA256: 'SHA-256', SHA512: 'SHA-512' }[alg] }, false, ['sign']);
  const msgb = new ArrayBuffer(8); new DataView(msgb).setBigUint64(0, BigInt(counter));
  const h = new Uint8Array(await crypto.subtle.sign('HMAC', k, msgb)), o = h[h.length - 1] & 15;
  const v = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(v % 10 ** digits).padStart(digits, '0');
}
const fmt = (c) => c.replace(/(\d{3})(?=\d)/g, '$1 ');
let key = null;
async function tick() {
  if (!key) return;
  const alg = $('#alg').value, d = +$('#digits').value, totp = pick('kind') === 'totp', P = +$('#period').value || 30;
  const c = totp ? Math.floor(Date.now() / 1000 / P) : +$('#counter').value || 0;
  $('#prev').textContent = c > 0 ? fmt(await hotp(key, c - 1, alg, d)) : '—';
  $('#now').textContent = fmt(await hotp(key, c, alg, d));
  $('#next').textContent = fmt(await hotp(key, c + 1, alg, d));
  $('#bar').style.width = totp ? `${100 - ((Date.now() / 1000) % P) / P * 100}%` : '100%';
}
const setup = live([$('#sec'), $('#acct'), $('#iss'), $('#alg'), $('#digits'), $('#period'), $('#counter'), ...$$('input[name="kind"]')], async () => {
  $$('[data-k]').forEach((e) => { e.hidden = e.dataset.k !== pick('kind'); });
  try { key = unb32($('#sec').value); if (key.length < 10) msg($('#msg'), 'short secret: authenticator apps expect at least 16 Base32 characters (80 bits)', 'warn'); else msg($('#msg'), ''); }
  catch (e) { key = null; msg($('#msg'), e.message); return; }
  const kind = pick('kind'), label = encodeURIComponent(`${$('#iss').value}:${$('#acct').value}`);
  const q = new URLSearchParams({ secret: $('#sec').value.replace(/[\s=]/g, '').toUpperCase(), issuer: $('#iss').value, algorithm: $('#alg').value, digits: $('#digits').value, ...(kind === 'totp' ? { period: $('#period').value } : { counter: $('#counter').value }) });
  $('#uri').value = `otpauth://${kind}/${label}?${q}`;
  $('#qr').src = await QRCode.toDataURL($('#uri').value, { margin: 1, width: 200 });
  tick();
});
$('#newsec').addEventListener('click', () => { $('#sec').value = b32(crypto.getRandomValues(new Uint8Array(20))); setup(); });
setInterval(tick, 1000);
