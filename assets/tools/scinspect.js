import { $, el, kv, live, msg } from '../js/tk.js';
import { parseBytes, parseBadchars, analyse, hexdump, toBase64, toHex } from './lib/scinspect.js';

function render() {
  const bytes = parseBytes($('#in').value, $('#fmt').value);
  const badSet = parseBadchars($('#bad').value);
  const a = analyse(bytes, badSet);
  if (!bytes.length) { msg($('#msg'), 'paste some bytes above', 'warn'); } else {
    msg($('#msg'), a.clean ? `✓ ${bytes.length} bytes, no bad characters present` : `✗ ${a.badHits.length} bad character${a.badHits.length > 1 ? 's' : ''} found`, a.clean ? 'ok' : 'err');
  }
  kv($('#stats'), [
    ['length', `${a.length} bytes (0x${a.length.toString(16)})`],
    ['null bytes (00)', String(a.nulls)],
    ['distinct byte values', `${a.unique} / 256`],
    ['printable ASCII', `${Math.round(a.printableRatio * 100)}%`],
    ['bad chars', badSet.size ? [...badSet].sort((x, y) => x - y).map((b) => '\\x' + b.toString(16).padStart(2, '0')).join(' ') : '(none set)'],
  ]);
  // bad-char report
  $('#badreport').replaceChildren(...(a.badHits.length ? [
    el('p', { class: 'tk-bad', text: 'bad characters present — fix or encode the payload:' }),
    el('table', { class: 'tk-list' }, el('tr', {}, el('th', { text: 'byte' }), el('th', { text: 'count' }), el('th', { text: 'first offsets' })),
      ...a.badHits.map((h) => el('tr', {}, el('td', {}, el('code', { text: '\\x' + h.byte.toString(16).padStart(2, '0') })), el('td', { text: String(h.offsets.length > 64 ? '64+' : h.offsets.length) }), el('td', { class: 'dim', text: h.offsets.slice(0, 16).map((o) => '0x' + o.toString(16)).join(', ') + (h.offsets.length > 16 ? '…' : '') })))),
  ] : []));
  // 16x16 grid
  $('#grid').replaceChildren(...Array.from({ length: 256 }, (_, i) => {
    const bad = badSet.has(i), present = a.present[i];
    return el('span', { class: 'b' + (present ? ' on' : '') + (bad ? ' bad' : ''), title: `0x${i.toString(16).padStart(2, '0')}${present ? ' — present' : ' — absent'}${bad ? ' (bad)' : ''}`, text: i.toString(16).padStart(2, '0') });
  }));
  $('#dump').value = hexdump(bytes);
  $('#rawhex').value = toHex(bytes);
  $('#b64').value = toBase64(bytes);
}
live([$('#in'), $('#fmt'), $('#bad')], render);
