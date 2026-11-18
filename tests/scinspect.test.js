import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBytes, parseBadchars, analyse, hexdump, toBase64 } from '../assets/tools/lib/scinspect.js';

test('parse any representation', () => {
  const want = [0x90, 0x90, 0x00, 0x41];
  assert.deepEqual([...parseBytes('\\x90\\x90\\x00\\x41')], want);
  assert.deepEqual([...parseBytes('90 90 00 41')], want);
  assert.deepEqual([...parseBytes('0x90, 0x90, 0x00, 0x41')], want);
  assert.deepEqual([...parseBytes('909000 41')], want);
  assert.deepEqual([...parseBytes('144, 144, 0, 65')], want);
  assert.deepEqual([...parseBytes('kJAAQQ==', 'base64')], want);
  // pure hex that is also valid base64 → treated as hex
  assert.deepEqual([...parseBytes('41414141')], [0x41, 0x41, 0x41, 0x41]);
});

test('bad-char analysis', () => {
  const b = parseBytes('\\xfc\\x48\\x00\\x0a\\x41\\xff');
  const a = analyse(b, parseBadchars('00 0a 0d'));
  assert.equal(a.length, 6);
  assert.equal(a.nulls, 1);
  assert.equal(a.clean, false);
  assert.deepEqual(a.badHits.map((h) => h.byte), [0x00, 0x0a]);
  assert.equal(a.badHits[0].offsets[0], 2);
  assert.ok(a.present[0xfc] && !a.present[0x01]);
  assert.ok(analyse(parseBytes('41 42 43'), parseBadchars('00')).clean);
});

test('hexdump + base64', () => {
  assert.match(hexdump(parseBytes('41424300ff')), /^00000000  41 42 43 00 ff\s+\|ABC\.\.\|$/);
  assert.equal(toBase64(parseBytes('90 90')), 'kJA=');
});
