import { $, pick, download, toB64 } from '../js/tk.js';

const pem = (label, buf) => `-----BEGIN ${label}-----\n${toB64(buf).match(/.{1,64}/g).join('\n')}\n-----END ${label}-----\n`;
const b64url = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4)), (c) => c.charCodeAt(0));
function sshString(bytes) { const out = new Uint8Array(4 + bytes.length); new DataView(out.buffer).setUint32(0, bytes.length); out.set(bytes, 4); return out; }
function mpint(b) { let i = 0; while (i < b.length - 1 && b[i] === 0) i++; b = b.subarray(i); return b[0] & 0x80 ? Uint8Array.from([0, ...b]) : b; }
function openssh(jwk, comment) {
  const parts = [sshString(new TextEncoder().encode('ssh-rsa')), sshString(mpint(b64url(jwk.e))), sshString(mpint(b64url(jwk.n)))];
  const all = new Uint8Array(parts.reduce((a, p) => a + p.length, 0)); let o = 0; for (const p of parts) { all.set(p, o); o += p.length; }
  return `ssh-rsa ${toB64(all)} ${comment}`.trim();
}
$('#go').addEventListener('click', async () => {
  $('#go').disabled = true; $('#time').textContent = 'generating…';
  const t = performance.now();
  try {
    const kp = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: +pick('bits'), publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
    $('#pub').value = pem('PUBLIC KEY', await crypto.subtle.exportKey('spki', kp.publicKey));
    $('#priv').value = pem('PRIVATE KEY', await crypto.subtle.exportKey('pkcs8', kp.privateKey));
    $('#ssh').value = openssh(await crypto.subtle.exportKey('jwk', kp.publicKey), $('#comment').value);
    $('#time').textContent = `${pick('bits')} bits in ${Math.round(performance.now() - t)} ms`;
  } catch (e) { $('#time').textContent = e.message; } finally { $('#go').disabled = false; }
});
$('#dlpub').addEventListener('click', () => $('#pub').value && download('public.pem', $('#pub').value));
$('#dlpriv').addEventListener('click', () => $('#priv').value && download('private.pem', $('#priv').value));
$('#go').click();
