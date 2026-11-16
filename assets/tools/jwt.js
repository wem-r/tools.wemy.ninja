import * as jose from 'jose';
import { $, kv, live, msg, enc, fromB64 } from '../js/tk.js';

const tok = $('#tok');
const pretty = (o) => JSON.stringify(o, null, 2);
const when = (s) => { const d = new Date(s * 1000); return isNaN(d) ? String(s) : `${d.toISOString()} (${d.toString().replace(/ \(.*\)$/, '')})`; };

/** A key for alg from: PEM (SPKI / PKCS#8 / certificate), JWK JSON, or a shared secret. */
async function loadKey(text, alg, priv) {
  const t = text.trim();
  if (alg.startsWith('HS')) {
    if (t.startsWith('{')) return jose.importJWK(JSON.parse(t), alg);
    return $('#b64sec').checked && !priv ? fromB64(t) : enc.encode(text);
  }
  if (t.startsWith('{')) return jose.importJWK(JSON.parse(t), alg);
  if (t.includes('BEGIN CERTIFICATE')) return jose.importX509(t, alg);
  if (t.includes('BEGIN PUBLIC KEY')) return jose.importSPKI(t, alg);
  if (t.includes('BEGIN PRIVATE KEY')) return jose.importPKCS8(t, alg);
  if (t.includes('BEGIN RSA')) throw new Error('PKCS#1 key: convert it with `openssl pkcs8 -topk8 -nocrypt` (private) or `openssl rsa -pubout` (public)');
  throw new Error(priv ? 'expected a PKCS#8 PEM or a JWK' : 'expected a PEM public key, a certificate or a JWK');
}

let header = null, job = 0;
const verify = async () => {
  const id = ++job;
  if (!header) return msg($('#vmsg'), '');
  if (header.alg === 'none') return msg($('#vmsg'), '"alg": "none" — unsigned token, never accept it', 'err');
  if (!$('#key').value.trim()) return msg($('#vmsg'), 'enter the key to verify', 'warn');
  try {
    const key = await loadKey($('#key').value, header.alg, false);
    await jose.compactVerify(tok.value.trim(), key);
    if (id === job) msg($('#vmsg'), `✓ signature valid (${header.alg})`, 'ok');
  } catch (e) {
    if (id === job) msg($('#vmsg'), e.code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED' ? '✗ invalid signature for this key' : `✗ ${e.message}`, 'err');
  }
};

live(tok, () => {
  const t = tok.value.trim().replace(/^Bearer\s+/i, '');
  header = null;
  $('#hdr').textContent = ''; $('#pay').textContent = ''; $('#claims').replaceChildren(); $('#alg').textContent = '';
  if (!t) return msg($('#msg'), '');
  const parts = t.split('.');
  if (parts.length === 5) return msg($('#msg'), 'this is a JWE (encrypted token): only its header can be read without the key', 'warn');
  try {
    header = jose.decodeProtectedHeader(t);
    $('#hdr').textContent = pretty(header);
    $('#alg').textContent = `${header.alg}${header.kid ? ` · kid ${header.kid}` : ''}`;
    const p = jose.decodeJwt(t);
    $('#pay').textContent = pretty(p);
    const now = Date.now() / 1000;
    msg($('#msg'), p.exp && p.exp < now ? `expired ${Math.round((now - p.exp) / 60)} minutes ago` : p.nbf && p.nbf > now ? 'not valid yet (nbf in the future)' : 'decoded', p.exp && p.exp < now ? 'warn' : 'ok');
    kv($('#claims'), [
      p.iss && ['iss (issuer)', p.iss], p.sub && ['sub (subject)', String(p.sub)], p.aud && ['aud (audience)', [].concat(p.aud).join(', ')],
      p.iat && ['iat (issued)', when(p.iat)], p.nbf && ['nbf (not before)', when(p.nbf)], p.exp && ['exp (expires)', when(p.exp), p.exp < now ? 'expired' : ''],
      p.jti && ['jti (id)', p.jti],
    ]);
  } catch (e) { msg($('#msg'), e.message.replace('Invalid JWT', 'not a JWT') + ' — expected header.payload.signature'); }
  verify();
});
live([$('#key'), $('#b64sec')], verify);

// ---------- sign ----------
const ALG_GEN = { RS256: {}, RS384: {}, RS512: {}, PS256: {}, ES256: {}, ES384: {}, ES512: {}, EdDSA: { crv: 'Ed25519' } };
$('#salg').addEventListener('change', () => {
  const asym = !$('#salg').value.startsWith('HS');
  $('#genkey').textContent = asym ? 'generate a key pair' : 'generate a secret';
});
$('#genkey').addEventListener('click', async () => {
  const alg = $('#salg').value;
  try {
    if (alg.startsWith('HS')) {
      $('#skey').value = jose.base64url.encode(crypto.getRandomValues(new Uint8Array(+alg.slice(2) / 8)));
      $('#pubbox').hidden = true; msg($('#smsg'), 'random secret — note: it is used as text (its characters), as most libraries do', 'ok');
      return;
    }
    const { publicKey, privateKey } = await jose.generateKeyPair(alg, { extractable: true, ...ALG_GEN[alg] });
    $('#skey').value = await jose.exportPKCS8(privateKey);
    $('#pub').value = await jose.exportSPKI(publicKey);
    $('#pubbox').hidden = false; msg($('#smsg'), `new ${alg} key pair, generated in your browser`, 'ok');
  } catch (e) { msg($('#smsg'), e.message); }
});
$('#sign').addEventListener('click', async () => {
  const alg = $('#salg').value;
  try {
    const payload = JSON.parse($('#spay').value || '{}');
    let j = new jose.SignJWT(payload).setProtectedHeader({ alg, typ: 'JWT' }).setIssuedAt();
    if ($('#sexp').value) j = j.setExpirationTime($('#sexp').value);
    const key = await loadKey($('#skey').value, alg, true);
    $('#sout').value = await j.sign(key);
    msg($('#smsg'), 'signed — paste it in the token box above to check it', 'ok');
  } catch (e) { msg($('#smsg'), e.message); $('#sout').value = ''; }
});
