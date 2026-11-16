import { $, kv, live, msg, randInt } from '../js/tk.js';
import { anyToIPv4, toDotted, ipClass, ipType, ptr, isPublic } from './lib/ipv4.js';

const inp = $('#in');
const run = live(inp, () => {
  let n;
  try { n = anyToIPv4(inp.value); msg($('#msg'), ''); }
  catch (e) { msg($('#msg'), e.message); $('#out').replaceChildren(); return; }
  const o = [24, 16, 8, 0].map((s) => (n >>> s) & 255);
  kv($('#out'), [
    ['dotted', toDotted(n)],
    ['decimal', String(n)],
    ['hex', '0x' + n.toString(16).toUpperCase().padStart(8, '0'), o.map((x) => x.toString(16).padStart(2, '0')).join('.')],
    ['binary', o.map((x) => x.toString(2).padStart(8, '0')).join('.')],
    ['octal (dotted)', o.map((x) => '0' + x.toString(8)).join('.')],
    ['IPv6-mapped', `::ffff:${toDotted(n)}`, `::ffff:${(n >>> 16).toString(16)}:${(n & 0xffff).toString(16)}`],
    ['6to4 prefix', `2002:${(n >>> 16).toString(16).padStart(4, '0')}:${(n & 0xffff).toString(16).padStart(4, '0')}::/48`],
    ['reverse DNS', ptr(n)],
    ['type', ipType(n), `class ${ipClass(n)}`],
  ]);
});
$('#rnd').addEventListener('click', () => {
  let n;
  do n = (randInt(0x10000) * 0x10000 + randInt(0x10000)) >>> 0; while (!isPublic(n));
  inp.value = toDotted(n); run();
});
