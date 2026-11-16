import { PDFName, PDFSignature } from 'pdf-lib';
import { $, el, kv, msg } from '../js/tk.js';
import { single, openLib } from './lib/pdf.js';

/** Strings for an OID in DER (subject / issuer attributes), e.g. CN = 2.5.4.3 */
function attr(der, oid) {
  const out = [];
  for (let i = 0; i + oid.length + 2 < der.length; i++) {
    if (der[i] !== 6 || der[i + 1] !== oid.length || !oid.every((b, j) => der[i + 2 + j] === b)) continue;
    const t = i + 2 + oid.length, tag = der[t], len = der[t + 1];
    if ([0x0c, 0x13, 0x14, 0x16, 0x1e].includes(tag) && len < 128) out.push(new TextDecoder(tag === 0x1e ? 'utf-16be' : 'utf-8').decode(der.subarray(t + 2, t + 2 + len)));
  }
  return [...new Set(out)];
}
function signingTime(der) {
  const oid = [0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x09, 0x05];
  for (let i = 0; i < der.length - 30; i++) if (der[i] === 6 && der[i + 1] === 9 && oid.every((b, j) => der[i + 2 + j] === b)) {
    const j = der.indexOf(0x17, i + 11); if (j < 0 || j > i + 20) continue;
    const s = new TextDecoder().decode(der.subarray(j + 2, j + 2 + der[j + 1])), m = s.match(/^(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)Z$/);
    if (m) return `20${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}:${m[6]} UTC`;
  }
  return '';
}
const pdfDate = (s) => { const m = String(s || '').match(/D:(\d{4})(\d\d)?(\d\d)?(\d\d)?(\d\d)?(\d\d)?/); return m ? `${m[1]}-${m[2] || '01'}-${m[3] || '01'} ${m[4] || '00'}:${m[5] || '00'}:${m[6] || '00'}` : ''; };
single(async (f) => {
  const doc = await openLib(f.bytes), sigs = doc.getForm().getFields().filter((x) => x instanceof PDFSignature);
  $('#ui').hidden = false;
  const tail = new TextDecoder('latin1').decode(f.bytes.subarray(Math.max(0, f.bytes.length - 2048)));
  const updates = (new TextDecoder('latin1').decode(f.bytes).match(/%%EOF/g) || []).length;
  if (!sigs.length) { msg($('#msg'), 'no signature fields in this PDF', 'warn'); $('#out').replaceChildren(); return; }
  msg($('#msg'), `${sigs.length} signature field(s) · ${updates} revision(s)`, 'ok');
  $('#out').replaceChildren(...sigs.map((s) => {
    const v = s.acroField.dict.lookup(PDFName.of('V')), t = el('table', { class: 'tk-kv' });
    if (!v) { kv(t, [['field', s.getName()], ['status', 'empty (not signed yet)']]); return el('div', {}, el('div', { class: 'tk-sec', text: s.getName() }), t); }
    const get = (k) => v.lookup(PDFName.of(k)), str = (k) => get(k)?.decodeText?.() ?? get(k)?.asString?.() ?? '';
    const br = get('ByteRange')?.asArray?.().map((n) => n.asNumber()) || [];
    const contents = get('Contents'), der = contents?.asBytes ? contents.asBytes() : new Uint8Array();
    const whole = br.length === 4 && br[0] === 0 && br[2] + br[3] === f.bytes.length;
    const cns = attr(der, [0x55, 0x04, 0x03]), orgs = attr(der, [0x55, 0x04, 0x0a]);
    kv(t, [
      ['field', s.getName()], ['signer name (/Name)', str('Name')], ['date (/M)', pdfDate(str('M'))], ['signing time (in the signature)', signingTime(der)],
      ['reason', str('Reason')], ['location', str('Location')], ['contact', str('ContactInfo')], ['format', (get('SubFilter')?.toString() || '').replace('/', '')],
      ['certificate names (CN)', cns.join(' · ')], ['organisations', orgs.join(' · ')],
      ['byte range', br.join(' ')], ['covers the whole file', whole ? '✓ yes' : `✗ no — ${f.bytes.length - (br[2] + br[3] || 0)} bytes were added after signing (later revision)`],
      ['signature size', `${der.length.toLocaleString()} bytes`],
    ].filter((r) => r[1]));
    return el('div', {}, el('div', { class: 'tk-sec', text: s.getName() }), t);
  }));
  void tail;
});
