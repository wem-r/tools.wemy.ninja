import { $, $$, el, live, pick, copyBtn } from '../js/tk.js';
import { CRADLES } from './lib/cradle.js';

function render() {
  const u = $('#url').value.trim() || 'http://HOST/payload', os = pick('os');
  $('#out').replaceChildren(...CRADLES.filter((c) => !os || c.os === os).map((c) => {
    const cmd = c.build(u);
    return el('div', { class: 'tk-field' },
      el('div', { class: 'tk-label' }, el('span', { text: c.name + (c.os === 'win' ? '  · Windows' : '  · Linux') }), el('span', { class: 'r' }, copyBtn(() => cmd))),
      el('textarea', { readonly: true, rows: String(Math.min(3, Math.ceil(cmd.length / 90))) }, cmd),
      c.note ? el('p', { class: 'dim', style: 'margin:2px 0 0;font-size:12px', text: c.note }) : null);
  }).flat().filter(Boolean));
}
live([$('#url'), ...$$('#os input')], render);
