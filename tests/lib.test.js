// Unit tests for the pure-logic modules in assets/tools/lib. Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as ip from '../assets/tools/lib/ipv4.js';
import * as mac from '../assets/tools/lib/mac.js';
import * as ck from '../assets/tools/lib/checksum.js';
import * as bm from '../assets/tools/lib/bigmath.js';
import * as uuid from '../assets/tools/lib/uuid.js';
import * as col from '../assets/tools/lib/colour.js';
import * as cron from '../assets/tools/lib/cron.js';
import { identify } from '../assets/tools/lib/hashid.js';
import { analyse } from '../assets/tools/lib/strength.js';
import * as tf from '../assets/tools/lib/timefmt.js';
import { parseEnv } from '../assets/tools/lib/env.js';

const bytes = (s) => new TextEncoder().encode(s);

test('ipv4: parse, masks, network info', () => {
  assert.equal(ip.toDotted(ip.parseIPv4('192.168.1.10')), '192.168.1.10');
  assert.throws(() => ip.parseIPv4('1.2.3.256'));
  assert.equal(ip.toDotted(ip.maskFromPrefix(22)), '255.255.252.0');
  assert.equal(ip.prefixFromMask(ip.parseIPv4('255.255.255.128')), 25);
  assert.equal(ip.prefixFromMask(ip.parseIPv4('255.0.255.0')), -1);
  const n = ip.netInfo(ip.parseIPv4('10.20.30.40'), 22);
  assert.equal(ip.toDotted(n.network), '10.20.28.0');
  assert.equal(ip.toDotted(n.broadcast), '10.20.31.255');
  assert.equal(n.hosts, 1022);
  assert.equal(ip.netInfo(0, 31).hosts, 2);
  assert.equal(ip.netInfo(ip.parseIPv4('8.8.8.8'), 0).hosts, 2 ** 32 - 2);
});
test('ipv4: input forms', () => {
  assert.equal(ip.parseNet('10.0.0.1 255.255.255.0').prefix, 24);
  assert.equal(ip.parseNet('10.0.0.1/255.255.0.0').prefix, 16);
  const w = ip.parseNet('10.0.0.1 0.0.0.255');
  assert.equal(w.prefix, 24); assert.match(w.note, /wildcard/);
  assert.equal(ip.parseNet('10.0.0.1').prefix, 32);
  assert.equal(ip.anyToIPv4('3232235777'), ip.parseIPv4('192.168.1.1'));
  assert.equal(ip.anyToIPv4('0xC0A80101'), ip.parseIPv4('192.168.1.1'));
  assert.equal(ip.anyToIPv4('11000000.10101000.00000001.00000001'), ip.parseIPv4('192.168.1.1'));
});
test('ipv4: types, split, ptr', () => {
  assert.equal(ip.ipType(ip.parseIPv4('172.31.0.1')), 'private (RFC 1918)');
  assert.equal(ip.ipType(ip.parseIPv4('172.32.0.1')), 'public');
  assert.equal(ip.ipType(ip.parseIPv4('100.100.1.1')), 'carrier-grade NAT (RFC 6598)');
  assert.equal(ip.ipType(ip.parseIPv4('255.255.255.255')), 'limited broadcast');
  const s = ip.split(ip.parseIPv4('192.168.0.0'), 24, 26);
  assert.equal(s.count, 4);
  assert.equal(ip.toDotted(s.subnets[3].network), '192.168.0.192');
  assert.equal(ip.ptr(ip.parseIPv4('1.2.3.4')), '4.3.2.1.in-addr.arpa');
});

test('mac', () => {
  const b = mac.parseMac('00-1A-2b.3c:4d5e');
  assert.equal(mac.formats(b).colon, '00:1a:2b:3c:4d:5e');
  assert.equal(mac.formats(b).cisco, '001a.2b3c.4d5e');
  assert.equal(mac.oui(b), '001A2B');
  assert.equal(mac.eui64(mac.parseMac('00:1a:2b:3c:4d:5e')).linkLocal, 'fe80::21a:2bff:fe3c:4d5e');
  const r = mac.randomMac(null);
  assert.ok(mac.isLocal(r) && !mac.isMulticast(r));
  assert.throws(() => mac.parseMac('00:11:22'));
});

test('checksums: catalogue check values for "123456789"', () => {
  const v = bytes('123456789');
  const want = {
    'CRC-8/SMBUS': 0xf4, 'CRC-8/MAXIM-DOW': 0xa1, 'CRC-16/ARC': 0xbb3d, 'CRC-16/CCITT-FALSE': 0x29b1,
    'CRC-16/XMODEM': 0x31c3, 'CRC-16/KERMIT': 0x2189, 'CRC-16/MODBUS': 0x4b37,
    'CRC-32': 0xcbf43926, 'CRC-32C': 0xe3069283, 'CRC-32/BZIP2': 0xfc891918,
  };
  for (const [n, p] of Object.entries(ck.CRCS)) assert.equal(ck.crc(v, p), want[n], n);
  assert.equal(ck.adler32(bytes('Wikipedia')), 0x11e60398);
  assert.equal(ck.fletcher16(bytes('abcde')), 0xc8f0);
});

test('bigmath', () => {
  assert.equal(bm.gcd(462n, 1071n), 21n);
  assert.equal(bm.lcm(4n, 6n), 12n);
  assert.equal(bm.modpow(4n, 13n, 497n), 445n);
  assert.equal(bm.modinv(3n, 11n), 4n);
  assert.throws(() => bm.modinv(6n, 9n));
  assert.ok(bm.isProbablePrime(2n ** 127n - 1n));
  assert.ok(!bm.isProbablePrime(561n)); // Carmichael
  assert.deepEqual(bm.factor(600851475143n).factors, [71n, 839n, 1471n, 6857n]);
  assert.deepEqual(bm.factor(10403n).factors, [101n, 103n]);
  assert.equal(bm.parseBig('0xff'), 255n);
  assert.equal(bm.parseBig('-1_000'), -1000n);
});

test('uuid', () => {
  const a = uuid.v4();
  assert.match(a, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  const b = uuid.v7(1700000000000);
  const p = uuid.parse(b);
  assert.equal(p.version, 7);
  assert.equal(p.time.getTime(), 1700000000000);
  const v1 = uuid.parse('c232ab00-9414-11ec-b3c8-9f6bdeced846'); // RFC 9562 test vector
  assert.equal(v1.version, 1);
  assert.equal(v1.time.toISOString(), '2022-02-22T19:22:22.000Z');
  assert.equal(uuid.parse('{C232AB00-9414-11EC-B3C8-9F6BDECED846}').canonical, 'c232ab00-9414-11ec-b3c8-9f6bdeced846');
  const v6 = uuid.parse('1ec9414c-232a-6b00-b3c8-9f6bdeced846');
  assert.equal(v6.time.toISOString(), '2022-02-22T19:22:22.000Z');
});

test('colour', () => {
  assert.deepEqual(col.parseColour('#5bbfa1'), { r: 91, g: 191, b: 161, a: 1 });
  assert.deepEqual(col.parseColour('#fff'), { r: 255, g: 255, b: 255, a: 1 });
  assert.deepEqual(col.parseColour('rgb(10 20 30 / 50%)'), { r: 10, g: 20, b: 30, a: 0.5 });
  assert.deepEqual(col.parseColour('hsl(0, 100%, 50%)'), { r: 255, g: 0, b: 0, a: 1 });
  assert.deepEqual(col.rgbToHsl({ r: 255, g: 0, b: 0 }), { h: 0, s: 100, l: 50 });
  assert.deepEqual(col.rgbToCmyk({ r: 0, g: 0, b: 0 }), { c: 0, m: 0, y: 0, k: 100 });
  assert.equal(col.contrast({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }).toFixed(1), '21.0');
  assert.equal(col.toHex({ r: 4, g: 15, b: 30 }), '#040f1e');
});

test('cron', () => {
  const from = new Date(2026, 0, 1, 10, 30); // Thu 1 Jan 2026 10:30 local
  assert.deepEqual(cron.nextRuns('*/15 * * * *', 3, from).map((d) => d.getMinutes()), [45, 0, 15]);
  const wk = cron.nextRuns('0 9 * * mon-fri', 2, from);
  assert.deepEqual(wk.map((d) => [d.getDate(), d.getHours()]), [[2, 9], [5, 9]]);
  const or = cron.nextRuns('0 0 13 * 5', 3, from); // 13th OR Friday
  assert.deepEqual(or.map((d) => d.getDate()), [2, 9, 13]);
  assert.equal(cron.nextRuns('@yearly', 1, from)[0].getFullYear(), 2027);
  assert.equal(cron.nextRuns('0 0 29 2 *', 1, from)[0].getFullYear(), 2028);
  assert.throws(() => cron.parseCron('61 * * * *'));
  assert.throws(() => cron.parseCron('* * *'));
});

test('hash identifier', () => {
  const first = (s) => identify(s)[0]?.name;
  assert.equal(first('5f4dcc3b5aa765d61d8327deb882cf99'), 'MD5');
  assert.equal(first('$2y$10$abcdefghijklmnopqrstuuVwQ1Yw4bA3Y1g1y2sWg3m2kq9bE4b5C'), 'bcrypt');
  assert.equal(first('$6$saltsalt$' + 'a'.repeat(86)), 'sha512crypt (Unix $6$)');
  assert.equal(first('*' + 'A'.repeat(40)), 'MySQL 4.1+ (mysql_native_password)');
  assert.equal(identify('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')[0].hashcat, 1400);
  assert.deepEqual(identify(''), []);
});

test('password strength', () => {
  assert.equal(analyse('password').label, 'very weak');
  assert.equal(analyse('P@ssw0rd!').label, 'very weak');
  assert.ok(analyse('correct horse battery staple').bits >= 80);
  assert.ok(analyse('qwerty123').issues.includes('keyboard walk'));
});

test('timestamps', () => {
  assert.equal(tf.readNumber('1700000000').unit, 's');
  assert.equal(tf.readNumber('1700000000000').unit, 'ms');
  assert.equal(tf.readNumber('1700000000000000').unit, 'us');
  assert.equal(tf.readNumber('133444736000000000').unit, 'filetime');
  assert.equal(tf.readNumber('1700000000000000000').unit, 'ns');
  assert.equal(new Date(tf.readNumber('116444736000000000').ms).getTime(), 0);
  assert.equal(tf.toFiletime(0), 116444736000000000n);
  assert.equal(tf.relative(0, 3 * 864e5), '3 days ago');
  assert.equal(tf.parseTime('2024-02-29T12:00:00Z').ms, Date.UTC(2024, 1, 29, 12));
});

test('env parser', () => {
  const r = parseEnv('# c\nA=1\nexport B="x\\ny" # note\nC=${A}-$B\nD=\'$A\'\nbad line\nE="multi\nline"\nA=2\n');
  const m = Object.fromEntries(r.vars.map((v) => [v.key, v.value]));
  assert.equal(m.B, 'x\ny');
  assert.equal(m.C, '1-x\ny');
  assert.equal(m.D, '$A');
  assert.equal(m.E, 'multi\nline');
  assert.equal(r.errors.length, 1);
  assert.ok(r.dupes.has('A'));
});

import * as puny from '../assets/tools/lib/punycode.js';
import { checkEmail, checkDomain } from '../assets/tools/lib/validate.js';
test('punycode', () => {
  assert.equal(puny.toASCII('münchen.de'), 'xn--mnchen-3ya.de');
  assert.equal(puny.toASCII('bücher.example'), 'xn--bcher-kva.example');
  assert.equal(puny.toUnicode('xn--mnchen-3ya.de'), 'münchen.de');
  assert.equal(puny.toUnicode('xn--fiqs8s.cn'), '中国.cn');
  assert.equal(puny.toASCII('中国.cn'), 'xn--fiqs8s.cn');
});
test('validators', () => {
  for (const ok of ['wem@wemy.ninja', 'first.last+tag@sub.example.co.uk', '"quoted local"@example.com', 'user@münchen.de', 'user@[192.168.1.1]'])
    assert.ok(checkEmail(ok).ok, ok);
  for (const bad of ['bad..dots@example.com', 'no-at-sign.example.com', 'a@b', '.a@example.com', 'a@-x.com'])
    assert.ok(!checkEmail(bad).ok, bad);
  assert.ok(checkDomain('tools.wemy.ninja').ok);
  assert.ok(!checkDomain('-starts-with-hyphen.com').ok);
  assert.ok(!checkDomain('a'.repeat(64) + '.com').ok);
  assert.ok(!checkDomain('example.123').ok);
});

import { jsonError } from '../assets/tools/lib/jsonerr.js';
test('json error locator', () => {
  assert.equal(jsonError('{"a": [1, 2]}'), null);
  assert.deepEqual(jsonError('{"a": 1,\n  "b": [1, 2,]\n}'), { pos: 22, line: 2, col: 14, msg: 'trailing comma before ]' });
  assert.equal(jsonError("{'a': 1}").msg, 'keys need double quotes');
  assert.equal(jsonError('[1] x').msg, 'unexpected "x" after the end of the value');
  assert.equal(jsonError('"\\q"').msg, 'bad escape \\q');
  for (const ok of ['0', '-1.5e3', '"\\u00e9"', '[]', '{}', ' null ', '[true,false]']) assert.equal(jsonError(ok), null, ok);
  for (const bad of ['01', '1.', '[1,]', '{"a"}', '', 'tru', '"abc']) assert.ok(jsonError(bad), bad);
});
