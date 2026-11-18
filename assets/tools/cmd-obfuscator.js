import { $, $$, el, live, pick, msg, copyBtn } from '../js/tk.js';
import { deflateSync } from 'fflate';
import { bashObfuscate, psObfuscate, gzipIexReal, deobfuscate } from './lib/cmdobf.js';

function render() {
  const mode = pick('mode'), shell = pick('shell'), t = $('#in').value;
  $('#obf-out').hidden = mode !== 'obf'; $('#deobf-out').hidden = mode === 'obf';
  $('#shell').style.display = mode === 'obf' ? '' : 'none';
  $('#inl').textContent = mode === 'obf' ? 'command to obfuscate' : 'obfuscated command';
  msg($('#msg'), '');
  if (mode === 'obf') {
    let variants = shell === 'bash' ? bashObfuscate(t) : psObfuscate(t);
    if (shell === 'ps') variants = variants.map(([n, c]) => n.startsWith('Gzip') ? [n, gzipIexReal(t, deflateSync)] : [n, c]);
    $('#obf-out').replaceChildren(...variants.map(([name, cmd]) => el('div', { class: 'tk-field' },
      el('div', { class: 'tk-label' }, el('span', { text: name }), el('span', { class: 'r' }, copyBtn(() => cmd))),
      el('textarea', { readonly: true, rows: String(Math.min(4, Math.ceil(cmd.length / 80) + 1)) }, cmd))));
  } else {
    const r = deobfuscate(t);
    $('#dout').value = r.out;
    $('#steps').textContent = r.steps.length ? 'peeled: ' + r.steps.join(' → ') : 'no known obfuscation layer found';
  }
}
live([$('#in'), ...$$('#mode input'), ...$$('#shell input')], render);
