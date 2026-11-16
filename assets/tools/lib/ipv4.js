// IPv4 maths on unsigned 32-bit integers. Pure functions (unit-tested in tests/).

export function parseIPv4(s) {
  const m = String(s).trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) throw new Error(`"${s}" is not an IPv4 address`);
  const o = m.slice(1).map(Number);
  if (o.some((x) => x > 255)) throw new Error('each part must be 0–255');
  return ((o[0] << 24) | (o[1] << 16) | (o[2] << 8) | o[3]) >>> 0;
}
export const toDotted = (n) => [24, 16, 8, 0].map((s) => (n >>> s) & 255).join('.');
export const maskFromPrefix = (p) => (p === 0 ? 0 : (0xffffffff << (32 - p)) >>> 0);
/** Prefix length of a contiguous mask, or -1. */
export function prefixFromMask(m) {
  m >>>= 0;
  const inv = ~m >>> 0;
  if ((inv & (inv + 1)) !== 0) return -1;
  let p = 0;
  while (p < 32 && ((m << p) & 0x80000000)) p++;
  return p;
}

/** "a.b.c.d/22", "a.b.c.d 255.255.252.0", "a.b.c.d/255.255.252.0", wildcard "0.0.3.255", or a bare address (/32). */
export function parseNet(input) {
  const s = String(input).trim().replace(/\s+/g, ' ');
  const m = s.match(/^([\d.]+)\s*(?:[/ ]\s*([\d.]+))?$/);
  if (!m) throw new Error('expected an address, optionally followed by /prefix or a mask');
  const ip = parseIPv4(m[1]);
  let prefix = 32, note = '';
  if (m[2] !== undefined) {
    if (/^\d{1,2}$/.test(m[2])) {
      prefix = Number(m[2]);
      if (prefix > 32) throw new Error('prefix must be 0–32');
    } else {
      const mask = parseIPv4(m[2]);
      prefix = prefixFromMask(mask);
      if (prefix < 0) {
        const w = prefixFromMask(~mask >>> 0);
        if (w < 0) throw new Error(`${m[2]} is not a contiguous mask`);
        prefix = w; note = 'read as a wildcard mask';
      }
    }
  }
  return { ip, prefix, note };
}

export function netInfo(ip, prefix) {
  const mask = maskFromPrefix(prefix);
  const network = (ip & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  const size = 2 ** (32 - prefix);
  let first = network, last = broadcast, hosts = size;
  if (prefix <= 30) { first = network + 1; last = broadcast - 1; hosts = size - 2; }
  return { ip, prefix, mask, wildcard: ~mask >>> 0, network, broadcast, first, last, hosts, size };
}

export function ipClass(n) {
  const a = n >>> 24;
  if (a < 128) return 'A';
  if (a < 192) return 'B';
  if (a < 224) return 'C';
  if (a < 240) return 'D (multicast)';
  return 'E (reserved)';
}

const RANGES = [
  ['0.0.0.0', 8, '"this network" (RFC 1122)'],
  ['10.0.0.0', 8, 'private (RFC 1918)'],
  ['100.64.0.0', 10, 'carrier-grade NAT (RFC 6598)'],
  ['127.0.0.0', 8, 'loopback'],
  ['169.254.0.0', 16, 'link-local / APIPA'],
  ['172.16.0.0', 12, 'private (RFC 1918)'],
  ['192.0.0.0', 24, 'IETF protocol assignments'],
  ['192.0.2.0', 24, 'documentation (TEST-NET-1)'],
  ['192.88.99.0', 24, '6to4 relay anycast (deprecated)'],
  ['192.168.0.0', 16, 'private (RFC 1918)'],
  ['198.18.0.0', 15, 'benchmarking (RFC 2544)'],
  ['198.51.100.0', 24, 'documentation (TEST-NET-2)'],
  ['203.0.113.0', 24, 'documentation (TEST-NET-3)'],
  ['224.0.0.0', 4, 'multicast'],
  ['255.255.255.255', 32, 'limited broadcast'],
  ['240.0.0.0', 4, 'reserved'],
].map(([a, p, name]) => [parseIPv4(a), p, name]);

/** Special-purpose range the address belongs to, or "public". */
export function ipType(n) {
  for (const [net, p, name] of RANGES) if (((n & maskFromPrefix(p)) >>> 0) === net) return name;
  return 'public';
}
export const isPublic = (n) => ipType(n) === 'public';

/** Split a network into subnets of `newPrefix`; returns at most `limit` of them. */
export function split(network, prefix, newPrefix, limit = 256) {
  const count = 2 ** (newPrefix - prefix);
  const step = 2 ** (32 - newPrefix);
  const out = [];
  for (let i = 0; i < Math.min(count, limit); i++) out.push(netInfo((network + i * step) >>> 0, newPrefix));
  return { count, subnets: out };
}

/** Reverse-DNS name. */
export const ptr = (n) => `${[0, 8, 16, 24].map((s) => (n >>> s) & 255).join('.')}.in-addr.arpa`;

/** Read an address written as dotted, decimal, 0xHEX or 32-bit binary. */
export function anyToIPv4(s) {
  const t = String(s).trim().replace(/[\s_]/g, '');
  if (/^(0b)?[01]{32}$/i.test(t.replace(/\./g, ''))) return parseInt(t.replace(/^0b/i, '').replace(/\./g, ''), 2) >>> 0;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(t)) return parseIPv4(t);
  if (/^0x[0-9a-f]{1,8}$/i.test(t)) return parseInt(t, 16) >>> 0;
  if (/^\d+$/.test(t) && Number(t) <= 0xffffffff) return Number(t) >>> 0;
  throw new Error('expected a dotted address, a 32-bit decimal, 0xHEX or 32-bit binary');
}
