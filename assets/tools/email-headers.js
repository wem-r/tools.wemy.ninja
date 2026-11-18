import { $, el, kv, live, msg } from '../js/tk.js';
import { parse } from './lib/emailheaders.js';

const authTag = (v) => !v ? '—' : /pass/i.test(v) ? '✓ ' + v : /fail|softfail|none|neutral/i.test(v) ? '✗ ' + v : v;
function render() {
  const raw = $('#in').value.trim();
  if (!raw) { msg($('#msg'), 'paste headers above'); $('#summary').replaceChildren(); $('#hops').replaceChildren(); $('#hopsec').hidden = true; return; }
  const r = parse(raw);
  msg($('#msg'), `${r.hopCount} hops · ${r.totalDelay ? Math.round(r.totalDelay) + 's total transit' : 'no timing'}`);
  kv($('#summary'), [
    ['From', r.from], ['To', r.to], ['Subject', r.subject], ['Date', r.date], ['Return-Path', r.returnPath], ['Reply-To', r.replyTo],
    ['SPF', authTag(r.spf)], ['DKIM', authTag(r.dkim)], ['DMARC', authTag(r.dmarc)],
    ['originating IP', r.originatingIP], ['X-Mailer', r.xMailer], ['Message-ID', r.messageId],
  ].filter((x) => x[1]));
  $('#hopsec').hidden = !r.hops.length;
  $('#hops').replaceChildren(...[
    r.hops.length ? el('tr', {}, ...['#', 'from', 'by', 'IP', 'delay'].map((h) => el('th', { text: h }))) : null,
    ...r.hops.map((h, i) => el('tr', {}, el('td', { class: 'dim', text: String(i + 1) }), el('td', { text: h.from || '—' }), el('td', { text: h.by || '—' }), el('td', {}, el('code', { text: h.ip || '' })), el('td', { class: 'dim', text: h.delay != null ? h.delay + 's' : '' }))),
  ].filter(Boolean));
}
live([$('#in')], render);
