// Check digits: Luhn / card networks, IBAN (ISO 13616), ISBN, ISSN, IMEI. Pure.

export const digitsOf = (s) => String(s).replace(/[\s-]/g, '');

export function luhnSum(d) {
  let sum = 0;
  for (let i = d.length - 1, dbl = false; i >= 0; i--, dbl = !dbl) {
    let x = +d[i];
    if (dbl) { x *= 2; if (x > 9) x -= 9; }
    sum += x;
  }
  return sum;
}
export const luhnValid = (s) => { const d = digitsOf(s); return /^\d{2,}$/.test(d) && luhnSum(d) % 10 === 0; };
export const luhnDigit = (s) => { const d = digitsOf(s); return String((10 - (luhnSum(d + '0') % 10)) % 10); };

// [name, prefix test, lengths]
const NETS = [
  ['American Express', (p) => /^3[47]/.test(p), [15]],
  ['Diners Club', (p) => /^3(0[0-5]|095|[689])/.test(p), [14, 16, 17, 18, 19]],
  ['JCB', (p) => { const n = +p.slice(0, 4); return n >= 3528 && n <= 3589; }, [16, 17, 18, 19]],
  ['Mir', (p) => /^220[0-4]/.test(p), [16, 17, 18, 19]],
  ['UnionPay', (p) => /^62/.test(p), [16, 17, 18, 19]],
  ['Mastercard', (p) => /^5[1-5]/.test(p) || (+p.slice(0, 6) >= 222100 && +p.slice(0, 6) <= 272099), [16]],
  ['Maestro', (p) => /^(5018|5020|5038|5893|6304|6759|676[1-3])/.test(p), [12, 13, 14, 15, 16, 17, 18, 19]],
  ['Discover', (p) => /^(6011|64[4-9]|65)/.test(p) || (+p.slice(0, 6) >= 622126 && +p.slice(0, 6) <= 622925), [16, 17, 18, 19]],
  ['Visa', (p) => /^4/.test(p), [13, 16, 19]],
  ['Verve', (p) => /^(50(6099|6198)|650002)/.test(p), [16, 18, 19]],
  ['RuPay', (p) => /^(60|65|81|82|508)/.test(p), [16]],
];
export function cardNetwork(s) {
  const d = digitsOf(s);
  const n = NETS.find(([, t]) => t(d));
  return n ? { name: n[0], lengthOk: n[2].includes(d.length), lengths: n[2] } : null;
}
export const NETWORK_PREFIX = { Visa: '4', Mastercard: '51', 'American Express': '37', Discover: '6011', JCB: '3530', 'Diners Club': '36', UnionPay: '62', Maestro: '6759' };
const NET_LEN = { 'American Express': 15, 'Diners Club': 14 };

/** Test number for a network (passes Luhn; not a real account). */
export function generateCard(network, rnd = (n) => Math.floor(Math.random() * n)) {
  const prefix = NETWORK_PREFIX[network] || '4';
  const len = NET_LEN[network] || 16;
  let d = prefix;
  while (d.length < len - 1) d += rnd(10);
  return d + luhnDigit(d);
}
export const groupCard = (d) => (d.length === 15 ? d.replace(/^(\d{4})(\d{6})(\d{5})$/, '$1 $2 $3') : d.replace(/(\d{4})(?=\d)/g, '$1 '));

// ---------- IBAN ----------
export const IBAN_LEN = {
  AD: 24, AE: 23, AL: 28, AT: 20, AZ: 28, BA: 20, BE: 16, BG: 22, BH: 22, BI: 27, BR: 29, BY: 28, CH: 21, CR: 22, CY: 28, CZ: 24, DE: 22, DJ: 27,
  DK: 18, DO: 28, EE: 20, EG: 29, ES: 24, FI: 18, FK: 18, FO: 18, FR: 27, GB: 22, GE: 22, GI: 23, GL: 18, GR: 27, GT: 28, HN: 28, HR: 21, HU: 28, IE: 22,
  IL: 23, IQ: 23, IS: 26, IT: 27, JO: 30, KW: 30, KZ: 20, LB: 28, LC: 32, LI: 21, LT: 20, LU: 20, LV: 21, LY: 25, MC: 27, MD: 24, ME: 22, MK: 19, MN: 20,
  MR: 27, MT: 31, MU: 30, NI: 28, NL: 18, NO: 15, OM: 23, PK: 24, PL: 28, PS: 29, PT: 25, QA: 29, RO: 24, RS: 22, RU: 33, SA: 24, SC: 31, SD: 18, SE: 24,
  SI: 19, SK: 24, SM: 27, SO: 23, ST: 25, SV: 28, TL: 23, TN: 24, TR: 26, UA: 29, VA: 22, VG: 24, XK: 20, YE: 30,
};
// Bank / branch code positions in the BBAN for common countries: [bankLen, branchLen]
const BBAN_PARTS = { FR: [5, 5], DE: [8, 0], GB: [4, 6], ES: [4, 4], IT: [6, 5], NL: [4, 0], BE: [3, 0], CH: [5, 0], AT: [5, 0], PT: [4, 4], LU: [3, 0], IE: [4, 6], MC: [5, 5], PL: [3, 5] };

export function mod97(str) {
  let r = 0;
  for (let i = 0; i < str.length; i += 7) r = Number(String(r) + str.slice(i, i + 7)) % 97;
  return r;
}
const toDigits = (s) => s.toUpperCase().replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));

export function checkIBAN(input) {
  const s = String(input).replace(/^IBAN/i, '').replace(/[\s-]/g, '').toUpperCase();
  const res = { iban: s, valid: false, errors: [], country: s.slice(0, 2), check: s.slice(2, 4), bban: s.slice(4) };
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(s)) { res.errors.push('expected 2 letters, 2 digits, then letters/digits'); return res; }
  const len = IBAN_LEN[res.country];
  if (!len) res.errors.push(`${res.country} is not an IBAN country`);
  else if (s.length !== len) res.errors.push(`${res.country} IBANs have ${len} characters, this one has ${s.length}`);
  const rem = mod97(toDigits(s.slice(4) + s.slice(0, 4)));
  if (rem !== 1) res.errors.push(`check digits wrong (mod 97 = ${rem}, should be 1)`);
  const p = BBAN_PARTS[res.country];
  if (p) { res.bank = res.bban.slice(0, p[0]); if (p[1]) res.branch = res.bban.slice(p[0], p[0] + p[1]); }
  res.expectedCheck = String(98 - mod97(toDigits(s.slice(4) + s.slice(0, 2) + '00'))).padStart(2, '0');
  res.valid = !res.errors.length;
  res.formatted = s.replace(/(.{4})(?=.)/g, '$1 ');
  return res;
}

// ---------- ISBN / ISSN / IMEI ----------
export function isbn10Check(d9) { let s = 0; for (let i = 0; i < 9; i++) s += (10 - i) * +d9[i]; const c = (11 - (s % 11)) % 11; return c === 10 ? 'X' : String(c); }
export function isbn13Check(d12) { let s = 0; for (let i = 0; i < 12; i++) s += +d12[i] * (i % 2 ? 3 : 1); return String((10 - (s % 10)) % 10); }
export function checkISBN(input) {
  const s = String(input).replace(/^ISBN(-1[03])?:?\s*/i, '').replace(/[\s-]/g, '').toUpperCase();
  if (/^\d{9}[\dX]$/.test(s)) {
    const ok = isbn10Check(s.slice(0, 9)) === s[9];
    const to13 = '978' + s.slice(0, 9);
    return { kind: 'ISBN-10', valid: ok, expected: isbn10Check(s.slice(0, 9)), converted: to13 + isbn13Check(to13) };
  }
  if (/^\d{13}$/.test(s)) {
    const ok = isbn13Check(s.slice(0, 12)) === s[12];
    const conv = s.startsWith('978') ? s.slice(3, 12) + isbn10Check(s.slice(3, 12)) : null;
    return { kind: /^97[89]/.test(s) ? 'ISBN-13' : 'EAN-13', valid: ok, expected: isbn13Check(s.slice(0, 12)), converted: conv };
  }
  return null;
}
export function issnCheck(d7) { let s = 0; for (let i = 0; i < 7; i++) s += (8 - i) * +d7[i]; const c = (11 - (s % 11)) % 11; return c === 10 ? 'X' : String(c); }
export function checkISSN(input) {
  const s = String(input).replace(/^ISSN:?\s*/i, '').replace(/[\s-]/g, '').toUpperCase();
  if (!/^\d{7}[\dX]$/.test(s)) return null;
  return { kind: 'ISSN', valid: issnCheck(s.slice(0, 7)) === s[7], expected: issnCheck(s.slice(0, 7)), formatted: `${s.slice(0, 4)}-${s.slice(4)}` };
}
export function checkIMEI(input) {
  const s = digitsOf(String(input).replace(/^IMEI:?\s*/i, ''));
  if (/^\d{15}$/.test(s)) return { kind: 'IMEI', valid: luhnValid(s), expected: luhnDigit(s.slice(0, 14)), tac: s.slice(0, 8), serial: s.slice(8, 14) };
  if (/^\d{16}$/.test(s)) return { kind: 'IMEISV', valid: null, tac: s.slice(0, 8), serial: s.slice(8, 14), sv: s.slice(14) };
  if (/^\d{14}$/.test(s)) return { kind: 'IMEI without check digit', valid: null, expected: luhnDigit(s), tac: s.slice(0, 8), serial: s.slice(8, 14) };
  return null;
}
