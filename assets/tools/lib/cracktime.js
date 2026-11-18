// Password keyspace / crack-time estimator. Pure maths — no cracking happens.

export const SETS = [
  ['lower', 'a–z', 26],
  ['upper', 'A–Z', 26],
  ['digits', '0–9', 10],
  ['special', '!@#… (33)', 33],
  ['space', 'space', 1],
];
export const MASK_SIZES = { l: 26, u: 26, d: 10, s: 33, a: 95, b: 256, h: 16, H: 16 };

// H/s for one average attacker, by scenario. Rough but standard orders of magnitude.
export const SPEEDS = [
  ['Online, throttled', 100],
  ['Online, no throttle', 1e3],
  ['bcrypt (cost 10), 1 GPU', 7e4],
  ['sha512crypt, 1 GPU', 5e5],
  ['WPA2, 1 GPU', 1e6],
  ['NTLM / MD5, 1 GPU (RTX 4090)', 1e11],
  ['NTLM / MD5, 8-GPU rig', 8e11],
];

export function charsetSize(selected) {
  return SETS.filter(([id]) => selected.includes(id)).reduce((s, [, , n]) => s + n, 0);
}
export function maskKeyspace(mask) {
  let total = 1, tokens = 0;
  const re = /\?([ludsabhH])|./gy; let m;
  while ((m = re.exec(mask))) {
    if (m[1]) { total *= MASK_SIZES[m[1]]; tokens++; }
    else { total *= 1; tokens++; } // a literal position = 1 possibility
  }
  return { keyspace: total, tokens };
}

export const keyspace = (size, len) => Math.pow(size, len);
export const entropyBits = (ks) => (ks > 0 && isFinite(ks) ? Math.log2(ks) : Infinity);

export function human(seconds) {
  if (!isFinite(seconds)) return 'effectively forever';
  if (seconds < 1e-3) return '< 1 millisecond';
  if (seconds < 1) return (seconds * 1000).toFixed(0) + ' ms';
  const units = [['year', 31557600], ['day', 86400], ['hour', 3600], ['minute', 60], ['second', 1]];
  if (seconds > 31557600 * 1e6) {
    const y = seconds / 31557600;
    return y.toExponential(2).replace('e+', ' × 10^') + ' years';
  }
  for (const [name, s] of units) {
    if (seconds >= s) { const v = seconds / s; return `${v >= 100 ? Math.round(v).toLocaleString() : v.toFixed(1)} ${name}${v >= 1.5 ? 's' : ''}`; }
  }
  return '< 1 second';
}

// average time (half the keyspace) at each speed
export function times(ks) {
  return SPEEDS.map(([label, hs]) => [label, hs, human(ks / 2 / hs)]);
}
