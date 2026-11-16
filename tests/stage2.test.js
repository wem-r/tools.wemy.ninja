// Unit tests for the stage 2 pure-logic modules. Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as mh from '../assets/tools/lib/mailhdr.js';
import { parseCSV } from '../assets/tools/lib/csv.js';
import * as logs from '../assets/tools/lib/logs.js';
import { identify, extMatches, textKind } from '../assets/tools/lib/magic.js';
import { stripJpeg, stripPng, stripWebp } from '../assets/tools/lib/metastrip.js';
import * as uni from '../assets/tools/lib/unicode.js';
import * as tx from '../assets/tools/lib/text.js';
import * as cd from '../assets/tools/lib/checkdigits.js';
import * as dk from '../assets/tools/lib/dorks.js';
import { CVSS31, CVSS40 } from '@pandatix/js-cvss';
import { V31, V40, rating } from '../assets/tools/lib/cvssmeta.js';
import * as pg from '../assets/tools/lib/pages.js';

const HDR = `Delivered-To: wem@example.org
Received: by 2002:a05:6000:1:b0:1 with SMTP id x;
        Mon, 16 Nov 2026 03:10:05 -0800 (PST)
Received: from mail.sender.test (mail.sender.test. [203.0.113.7])
        by mx.example.org with ESMTPS id abc123
        for <wem@example.org>; Mon, 16 Nov 2026 11:10:02 +0000
Received: from [10.0.0.5] (unknown [198.51.100.9])
 by mail.sender.test (Postfix) with ESMTPSA id 42;
 Mon, 16 Nov 2026 12:09:58 +0100
Authentication-Results: mx.example.org;
       dkim=pass header.i=@sender.test header.s=s1 header.b=abc;
       spf=pass (domain of bob@sender.test designates 203.0.113.7) smtp.mailfrom=bob@sender.test;
       dmarc=pass (p=REJECT) header.from=sender.test
DKIM-Signature: v=1; a=rsa-sha256; d=sender.test; s=s1; h=from:to:subject; t=1794830998; b=abc
From: =?UTF-8?B?Qm9iIMOJdMOp?= <bob@sender.test>
Reply-To: other@elsewhere.test
To: wem@example.org
Subject: =?iso-8859-1?Q?R=E9union?=
Date: Mon, 16 Nov 2026 12:09:57 +0100

body here: not a header`;

test('mail headers', () => {
  const hs = mh.parseHeaders(HDR);
  assert.equal(mh.first(hs, 'subject'), '=?iso-8859-1?Q?R=E9union?=');
  assert.equal(mh.decodeWords(mh.first(hs, 'Subject')), 'Réunion');
  assert.equal(mh.decodeWords(mh.first(hs, 'From')), 'Bob Été <bob@sender.test>');
  assert.ok(!hs.some((h) => h.name === 'body here'));
  const h = mh.hops(hs);
  assert.equal(h.length, 3);
  assert.equal(h[0].ip, '198.51.100.9');
  assert.equal(h[1].ip, '203.0.113.7');
  assert.equal(h[1].delay, 4);
  assert.equal(h[2].delay, 3);
  const a = mh.authResults(hs);
  assert.deepEqual(a.map((x) => `${x.method}=${x.result}`), ['dkim=pass', 'spf=pass', 'dmarc=pass']);
  assert.equal(mh.dkimSignatures(hs)[0].selector, 's1');
  assert.ok(mh.findings(hs).some(([, t]) => t.startsWith('Reply-To')));
  assert.equal(mh.fmtDelay(3725), '1 h 2 min');
});

test('csv', () => {
  assert.deepEqual(parseCSV('a,b\n"x, y","say ""hi""\nline 2"\n').rows, [['a', 'b'], ['x, y', 'say "hi"\nline 2']]);
  assert.equal(parseCSV('a;b;c\n1;2;3').sep, ';');
});

test('logs: web access', () => {
  const t = `203.0.113.7 - - [16/Nov/2026:12:00:01 +0100] "GET /index.html HTTP/1.1" 200 512 "-" "curl/8.0"
203.0.113.7 - - [16/Nov/2026:12:00:02 +0100] "POST /wp-login.php HTTP/1.1" 404 0 "-" "bot"
198.51.100.9 - bob [16/Nov/2026:12:00:03 +0100] "GET /x HTTP/2.0" 500 12 "https://a.test/" "Mozilla"`;
  assert.equal(logs.detect(t), 'access');
  const r = logs.parseLog(t);
  assert.equal(r.rows.length, 3);
  assert.equal(r.rows[0].time.toISOString(), '2026-11-16T11:00:01.000Z');
  assert.equal(r.rows[2]._level, 'bad');
  assert.deepEqual(logs.top(r.rows, 'ip'), [['203.0.113.7', 2], ['198.51.100.9', 1]]);
});

test('logs: auth.log and journalctl', () => {
  const t = `Nov 16 10:01:02 vps sshd[123]: Failed password for invalid user admin from 203.0.113.7 port 4242 ssh2
Nov 16 10:01:05 vps sshd[123]: Accepted publickey for wem from 198.51.100.9 port 5555 ssh2: ED25519 SHA256:x
Nov 16 10:02:00 vps sudo:      wem : TTY=pts/0 ; PWD=/home/wem ; USER=root ; COMMAND=/usr/bin/apt update
2026-11-16T10:03:00+01:00 vps sshd[9]: Invalid user test from 203.0.113.8 port 1`;
  assert.equal(logs.detect(t), 'syslog');
  const r = logs.parseLog(t, 'auto', 2026);
  assert.deepEqual(r.rows.map((x) => x.event), ['ssh failed password', 'ssh login ok (publickey)', 'sudo /usr/bin/apt update', 'ssh invalid user']);
  assert.deepEqual(r.rows.map((x) => x.user), ['admin', 'wem', 'wem', 'test']);
  assert.equal(r.rows[0].ip, '203.0.113.7');
  assert.equal(r.rows[0].time.getMonth(), 10);
});

test('logs: nginx error, json lines, windows csv', () => {
  const ne = '2026/11/16 10:00:00 [error] 1234#0: *5 open() "/srv/x" failed (2: No such file or directory), client: 203.0.113.7, server: tools, request: "GET /x HTTP/1.1"';
  assert.equal(logs.detect(ne), 'nginx-error');
  assert.equal(logs.parseLog(ne).rows[0].ip, '203.0.113.7');
  const j = '{"time":"2026-11-16T10:00:00Z","level":"error","msg":"boom","http":{"status":500}}\n{"time":"2026-11-16T10:00:01Z","level":"info","msg":"ok"}';
  const r = logs.parseLog(j);
  assert.equal(r.format, 'json');
  assert.ok(r.columns.some(([k]) => k === 'http.status'));
  assert.equal(r.rows[0]._level, 'bad');
  const w = 'Level,Date and Time,Source,Event ID,Task Category,Description\nInformation,16/11/2026 10:00:00,Microsoft-Windows-Security-Auditing,4625,Logon,"An account failed to log on.\n\nAccount Name:\t\tadmin\nLogon Type:\t\t3\nSource Network Address:\t203.0.113.7"';
  assert.equal(logs.detect(w), 'windows-csv');
  const wr = logs.parseLog(w).rows[0];
  assert.equal(wr.id, '4625');
  assert.equal(wr.user, 'admin');
  assert.equal(wr.ip, '203.0.113.7');
  assert.equal(wr.event, 'logon failed (network)');
});

test('file type', () => {
  const b = (h) => Uint8Array.from(h.match(/../g), (x) => parseInt(x, 16));
  assert.equal(identify(b('89504E470D0A1A0A0000'))[0].name, 'PNG image');
  assert.equal(identify(b('255044462D312E37'))[0].ext, 'pdf');
  assert.match(identify(b('0000001866747970686569630000'))[0].name, /HEIC/);
  assert.match(identify(b('524946462400000057454250565038'))[0].name, /WebP/);
  assert.equal(textKind(new TextEncoder().encode('hello')), 'ASCII text');
  assert.equal(extMatches('photo.png', identify(b('FFD8FFE0'))), false);
  assert.equal(extMatches('photo.jpeg', identify(b('FFD8FFE0'))), true);
});

test('metadata strip', () => {
  const jpg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe1, 0, 8, 0x45, 0x78, 0x69, 0x66, 0, 0, 0xff, 0xfe, 0, 4, 0x68, 0x69, 0xff, 0xda, 0, 2, 1, 2, 3, 0xff, 0xd9]);
  const r = stripJpeg(jpg);
  assert.deepEqual([...r.bytes], [0xff, 0xd8, 0xff, 0xda, 0, 2, 1, 2, 3, 0xff, 0xd9]);
  assert.equal(r.removed.length, 2);
  const chunk = (type, data) => { const t = new TextEncoder().encode(type); const out = new Uint8Array(12 + data.length); new DataView(out.buffer).setUint32(0, data.length); out.set(t, 4); out.set(data, 8); return out; };
  const cat = (...a) => { const o = new Uint8Array(a.reduce((x, y) => x + y.length, 0)); let i = 0; for (const p of a) { o.set(p, i); i += p.length; } return o; };
  const png = cat(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10]), chunk('IHDR', new Uint8Array(13)), chunk('tEXt', new TextEncoder().encode('Author\0wem')), chunk('IDAT', new Uint8Array(3)), chunk('IEND', new Uint8Array(0)));
  const p = stripPng(png);
  assert.equal(p.bytes.length, png.length - 22);
  assert.match(p.removed[0], /tEXt.*Author/);
  const le = (n) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, n >>> 24];
  const wc = (t, d) => [...new TextEncoder().encode(t), ...le(d.length), ...d, ...(d.length & 1 ? [0] : [])];
  const body = [...new TextEncoder().encode('WEBP'), ...wc('VP8X', [0x0c, 0, 0, 0, 0, 0, 0, 0, 0, 0]), ...wc('VP8 ', [1, 2, 3, 4]), ...wc('EXIF', [9, 9, 9])];
  const webp = Uint8Array.from([...new TextEncoder().encode('RIFF'), ...le(body.length), ...body]);
  const w = stripWebp(webp);
  assert.equal(w.removed.length, 1);
  assert.equal(w.bytes[20], 0);
  assert.equal(new DataView(w.bytes.buffer).getUint32(4, true), w.bytes.length - 8);
});

test('invisible characters and zero-width stego', () => {
  const t = 'pay​pal and ‮gnp.exe and pаypal x';
  const s = uni.scan(t);
  assert.deepEqual(s.map((x) => x.kind), ['invisible', 'bidi', 'confusable', 'space']);
  assert.equal(uni.clean(t, new Set(['invisible', 'bidi', 'confusable', 'space'])), 'paypal and gnp.exe and paypal x');
  const h = uni.hide('Hello world', 'secret é');
  assert.equal(uni.stripZeroWidth(h), 'Hello world');
  assert.equal(uni.reveal(h).text, 'secret é');
  assert.equal(uni.reveal('nothing here'), null);
});

test('text', () => {
  assert.equal(tx.CASES.camel[1]('hello big World'), 'helloBigWorld');
  assert.equal(tx.CASES.snake[1]('parseHTTPResponse code'), 'parse_http_response_code');
  assert.equal(tx.CASES.title[1]('the lord of the rings'), 'The Lord of the Rings');
  assert.equal(tx.CASES.sentence[1]('HELLO. how ARE you?'), 'Hello. How are you?');
  assert.equal(tx.slugify("Crème brûlée & l'été 2026!"), 'creme-brulee-and-lete-2026');
  assert.equal(tx.removeAccents('Straße Ærø'), 'Strasse AEro');
  const s = tx.stats('Hello world.\n\nSecond line, é!');
  assert.equal(s.words, 5); assert.equal(s.lines, 3); assert.equal(s.paragraphs, 2); assert.equal(s.bytes, 30);
  assert.deepEqual(tx.LINE_OPS.dedupe(['a', 'b', 'a']), ['a', 'b']);
  assert.deepEqual(tx.LINE_OPS.sort(['b10', 'b9', 'a']), ['a', 'b9', 'b10']);
  assert.equal(tx.wrap('aaa bbb ccc', 7), 'aaa bbb\nccc');
  assert.equal(tx.truncate('hello wonderful world', 12), 'hello…');
  assert.equal(tx.normaliseSpaces('  a   b  \n\n\n\nc '), 'a b\n\nc');
});

test('check digits', () => {
  assert.ok(cd.luhnValid('4539 1488 0343 6467'));
  assert.ok(!cd.luhnValid('4539 1488 0343 6468'));
  assert.equal(cd.luhnDigit('7992739871'), '3');
  assert.equal(cd.cardNetwork('378282246310005').name, 'American Express');
  assert.equal(cd.cardNetwork('2223003122003222').name, 'Mastercard');
  for (const n of ['Visa', 'Mastercard', 'American Express']) assert.ok(cd.luhnValid(cd.generateCard(n)), n);
  assert.ok(cd.checkIBAN('FR14 2004 1010 0505 0001 3M02 606').valid);
  assert.ok(cd.checkIBAN('GB82 WEST 1234 5698 7654 32').valid);
  const bad = cd.checkIBAN('GB82 WEST 1234 5698 7654 33');
  assert.ok(!bad.valid);
  assert.equal(cd.checkIBAN('FR14 2004 1010 0505 0001 3M02 606').bank, '20041');
  assert.equal(cd.checkISBN('0-306-40615-2').converted, '9780306406157');
  assert.ok(cd.checkISBN('978-0-306-40615-7').valid);
  assert.equal(cd.checkISBN('9780306406157').converted, '0306406152');
  assert.ok(cd.checkISSN('0378-5955').valid);
  assert.ok(cd.checkIMEI('49-015420-323751-8').valid);
});

test('dorks', () => {
  const g = dk.build({ terms: 'report', site: 'example.com', filetype: ['pdf', 'docx'], exclude: ['draft'], intext: 'confidential' });
  assert.equal(g.query, 'report site:example.com intext:confidential (filetype:pdf OR filetype:docx) -draft');
  const b = dk.build({ intext: 'x', after: '2024-01-01' }, 'bing');
  assert.equal(b.query, 'inbody:x');
  assert.deepEqual(b.dropped, ['after']);
  assert.equal(dk.preset('site:{d} -site:www.{d}', 'https://wemy.ninja/kb/'), 'site:wemy.ninja -site:www.wemy.ninja');
  assert.match(dk.openDir({ types: ['mkv', 'mp4'], site: 'example.com', exclude: false }), /^intitle:"index of" site:example.com \(mkv \| mp4\)$/);
});

test('cvss (js-cvss + metadata)', () => {
  assert.equal(new CVSS31('CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H').BaseScore(), 9.8);
  assert.equal(new CVSS31('CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:C/C:L/I:L/A:N').BaseScore(), 6.4);
  assert.equal(new CVSS40('CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N').Score(), 9.3);
  assert.equal(new CVSS40('CVSS:4.0/AV:L/AC:L/AT:N/PR:L/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N').Score(), 8.5);
  const v = new CVSS40();
  for (const [k, , vals] of V40) v.Set(k, vals[0][0]);
  assert.ok(v.Vector().startsWith('CVSS:4.0/AV:N'));
  const w = new CVSS31();
  for (const [k, , vals] of V31) w.Set(k, vals[0][0]);
  assert.equal(rating(0), 'None'); assert.equal(rating(9.8), 'Critical'); assert.equal(rating(4), 'Medium');
});

test('pages and geometry', () => {
  assert.deepEqual(pg.parseRanges('1-3, 5, 8-', 9), [0, 1, 2, 4, 7, 8]);
  assert.deepEqual(pg.parseRanges('', 3), [0, 1, 2]);
  assert.deepEqual(pg.parseRanges('odd', 5), [0, 2, 4]);
  assert.deepEqual(pg.parseRanges('3-1, last', 4), [2, 1, 0, 3]);
  assert.throws(() => pg.parseRanges('7', 5));
  assert.deepEqual(pg.splitEvery(5, 2), [[0, 1], [2, 3], [4]]);
  assert.deepEqual(pg.splitRanges('1-2; 3-', 4), [[0, 1], [2, 3]]);
  assert.equal(pg.label('Page {n} of {total}', { n: 3, total: 12 }), 'Page 3 of 12');
  assert.equal(pg.label('{n:roman}', { n: 14, total: 1 }), 'xiv');
  const H = pg.homography([[10, 10], [110, 20], [100, 120], [5, 100]], [[0, 0], [100, 0], [100, 100], [0, 100]]);
  const [x, y] = pg.project(H, 110, 20);
  assert.ok(Math.abs(x - 100) < 1e-6 && Math.abs(y) < 1e-6);
  assert.deepEqual(pg.orderCorners([[100, 100], [0, 0], [0, 100], [100, 0]]), [[0, 0], [100, 0], [100, 100], [0, 100]]);
  // synthetic text lines tilted by 3° clockwise
  const w = 600, h = 400, a = (3 * Math.PI) / 180;
  const ink = (px, py) => { const X = px - w / 2, Y = py - h / 2; const yr = Y * Math.cos(a) - X * Math.sin(a); return Math.abs(((yr % 30) + 30) % 30) < 3 && Math.abs(X) < 250; };
  assert.ok(Math.abs(pg.skewAngle(ink, w, h) - 3) < 0.3);
});

test('cvss 3.1 vector built from metadata (js-cvss Vector() bug)', () => {
  const c = new CVSS31('CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:C/C:L/I:L/A:N');
  c.Set('AV', 'P');
  const vec = 'CVSS:3.1' + V31.map(([k, , , g]) => [k, c.Get(k), g]).filter(([, v, g]) => g === 'Base' || v !== 'X').map(([k, v]) => `/${k}:${v}`).join('');
  assert.equal(vec, 'CVSS:3.1/AV:P/AC:L/PR:L/UI:N/S:C/C:L/I:L/A:N');
  assert.equal(new CVSS31(vec).BaseScore(), 3.8);
});
