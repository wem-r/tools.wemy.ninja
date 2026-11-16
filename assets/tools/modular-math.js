import { $, kv, live, msg } from '../js/tk.js';
import { parseBig, gcd, lcm, egcd, modpow, modinv, mod, isProbablePrime, factor } from './lib/bigmath.js';

const s = (x) => x.toString();
const safe = (f) => { try { return f(); } catch (e) { return `— ${e.message}`; } };

live([$('#a'), $('#b'), $('#m')], () => {
  let a, b, m;
  try { a = parseBig($('#a').value); b = parseBig($('#b').value); m = $('#m').value.trim() ? parseBig($('#m').value) : null; msg($('#msg'), ''); }
  catch (e) { msg($('#msg'), e.message); $('#out').replaceChildren(); return; }
  const [g, x, y] = egcd(a, b);
  const rows = [
    ['gcd(a, b)', s(gcd(a, b))],
    ['lcm(a, b)', s(lcm(a, b))],
    ['Bézout', `${s(a)}·(${s(x)}) + ${s(b)}·(${s(y)}) = ${s(g)}`],
    ['a prime?', isProbablePrime(a) ? 'probably prime (Miller–Rabin)' : 'composite'],
    ['b prime?', isProbablePrime(b) ? 'probably prime (Miller–Rabin)' : 'composite'],
    ['a in hex', (a < 0n ? '-0x' : '0x') + (a < 0n ? -a : a).toString(16)],
    ['a bit length', s((a < 0n ? -a : a).toString(2).length)],
  ];
  if (m != null) {
    if (m <= 0n) rows.push(['m', '— the modulus must be positive']);
    else rows.push(
      ['a mod m', s(mod(a, m))],
      ['aᵇ mod m', safe(() => s(modpow(a, b, m)))],
      ['a⁻¹ mod m', safe(() => s(modinv(a, m)))],
      ['b⁻¹ mod m', safe(() => s(modinv(b, m)))],
    );
  }
  kv($('#out'), rows);
});

const doFactor = () => {
  let n;
  try { n = parseBig($('#f').value); } catch (e) { kv($('#fout'), [['error', e.message]]); return; }
  const t = performance.now();
  const { factors, done } = factor(n);
  const grouped = [];
  for (const p of factors) { const last = grouped.at(-1); if (last && last[0] === p) last[1]++; else grouped.push([p, 1]); }
  kv($('#fout'), [
    ['factors', grouped.map(([p, k]) => (k > 1 ? `${p}^${k}` : s(p))).join(' × ') || s(n)],
    ['status', done ? `complete · ${Math.round(performance.now() - t)} ms` : 'gave up: the last factor listed is composite (Pollard rho is for factors up to ~20 digits)'],
  ]);
};
$('#fgo').addEventListener('click', doFactor);
$('#f').addEventListener('keydown', (e) => e.key === 'Enter' && doFactor());
doFactor();
