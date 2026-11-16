// Cipher Suite: known test vectors and a round trip for every reversible entry. Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CIPHERS, get } from '../assets/tools/lib/ciphers/index.js';

const defaults = (c) => Object.fromEntries(c.params.map((p) => [p.id, p.def]));
const run = (id, mode, text, extra = {}) => { const c = get(id); return c[mode](text, { ...defaults(c), ...extra }); };

test('registry: unique ids, counts per group', () => {
  const ids = CIPHERS.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  const n = (g) => CIPHERS.filter((c) => c.group === g).length;
  assert.equal(n('classical'), 53);
  assert.equal(n('encodings'), 45);
  assert.ok(n('other') >= 28);
});

test('known vectors: classical', () => {
  assert.equal(run('caesar', 'enc', 'Attack at dawn!'), 'Dwwdfn dw gdzq!');
  assert.equal(run('vigenere', 'enc', 'ATTACKATDAWN', { key: 'LEMON' }), 'LXFOPVEFRNHR');
  assert.equal(run('atbash', 'enc', 'wizard'), 'draziw');
  assert.equal(run('affine', 'enc', 'AFFINECIPHER', { a: 5, b: 8 }), 'IHHWVCSWFRCP');
  assert.equal(run('rail-fence', 'enc', 'WEAREDISCOVEREDFLEEATONCE', { rails: 3 }), 'WECRLTEERDSOEEFEAOCAIVDEN');
  assert.equal(run('playfair', 'enc', 'Hide the gold in the tree stump', { key: 'playfair example' }).replace(/ /g, ''), 'BMODZBXDNABEKUDMUIXMMOUVIF');
  assert.equal(run('beaufort', 'enc', 'DEFENDTHEEASTWALLOFTHECASTLE', { key: 'FORTIFICATION' }), 'CKMPVCPVWPIWUJOGIUAPVWRIWUUK');
  assert.equal(run('autokey', 'enc', 'ATTACKATDAWN', { key: 'QUEENLY' }), 'QNXEPVYTWTWP');
  assert.equal(run('columnar', 'enc', 'WEAREDISCOVEREDFLEEATONCE', { key: 'ZEBRAS', pad: 'X' }), 'EVLNXACDTXESEAXROFOXDEECXWIREE');
  assert.equal(run('hill', 'enc', 'ACT', { n: '3', key: 'GYBNQKURP' }), 'POH');
  assert.equal(run('enigma', 'enc', 'AAAAA', { plug: '', r1: 'I', r2: 'II', r3: 'III', refl: 'B', rings: 'AAA', pos: 'AAA' }), 'BDZGO');
  assert.equal(run('enigma', 'enc', 'HELLOWORLD', { plug: '', r1: 'I', r2: 'II', r3: 'III', refl: 'B', rings: 'AAA', pos: 'AAA' }), 'ILBDAAMTAZ');
  assert.equal(run('trithemius', 'enc', 'AAAA'), 'ABCD');
  assert.equal(run('porta', 'enc', 'DEFENDTHEEASTWALLOFTHECASTLE', { key: 'FORTIFICATION' }), 'SYNNJSCVRNRLAHUTUKUCVRYRLANY');
  assert.equal(run('polybius', 'enc', 'ABC'), '11 12 13');
  assert.equal(run('a1z26', 'enc', 'Hi'), '8-9');
});

test('known vectors: encodings and other', () => {
  assert.equal(run('base', 'enc', 'Hello', { b: 'base32' }), 'JBSWY3DP');
  assert.equal(run('base', 'enc', 'Hello World!', { b: 'base58' }), '2NEpo7TZRRrLZSi2U');
  assert.equal(run('base', 'enc', 'Man is', { b: 'ascii85' }), '<~9jqo^Bla~>'); // = Python base64.a85encode(adobe=True)
  assert.equal(run('morse', 'enc', 'SOS'), '... --- ...');
  assert.equal(run('roman', 'enc', '2026 1994'), 'MMXXVI MCMXCIV');
  assert.equal(run('bijective-26', 'enc', '28 702'), 'AB ZZ');
  assert.equal(run('twos-complement', 'enc', '-1 -128', { bits: 8 }), '11111111 10000000');
  assert.equal(run('ieee754', 'dec', '40490fdb', { bits: '32' }).slice(0, 7), '3.14159');
  assert.equal(run('number-words', 'enc', '1999'), 'one thousand, nine hundred and ninety-nine');
  assert.equal(run('number-words', 'dec', 'one thousand, nine hundred and ninety-nine'), '1999');
  assert.equal(run('rot47', 'enc', 'Hello'), 'w6==@');
  assert.equal(run('soundex', 'run', 'Robert Ashcraft Tymczak').rows.map((r) => r[1]).join(' '), 'R163 A261 T522');
  assert.equal(run('levenshtein', 'run', 'kitten', { b: 'sitting' }).rows[0][1], '3');
  assert.equal(run('brainfuck', 'dec', run('brainfuck', 'enc', 'Hello, BF!')), 'Hello, BF!');
  assert.equal(run('ook', 'dec', run('ook', 'enc', 'Ook ook')), 'Ook ook');
  assert.equal(run('deadfish', 'dec', run('deadfish', 'enc', '72 101 108 0 255')), '72 101 108 0 255');
  assert.equal(run('dna', 'enc', 'A'), 'CAAC');
  assert.equal(run('gray', 'enc', '5', { bits: 4 }), '0111');
  assert.equal(run('endianness', 'enc', 'deadbeef', { w: '4' }), 'efbeadde');
});

test('crackers find the key', () => {
  const v = get('vigenere-crack');
  assert.equal(v.run(v.sample, { max: 20 }).rows[0][0], 'NINJA');
  const x = get('xor-crack');
  assert.equal(x.run(x.sample, { fmt: 'hex', max: 16 }).rows[0][1], 'WEM');
  const b = get('base64-recursive');
  assert.equal(b.run(b.sample).text, 'flag{peel-the-onion}');
  const k = get('kasiski');
  assert.match(k.run(k.sample, { min: 3 }).text, /\b5 \(/);
  const caesar = get('caesar');
  assert.equal(caesar.crack('Dwwdfn dw gdzq, wkh hqhpb lv frplqj iurp wkh qruwk').rows[0][0], 3);
});

test('monoalphabetic solver recovers most of a substitution', () => {
  const m = get('mono-solver');
  const r = m.run(m.sample, { iters: 6000, seed: 'a' });
  const want = 'the river was quiet that evening';
  const got = r.text.slice(0, want.length);
  let same = 0; for (let i = 0; i < want.length; i++) if (want[i].toLowerCase() === got[i].toLowerCase()) same++;
  assert.ok(same / want.length > 0.8, `solver output: ${got}`);
});

test('every reversible entry round-trips its sample', () => {
  const norm = (s) => String(s).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const loose = new Set(['playfair', 'playfair-6', 'hill', 'four-square', 'two-square', 'route', 'baconian', 'tap-code', 'tap-code-keyed', 'polybius', 'polybius-6', 'bifid', 'nihilist', 'trifid', 'adfgx', 'adfgvx', 'bifid-6', 'nihilist-6', 'homophonic', 'book', 'null-cipher', 'morbit', 'fractionated-morse', 'pollux', 'checkerboard', 'nicodemus', 'enigma', 'columnar']);
  const skip = new Set(['leet', 'brainfuck', 'ook', 'deadfish', 'xor-hex', 'ieee754', 'number-words', 'pem', 'data-uri', 'hex-base64', 'base64url-swap', 'endianness']);
  for (const c of CIPHERS) {
    if (!c.enc || !c.dec || skip.has(c.id)) continue;
    const p = defaults(c), x = c.sample || 'Hello world';
    let back;
    try { back = c.dec(c.enc(x, p), p); } catch (e) { assert.fail(`${c.id}: ${e.message}`); }
    if (loose.has(c.id) || c.group === 'classical') {
      const a = norm(x).replace(/J/g, 'I').replace(/K/g, c.id.startsWith('tap') ? 'C' : 'K'), b = norm(back).replace(/J/g, 'I').replace(/K/g, c.id.startsWith('tap') ? 'C' : 'K');
      assert.equal(b.replace(/[XQ]/g, ''), a.replace(/[XQ]/g, ''), `${c.id}: ${back}`);
    } else if (['morse', 't9', 'a1z26', 'nato', 'baudot'].includes(c.id)) assert.equal(String(back).toUpperCase(), x.toUpperCase(), c.id);
    else assert.equal(String(back).replace(/\r\n/g, '\n'), x, c.id);
  }
});
