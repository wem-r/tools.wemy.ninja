// MAC address parsing and formats. Pure functions.

/** Accepts aa:bb:cc:dd:ee:ff, AA-BB-…, aabb.ccdd.eeff, aabbccddeeff (and spaces). Returns 6 bytes. */
export function parseMac(s) {
  const h = String(s).trim().replace(/[\s:.\-]/g, '');
  if (!/^[0-9a-f]{12}$/i.test(h)) throw new Error('expected 12 hex digits (any of : - . as separators)');
  return Array.from({ length: 6 }, (_, i) => parseInt(h.slice(i * 2, i * 2 + 2), 16));
}
const hx = (b) => b.toString(16).padStart(2, '0');
export function formats(b) {
  const l = b.map(hx);
  const bare = l.join('');
  return {
    colon: l.join(':'),
    hyphen: l.join('-').toUpperCase(),
    cisco: `${bare.slice(0, 4)}.${bare.slice(4, 8)}.${bare.slice(8)}`,
    bare,
    upper: l.join(':').toUpperCase(),
  };
}
export const oui = (b) => b.slice(0, 3).map(hx).join('').toUpperCase();
export const isMulticast = (b) => (b[0] & 1) === 1;
export const isLocal = (b) => (b[0] & 2) === 2;

/** Modified EUI-64 interface id and the matching fe80:: link-local address. */
export function eui64(b) {
  const e = [b[0] ^ 2, b[1], b[2], 0xff, 0xfe, b[3], b[4], b[5]];
  const groups = [0, 2, 4, 6].map((i) => ((e[i] << 8) | e[i + 1]).toString(16));
  return { id: e.map(hx).join(':'), linkLocal: `fe80::${groups.join(':')}` };
}

/** Random unicast MAC. `prefix` = 3 fixed bytes (vendor OUI) or null for a locally administered address. */
export function randomMac(prefix, rnd = (n) => crypto.getRandomValues(new Uint8Array(n))) {
  const r = Array.from(rnd(6));
  if (prefix) return [...prefix.slice(0, 3), ...r.slice(3)];
  r[0] = (r[0] & 0xfc) | 0x02; // unicast + locally administered
  return r;
}
