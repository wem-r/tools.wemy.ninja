// Cipher Suite registry: every entry gets its group; samples for the crackers are built from real text.
import { CLASSICAL } from './classical.js';
import { ENCODINGS } from './encodings.js';
import { OTHER } from './other.js';
import { CORPUS } from './corpus.js';

const para = (i) => CORPUS.trim().split(/\n\s*\n/)[i].replace(/\s+/g, ' ');
const byId = (list, id) => list.find((c) => c.id === id);

// samples that only make sense as real ciphertexts
const vig = byId(CLASSICAL, 'vigenere'), sub = byId(CLASSICAL, 'substitution');
byId(OTHER, 'vigenere-crack').sample = vig.enc(para(2), { key: 'NINJA' });
byId(OTHER, 'vigenere-key-length').sample = vig.enc(para(2), { key: 'NINJA' });
byId(OTHER, 'kasiski').sample = vig.enc(para(2), { key: 'NINJA' }).replace(/[^A-Za-z]/g, '').toUpperCase();
byId(OTHER, 'mono-solver').sample = sub.enc(para(3), { key: 'QWERTYUIOPASDFGHJKLZXCVBNM' }).toLowerCase();
byId(OTHER, 'letter-frequency').sample = sub.enc(para(1), { key: 'QWERTYUIOPASDFGHJKLZXCVBNM' });
{
  const k = new TextEncoder().encode('WEM'), b = new TextEncoder().encode(para(5).slice(0, 360));
  byId(OTHER, 'xor-crack').sample = [...b].map((x, i) => (x ^ k[i % k.length]).toString(16).padStart(2, '0')).join('');
}
{
  let s = 'flag{peel-the-onion}';
  for (const how of ['b64', 'hex', 'b64', 'b64']) s = how === 'hex' ? [...new TextEncoder().encode(s)].map((x) => x.toString(16).padStart(2, '0')).join('') : btoa(s);
  byId(OTHER, 'base64-recursive').sample = s;
}

export const GROUPS = { classical: 'Classical', encodings: 'Encodings', other: 'Other' };
export const CIPHERS = [
  ...CLASSICAL.map((c) => ({ ...c, group: 'classical' })),
  ...ENCODINGS.map((c) => ({ ...c, group: 'encodings' })),
  ...OTHER.map((c) => ({ ...c, group: 'other' })),
];
export const get = (id) => CIPHERS.find((c) => c.id === id);
