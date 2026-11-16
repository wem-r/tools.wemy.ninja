import { $, el, kv, live, msg } from '../js/tk.js';
import { dropzone, bytesToText } from './lib/files.js';
import * as mh from './lib/mailhdr.js';

const inp = $('#in');
const SAMPLE = `Received: from mx.example.org (mx.example.org [192.0.2.10])
        by mail.example.net with ESMTPS id 4a2b
        for <wem@example.net>; Mon, 16 Nov 2026 11:10:09 +0000
Received: from mail.sender.test (mail.sender.test [203.0.113.7])
        by mx.example.org with ESMTPS id abc123; Mon, 16 Nov 2026 11:10:02 +0000
Received: from [10.0.0.5] (unknown [198.51.100.9])
        by mail.sender.test (Postfix) with ESMTPSA id 42; Mon, 16 Nov 2026 12:09:58 +0100
Authentication-Results: mx.example.org; dkim=pass header.i=@sender.test header.s=s1;
        spf=pass smtp.mailfrom=bob@sender.test; dmarc=pass (p=REJECT) header.from=sender.test
DKIM-Signature: v=1; a=rsa-sha256; d=sender.test; s=s1; h=from:to:subject:date; b=abc
Return-Path: <bob@sender.test>
From: =?UTF-8?B?Qm9iIMOJdMOp?= <bob@sender.test>
Reply-To: billing@other.test
To: wem@example.net
Subject: =?iso-8859-1?Q?Facture_impay=E9e?=
Date: Mon, 16 Nov 2026 12:09:57 +0100
Message-ID: <x1@sender.test>
X-Mailer: Postfix-Mailer 1.0`;

const fmtDate = (d) => (d ? d.toISOString().replace('T', ' ').replace(/\.000Z$/, ' UTC') : '—');
const verdict = (r) => el('span', { class: r === 'pass' ? 'ok' : /fail|softfail|permerror|temperror/.test(r) ? 'bad' : 'dim', text: r });

const run = live(inp, () => {
  const hs = mh.parseHeaders(inp.value);
  $('#res').hidden = !hs.length;
  if (!hs.length) { msg($('#msg'), inp.value.trim() ? 'no "Name: value" header lines found' : ''); return; }
  const f = (n) => mh.decodeWords(mh.first(hs, n));
  const hops = mh.hops(hs);
  const total = hops.length > 1 && hops[0].date && hops.at(-1).date ? Math.round((hops.at(-1).date - hops[0].date) / 1000) : null;
  msg($('#msg'), `${hs.length} headers · ${hops.length} hops${total != null ? ` · delivered in ${mh.fmtDelay(total)}` : ''}`, 'ok');
  kv($('#sum'), ['From', 'To', 'Cc', 'Subject', 'Date', 'Return-Path', 'Reply-To', 'Message-ID', 'X-Mailer', 'User-Agent', 'X-Originating-IP', 'X-Spam-Status', 'X-MS-Exchange-Organization-SCL', 'List-Unsubscribe']
    .map((n) => f(n) && [n, f(n)]));
  const fs = mh.findings(hs);
  $('#find').replaceChildren(...(fs.length ? fs.map(([k, t]) => el('div', { class: `tk-msg ${k === 'bad' ? 'err' : 'warn'}`, text: (k === 'bad' ? '✗ ' : '! ') + t, style: 'margin:0 0 4px' }))
    : [el('div', { class: 'tk-msg ok', text: '✓ SPF, DKIM and DMARC pass, nothing odd in the path', style: 'margin:0' })]));
  const auth = mh.authResults(hs), sigs = mh.dkimSignatures(hs);
  $('#auth').replaceChildren(
    el('tr', {}, ...['check', 'result', 'domain', 'checked by', 'details'].map((t) => el('th', { text: t }))),
    ...auth.map((a) => el('tr', {}, el('td', { text: a.method.toUpperCase() + (a.arc ? ' (ARC)' : '') }), el('td', {}, verdict(a.result)), el('td', { text: a.domain }), el('td', { class: 'dim', text: a.server }), el('td', { class: 'dim', text: a.details.slice(0, 160) }))),
    ...sigs.map((s) => el('tr', {}, el('td', { text: 'DKIM signature' }), el('td', { class: 'dim', text: s.algo }), el('td', { text: s.domain }), el('td', { class: 'dim', text: `selector ${s.selector}` }), el('td', { class: 'dim', text: `${s.selector}._domainkey.${s.domain} · signs ${s.headers.join(', ')}` }))),
  );
  $('#hops').replaceChildren(
    el('tr', {}, ...['#', 'delay', 'from', 'by', 'with', 'time (UTC)'].map((t) => el('th', { text: t }))),
    ...hops.map((h) => el('tr', {}, el('td', { class: 'dim', text: h.n }),
      el('td', { class: h.delay > 300 || h.delay < -120 ? 'bad' : h.delay > 30 ? 'warn' : '', text: h.delay == null ? '' : mh.fmtDelay(h.delay) }),
      el('td', {}, h.from, h.ip ? el('div', { class: 'dim', text: h.ip }) : null), el('td', { text: h.by }), el('td', { class: 'dim', text: h.with }), el('td', { class: 'dim', text: fmtDate(h.date) }))),
  );
  renderAll(hs);
});
function renderAll(hs) {
  const q = $('#hf').value.toLowerCase();
  kv($('#all'), hs.filter((h) => !q || (h.name + ' ' + h.value).toLowerCase().includes(q)).map((h) => [h.name, mh.decodeWords(h.value)]));
}
$('#hf').addEventListener('input', () => renderAll(mh.parseHeaders(inp.value)));
$('#sample').addEventListener('click', () => { inp.value = SAMPLE; run(); });
dropzone($('#drop'), async ([f]) => { inp.value = bytesToText(new Uint8Array(await f.arrayBuffer())); run(); });
