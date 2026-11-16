// Punycode (RFC 3492) for IDN labels. Pure.
const BASE = 36, TMIN = 1, TMAX = 26, SKEW = 38, DAMP = 700, IBIAS = 72, IN = 128;
const adapt = (d, n, first) => {
  d = first ? Math.floor(d / DAMP) : d >> 1; d += Math.floor(d / n);
  let k = 0; while (d > ((BASE - TMIN) * TMAX) >> 1) { d = Math.floor(d / (BASE - TMIN)); k += BASE; }
  return k + Math.floor(((BASE - TMIN + 1) * d) / (d + SKEW));
};
const digit = (c) => (c - 48 < 10 ? c - 22 : c - 65 < 26 ? c - 65 : c - 97 < 26 ? c - 97 : BASE);
const char = (d) => d + 22 + 75 * (d < 26);

export function decode(s) {
  const out = []; let n = IN, i = 0, bias = IBIAS;
  const b = s.lastIndexOf('-');
  for (let j = 0; j < Math.max(b, 0); j++) out.push(s.charCodeAt(j));
  for (let p = b > 0 ? b + 1 : 0; p < s.length;) {
    const old = i;
    for (let w = 1, k = BASE; ; k += BASE) {
      if (p >= s.length) throw new Error('bad punycode');
      const d = digit(s.charCodeAt(p++));
      if (d >= BASE) throw new Error('bad punycode');
      i += d * w;
      const t = k <= bias ? TMIN : k >= bias + TMAX ? TMAX : k - bias;
      if (d < t) break;
      w *= BASE - t;
    }
    bias = adapt(i - old, out.length + 1, old === 0);
    n += Math.floor(i / (out.length + 1)); i %= out.length + 1;
    out.splice(i++, 0, n);
  }
  return String.fromCodePoint(...out);
}
export function encode(str) {
  const input = [...str].map((c) => c.codePointAt(0));
  let n = IN, delta = 0, bias = IBIAS, out = '';
  const basic = input.filter((c) => c < 128);
  out = String.fromCharCode(...basic);
  let h = basic.length;
  if (h) out += '-';
  while (h < input.length) {
    const m = Math.min(...input.filter((c) => c >= n));
    delta += (m - n) * (h + 1); n = m;
    for (const c of input) {
      if (c < n) delta++;
      if (c === n) {
        let q = delta;
        for (let k = BASE; ; k += BASE) {
          const t = k <= bias ? TMIN : k >= bias + TMAX ? TMAX : k - bias;
          if (q < t) break;
          out += String.fromCharCode(char(t + ((q - t) % (BASE - t)))); q = Math.floor((q - t) / (BASE - t));
        }
        out += String.fromCharCode(char(q)); bias = adapt(delta, h + 1, h === basic.length); delta = 0; h++;
      }
    }
    delta++; n++;
  }
  return out;
}
export const toUnicode = (d) => d.split('.').map((l) => (/^xn--/i.test(l) ? decode(l.slice(4).toLowerCase()) : l)).join('.');
export const toASCII = (d) => d.split('.').map((l) => (/[^\x00-\x7f]/.test(l) ? 'xn--' + encode(l.toLowerCase()) : l)).join('.');
