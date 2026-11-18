// Cisco type 7 and Juniper $9$ are reversible "encryption" (obfuscation) on config files.
// Decode them, or encode a value to the same format. For auditing configs you are allowed to see.

const CKEY = 'dsfd;kfoA,.iyewrkldJKDHSUBsgvca69834ncxv9873254k;fg87';

export function cisco7Decode(enc) {
  enc = enc.trim().replace(/\s+/g, '');
  if (!/^\d{2}([0-9a-fA-F]{2})+$/.test(enc)) throw new Error('expected digits: a 2-digit seed then hex pairs');
  const seed = parseInt(enc.slice(0, 2), 10);
  let out = '';
  for (let i = 0; i * 2 + 2 < enc.length; i++) {
    const b = parseInt(enc.substr(2 + i * 2, 2), 16);
    out += String.fromCharCode(b ^ CKEY.charCodeAt((seed + i) % CKEY.length));
  }
  return out;
}
export function cisco7Encode(plain, seed = 2) {
  seed = ((seed % 16) + 16) % 16;
  let out = String(seed).padStart(2, '0');
  for (let i = 0; i < plain.length; i++) out += (plain.charCodeAt(i) ^ CKEY.charCodeAt((seed + i) % CKEY.length)).toString(16).padStart(2, '0').toUpperCase();
  return out;
}

// —— Juniper $9$ ——
const FAMILY = ['QzF3n6/9CAtpu0O', 'B1IREhcSyrleKvMW8LXx', '7N-dVbwsY2g4oaJZGUDj', 'iHkq.mPf5T'];
const EXTRA = {}; FAMILY.forEach((fam, i) => { for (const c of fam) EXTRA[c] = 3 - i; });
const NUM_ALPHA = FAMILY.join('').split('');
const ALPHA_NUM = {}; NUM_ALPHA.forEach((c, i) => { ALPHA_NUM[c] = i; });
const ENCODING = [[1, 4, 32], [1, 16, 32], [1, 8, 32], [1, 64], [1, 32], [1, 4, 16, 128], [1, 32, 64]];
const MOD = NUM_ALPHA.length; // 65
const randc = (n) => Array.from({ length: n }, () => NUM_ALPHA[Math.floor(Math.random() * MOD)]).join('');

function gapDecode(gaps, dec) { let num = 0; for (let i = 0; i < gaps.length; i++) num += gaps[i] * dec[i]; return num % 256; }
function gap(c1, c2) { return (((ALPHA_NUM[c2] - ALPHA_NUM[c1]) % MOD) + MOD - 1) % MOD; }

export function juniperDecode(crypt) {
  crypt = crypt.trim();
  const m = crypt.match(/^\$9\$(.+)$/); if (!m) throw new Error('expected a $9$… secret');
  let chars = [...m[1]];
  if (chars.some((c) => !(c in ALPHA_NUM))) throw new Error('contains characters not in the $9$ alphabet');
  const first = chars.shift();
  chars = chars.slice(EXTRA[first]);
  let prev = first, out = '';
  while (chars.length) {
    const dec = ENCODING[out.length % ENCODING.length];
    const nibble = chars.splice(0, dec.length);
    if (nibble.length < dec.length) break;
    const gaps = [];
    for (const n of nibble) { gaps.push(gap(prev, n)); prev = n; }
    out += String.fromCharCode(gapDecode(gaps, dec));
  }
  return out;
}

function gapEncode(val, dec) {
  const num = []; let v = val;
  const divs = dec.slice().reverse();
  for (const d of divs) { num.unshift(Math.floor(v / d)); v %= d; }
  return num;
}
export function juniperEncode(plain) {
  let prev = randc(1); let out = '$9$' + prev + randc(EXTRA[prev]);
  let pos = 0;
  for (const ch of plain) {
    const dec = ENCODING[pos % ENCODING.length];
    const gaps = gapEncode(ch.charCodeAt(0), dec);
    for (const g of gaps) {
      const ni = (ALPHA_NUM[prev] + g + 1) % MOD;
      const n = NUM_ALPHA[ni]; out += n; prev = n;
    }
    pos++;
  }
  return out;
}
