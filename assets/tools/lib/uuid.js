// UUID generation and parsing (RFC 9562). Pure functions; randomness is injectable for tests.

const rnd = (n) => crypto.getRandomValues(new Uint8Array(n));
const hex = (b) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
export const fmt = (b) => { const h = hex(b); return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`; };

export function v4(r = rnd) {
  const b = r(16);
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  return fmt(b);
}
export function v7(now = Date.now(), r = rnd) {
  const b = r(16);
  let t = BigInt(now);
  for (let i = 5; i >= 0; i--) { b[i] = Number(t & 0xffn); t >>= 8n; }
  b[6] = (b[6] & 0x0f) | 0x70; b[8] = (b[8] & 0x3f) | 0x80;
  return fmt(b);
}
export const NIL = '00000000-0000-0000-0000-000000000000';
export const MAX = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

/** Parse any UUID; returns { canonical, version, variant, time? (Date for v1/v6/v7), node? } */
export function parse(s) {
  const h = String(s).trim().replace(/^urn:uuid:/i, '').replace(/[{}\-\s]/g, '').toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(h)) throw new Error('expected 32 hex digits (dashes, braces and urn:uuid: are fine)');
  const b = Uint8Array.from(h.match(/../g), (x) => parseInt(x, 16));
  const canonical = fmt(b);
  if (canonical === NIL) return { canonical, version: 'nil', variant: '—' };
  if (canonical === MAX) return { canonical, version: 'max', variant: '—' };
  const version = b[6] >> 4;
  const v = b[8] >> 4;
  const variant = v < 8 ? 'NCS (reserved)' : v < 12 ? 'RFC 9562' : v < 14 ? 'Microsoft (reserved)' : 'future (reserved)';
  const out = { canonical, version, variant };
  if (variant !== 'RFC 9562') return out;
  // Gregorian 100-ns ticks since 1582-10-15 → Unix ms
  const greg = (ticks) => new Date(Number((ticks - 122192928000000000n) / 10000n));
  if (version === 1) {
    const lo = BigInt('0x' + h.slice(0, 8)), mid = BigInt('0x' + h.slice(8, 12)), hi = BigInt('0x' + h.slice(13, 16));
    out.time = greg((hi << 48n) | (mid << 32n) | lo);
  } else if (version === 6) {
    out.time = greg((BigInt('0x' + h.slice(0, 12)) << 12n) | BigInt('0x' + h.slice(13, 16)));
  } else if (version === 7) {
    out.time = new Date(Number(BigInt('0x' + h.slice(0, 12))));
  }
  if (version === 1 || version === 6) {
    out.node = h.slice(20).match(/../g).join(':');
    out.clockSeq = parseInt(h.slice(16, 20), 16) & 0x3fff;
  }
  return out;
}

export const NAMES = { 1: 'time-based (Gregorian, MAC)', 2: 'DCE security', 3: 'name-based MD5', 4: 'random',
  5: 'name-based SHA-1', 6: 'reordered time', 7: 'Unix-time ordered', 8: 'custom' };
