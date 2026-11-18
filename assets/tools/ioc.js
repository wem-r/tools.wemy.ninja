import { $, $$, el, live, pick, msg, copyBtn } from '../js/tk.js';
import { extract, defang, refang, LABELS } from './lib/ioc.js';

function render() {
  const mode = pick('mode'), t = $('#in').value;
  $('#out').hidden = mode !== 'extract'; $('#transform').hidden = mode === 'extract';
  if (mode !== 'extract') {
    $('#outl').textContent = mode === 'defang' ? 'defanged (safe to share)' : 'refanged (live again — careful)';
    $('#tout').value = mode === 'defang' ? defang(t) : refang(t);
    msg($('#msg'), '');
    return;
  }
  const r = extract(t);
  const total = Object.values(r).reduce((n, a) => n + a.length, 0);
  msg($('#msg'), `${total} indicators`);
  $('#out').replaceChildren(...Object.entries(r).filter(([, a]) => a.length).map(([k, arr]) => {
    const defanged = arr.map((x) => (k === 'url' || k === 'domain' || k.startsWith('ipv')) ? defang(x) : x);
    return el('div', { class: 'tk-field' },
      el('div', { class: 'tk-label' }, el('span', { text: `${LABELS[k]} (${arr.length})` }), el('span', { class: 'r' }, copyBtn(() => defanged.join('\n')))),
      el('textarea', { readonly: true, rows: String(Math.min(6, arr.length)) }, defanged.join('\n')));
  }).filter(Boolean));
  if (!total) $('#out').replaceChildren(el('p', { class: 'dim', text: 'no indicators found' }));
}
live([$('#in'), ...$$('#mode input')], render);
