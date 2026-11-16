import { createHMAC, createMD5, createSHA1, createSHA224, createSHA256, createSHA384, createSHA512, createSHA3 } from 'hash-wasm';
import { $, $$, kv, msg, pick, live, bytesFrom, toB64, fromHex } from '../js/tk.js';

const ALGS = {
  'SHA-256': createSHA256, 'SHA-384': createSHA384, 'SHA-512': createSHA512, 'SHA-224': createSHA224, 'SHA-1': createSHA1,
  'SHA3-256': () => createSHA3(256), 'SHA3-512': () => createSHA3(512), MD5: createMD5,
};
let results = [], job = 0;

const verify = () => {
  const e = $('#expect').value.trim();
  if (!e) return msg($('#vmsg'), '');
  let want;
  try { want = /^[0-9a-f]+$/i.test(e) ? e.toLowerCase() : [...atob(e.replace(/-/g, '+').replace(/_/g, '/'))].map((c) => c.charCodeAt(0).toString(16).padStart(2, '0')).join(''); }
  catch { return msg($('#vmsg'), 'not hex or base64'); }
  const hit = results.find(([, h]) => h === want);
  msg($('#vmsg'), hit ? `✓ matches ${hit[0]}` : '✗ no match with this key and message', hit ? 'ok' : 'err');
};

live([$('#key'), $('#txt'), $('#alg'), ...$$('input[name="fmt"]'), ...$$('input[name="kfmt"]')], async () => {
  const id = ++job;
  try {
    const key = bytesFrom($('#key').value, pick('kfmt')), data = bytesFrom($('#txt').value, pick('fmt'));
    const sel = $('#alg').value;
    const names = sel === 'ALL' ? Object.keys(ALGS) : [sel];
    const out = [];
    for (const n of names) {
      const h = await createHMAC(ALGS[n](), key);
      h.init(); h.update(data);
      out.push([n, h.digest('hex')]);
    }
    if (id !== job) return;
    results = out;
    msg($('#msg'), key.length ? '' : 'empty key', 'warn');
    kv($('#out'), out.flatMap(([n, h]) => [[`${n} hex`, h], [`${n} base64`, toB64(fromHex(h))]]));
    verify();
  } catch (e) { msg($('#msg'), e.message); $('#out').replaceChildren(); }
});
$('#expect').addEventListener('input', verify);
