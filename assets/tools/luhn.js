import { $, kv, live, msg } from '../js/tk.js';
import { digitsOf, luhnValid, luhnDigit, cardNetwork, generateCard, groupCard } from './lib/checkdigits.js';

live($('#in'), () => {
  const d = digitsOf($('#in').value);
  if (!d) { msg($('#msg'), ''); $('#out').replaceChildren(); return; }
  if (!/^\d+$/.test(d)) { msg($('#msg'), 'digits only (spaces and dashes are fine)'); $('#out').replaceChildren(); return; }
  const ok = luhnValid(d), net = cardNetwork(d);
  msg($('#msg'), ok ? '✓ passes the Luhn check' : `✗ fails the Luhn check — last digit should be ${luhnDigit(d.slice(0, -1))}`, ok ? 'ok' : 'err');
  kv($('#out'), [
    ['digits', String(d.length)],
    ['check digit', d.slice(-1), `expected ${luhnDigit(d.slice(0, -1))}`],
    ['next digit to append', luhnDigit(d), 'to make this number valid as a prefix'],
    net && ['card network', net.name, net.lengthOk ? '' : `unusual length — ${net.name} uses ${net.lengths.join(' / ')} digits`],
    net && ['grouped', groupCard(d)],
    d.length >= 6 && ['IIN / BIN', d.slice(0, Math.min(8, d.length - 1)), 'issuer identification number'],
  ]);
});
$('#gen').addEventListener('click', () => {
  const n = Math.max(1, Math.min(100, +$('#n').value || 5));
  kv($('#gout'), Array.from({ length: n }, (_, i) => { const c = generateCard($('#net').value, (k) => crypto.getRandomValues(new Uint8Array(1))[0] % k); return [String(i + 1), groupCard(c)]; }));
});
