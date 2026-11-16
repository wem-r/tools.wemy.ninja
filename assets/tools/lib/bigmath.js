// Number theory on BigInt. Pure functions.

export const abs = (a) => (a < 0n ? -a : a);
export const mod = (a, m) => ((a % m) + m) % m;
export function gcd(a, b) { a = abs(a); b = abs(b); while (b) [a, b] = [b, a % b]; return a; }
export const lcm = (a, b) => (a === 0n || b === 0n ? 0n : abs(a * b) / gcd(a, b));

/** Extended Euclid: [g, x, y] with a·x + b·y = g. */
export function egcd(a, b) {
  let [r0, r1, s0, s1, t0, t1] = [a, b, 1n, 0n, 0n, 1n];
  while (r1) { const q = r0 / r1; [r0, r1] = [r1, r0 - q * r1]; [s0, s1] = [s1, s0 - q * s1]; [t0, t1] = [t1, t0 - q * t1]; }
  return r0 < 0n ? [-r0, -s0, -t0] : [r0, s0, t0];
}
export function modinv(a, m) {
  const [g, x] = egcd(mod(a, m), m);
  if (g !== 1n) throw new Error(`no inverse: gcd(a, m) = ${g}`);
  return mod(x, m);
}
export function modpow(b, e, m) {
  if (m === 1n) return 0n;
  if (e < 0n) { b = modinv(b, m); e = -e; }
  let r = 1n; b = mod(b, m);
  while (e > 0n) { if (e & 1n) r = (r * b) % m; e >>= 1n; b = (b * b) % m; }
  return r;
}

const SMALL = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n];
/** Miller–Rabin with the first 12 prime bases: deterministic below 3.3·10^24, probabilistic above. */
export function isProbablePrime(n) {
  if (n < 2n) return false;
  for (const p of SMALL) { if (n === p) return true; if (n % p === 0n) return false; }
  let d = n - 1n, s = 0n;
  while ((d & 1n) === 0n) { d >>= 1n; s++; }
  outer: for (const a of SMALL) {
    let x = modpow(a, d, n);
    if (x === 1n || x === n - 1n) continue;
    for (let i = 1n; i < s; i++) { x = (x * x) % n; if (x === n - 1n) continue outer; }
    return false;
  }
  return true;
}

function rho(n, maxSteps) {
  if (n % 2n === 0n) return 2n;
  for (let c = 1n; c < 6n; c++) {
    let x = 2n, y = 2n, d = 1n;
    const f = (v) => (v * v + c) % n;
    let steps = 0;
    while (d === 1n && steps++ < maxSteps) { x = f(x); y = f(f(y)); d = gcd(abs(x - y), n); }
    if (d !== 1n && d !== n) return d;
  }
  return null;
}
/** Prime factors (sorted, with repetition). `done` is false if Pollard rho gave up on a factor. */
export function factor(n, maxSteps = 200_000) {
  n = abs(n);
  const out = []; let done = true;
  if (n < 2n) return { factors: out, done };
  for (const p of SMALL) while (n % p === 0n) { out.push(p); n /= p; }
  const stack = n > 1n ? [n] : [];
  while (stack.length) {
    const m = stack.pop();
    if (isProbablePrime(m)) { out.push(m); continue; }
    const d = rho(m, maxSteps);
    if (!d) { out.push(m); done = false; continue; }
    stack.push(d, m / d);
  }
  out.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return { factors: out, done };
}

/** Parse decimal, 0x hex, 0b binary or 0o octal into a BigInt. */
export function parseBig(s) {
  const t = String(s).trim().replace(/[\s_]/g, '');
  if (!/^-?(0x[0-9a-f]+|0b[01]+|0o[0-7]+|\d+)$/i.test(t)) throw new Error(`"${s}" is not an integer`);
  return t.startsWith('-') ? -BigInt(t.slice(1)) : BigInt(t);
}
