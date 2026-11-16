import { $, el, kv, live, msg, fmtInt } from '../js/tk.js';
import { parseNet, netInfo, toDotted, ipClass, ipType, split } from './lib/ipv4.js';

const inp = $('#in'), np = $('#np');
const bin = (n) => n.toString(2).padStart(32, '0').replace(/(.{8})(?!$)/g, '$1.');

live([inp, np], () => {
  let net;
  try { net = parseNet(inp.value); msg($('#msg'), net.note, 'warn'); }
  catch (e) { msg($('#msg'), e.message); $('#out').replaceChildren(); $('#subs').replaceChildren(); $('#cnt').textContent = ''; return; }
  const n = netInfo(net.ip, net.prefix);
  kv($('#out'), [
    ['address', toDotted(n.ip), `${ipType(n.ip)} · class ${ipClass(n.ip)}`],
    ['network', `${toDotted(n.network)}/${n.prefix}`],
    ['netmask', toDotted(n.mask), `/${n.prefix}`],
    ['wildcard', toDotted(n.wildcard)],
    ['broadcast', n.prefix < 31 ? toDotted(n.broadcast) : '—', n.prefix === 31 ? 'point-to-point link (RFC 3021)' : ''],
    ['host range', `${toDotted(n.first)} – ${toDotted(n.last)}`],
    ['usable hosts', fmtInt(n.hosts), n.prefix < 31 ? `of ${fmtInt(n.size)} addresses` : ''],
    ['binary mask', bin(n.mask)],
    ['binary address', bin(n.ip)],
  ]);
  if (+np.value <= n.prefix) np.value = Math.min(32, n.prefix + 2);
  const p = Math.max(n.prefix, Math.min(32, +np.value || 32));
  const { count, subnets } = split(n.network, n.prefix, p);
  $('#cnt').textContent = `${fmtInt(count)} subnet${count === 1 ? '' : 's'} of ${fmtInt(subnets[0].hosts)} hosts${count > subnets.length ? ` — first ${subnets.length} shown` : ''}`;
  $('#subs').replaceChildren(
    el('tr', {}, ...['#', 'network', 'host range', 'broadcast'].map((h) => el('th', { text: h }))),
    ...subnets.map((s, i) => el('tr', {},
      el('td', { class: 'dim', text: i }), el('td', { text: `${toDotted(s.network)}/${p}` }),
      el('td', { text: `${toDotted(s.first)} – ${toDotted(s.last)}` }), el('td', { text: p < 31 ? toDotted(s.broadcast) : '—' }))),
  );
});
