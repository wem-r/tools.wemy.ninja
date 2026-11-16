import { $, live, msg, toHex } from '../js/tk.js';
import { hide, reveal } from './lib/unicode.js';

live([$('#cover'), $('#secret')], () => {
  const out = hide($('#cover').value, $('#secret').value);
  $('#out').value = out;
  $('#len').textContent = `${[...$('#cover').value].length} visible + ${[...out].length - [...$('#cover').value].length} invisible characters`;
});
live($('#in'), () => {
  const t = $('#in').value;
  if (!t) { msg($('#msg'), ''); $('#found').textContent = ''; return; }
  const r = reveal(t);
  if (!r) { msg($('#msg'), 'no zero-width message found'); $('#found').textContent = ''; return; }
  msg($('#msg'), `${r.bits} bits hidden${r.bits % 8 ? ' (not a multiple of 8: damaged or another scheme)' : ''}`, r.text != null ? 'ok' : 'warn');
  $('#found').textContent = r.text ?? `not UTF-8 text — hex: ${toHex(r.bytes)}`;
});
