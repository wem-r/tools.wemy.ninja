import ipaddr from 'ipaddr.js';
import { $, kv, live, msg } from '../js/tk.js';

const inp = $('#in');
const hex4 = (p) => p.map((x) => x.toString(16).padStart(4, '0'));
const RANGES = {
  unspecified: '::/128', loopback: '::1/128', ipv4Mapped: '::ffff:0:0/96 — IPv4-mapped', rfc6145: 'IPv4-translated (RFC 6145)',
  rfc6052: '64:ff9b::/96 — NAT64', '6to4': '2002::/16 — 6to4', teredo: '2001::/32 — Teredo', reserved: 'reserved / documentation',
  benchmarking: '2001:2::/48 — benchmarking', amt: '2001:3::/32 — AMT', as112v6: 'AS112', deprecated: 'deprecated',
  orchid2: '2001:20::/28 — ORCHIDv2', droneRemoteIdProtocolEntityTags: 'drone remote ID', uniqueLocal: 'fc00::/7 — unique local (private)',
  linkLocal: 'fe80::/10 — link-local', multicast: 'ff00::/8 — multicast', unicast: 'global unicast',
};

live(inp, () => {
  let a, prefix = null;
  const s = inp.value.trim();
  try {
    if (s.includes('/')) [a, prefix] = ipaddr.parseCIDR(s);
    else a = ipaddr.parse(s);
    if (a.kind() === 'ipv4') { a = a.toIPv4MappedAddress(); if (prefix != null) prefix += 96; }
    msg($('#msg'), '');
  } catch { msg($('#msg'), 'not a valid IPv6 (or IPv4) address'); $('#out').replaceChildren(); return; }
  const parts = a.parts;
  const full = hex4(parts).join(':');
  const rows = [
    ['compressed', a.toString()],
    ['expanded', full],
    ['type', RANGES[a.range()] || a.range()],
  ];
  if (a.isIPv4MappedAddress()) rows.push(['embedded IPv4', a.toIPv4Address().toString()]);
  if (prefix != null) {
    const bits = parts.map((p) => p.toString(2).padStart(16, '0')).join('');
    const net = bits.slice(0, prefix).padEnd(128, '0'), last = bits.slice(0, prefix).padEnd(128, '1');
    const toAddr = (b) => ipaddr.fromByteArray(b.match(/.{8}/g).map((x) => parseInt(x, 2)));
    const size = 2n ** BigInt(128 - prefix);
    rows.push(
      ['network', `${toAddr(net).toString()}/${prefix}`],
      ['first', toAddr(net).toString()],
      ['last', toAddr(last).toString()],
      ['addresses', prefix >= 64 ? size.toString() : `2^${128 - prefix}`, prefix <= 64 ? `${2n ** BigInt(64 - prefix)} × /64` : ''],
      ['netmask', ipaddr.IPv6.subnetMaskFromPrefixLength(prefix).toString()],
    );
  }
  rows.push(
    ['reverse DNS', [...full.replace(/:/g, '')].reverse().join('.') + '.ip6.arpa'],
    ['URL form', `[${a.toString()}]`],
    ['binary', parts.map((p) => p.toString(2).padStart(16, '0')).join(':')],
  );
  if (a.range() === 'linkLocal' || a.range() === 'unicast') {
    const iid = parts.slice(4);
    if ((iid[1] & 0xff) === 0xff && iid[2] >> 8 === 0xfe) {
      const b = [iid[0] >> 8 ^ 2, iid[0] & 255, iid[1] >> 8, iid[2] & 255, iid[3] >> 8, iid[3] & 255];
      rows.push(['MAC (from EUI-64)', b.map((x) => x.toString(16).padStart(2, '0')).join(':')]);
    }
  }
  kv($('#out'), rows);
});
