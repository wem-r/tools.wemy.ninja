import { $, el } from '../js/tk.js';
import { dropzone, fmtSize } from './lib/files.js';
import { identify, extMatches } from './lib/magic.js';

const hex = (b) => [...b].map((x) => x.toString(16).padStart(2, '0')).join(' ');
dropzone($('#drop'), async (files) => {
  const rows = [];
  for (const f of files.slice(0, 200)) {
    const b = new Uint8Array(await f.slice(0, 40000).arrayBuffer());
    const m = identify(b), ok = extMatches(f.name, m);
    rows.push(el('tr', {},
      el('td', {}, f.name, el('div', { class: 'dim', text: `${fmtSize(f.size)}${f.type ? ` · browser says ${f.type}` : ''}` })),
      el('td', {}, m.length ? m[0].name : el('span', { class: 'dim', text: 'unknown binary' }), ...m.slice(1, 3).map((x) => el('div', { class: 'dim', text: `also: ${x.name}` }))),
      el('td', { class: ok === false ? 'bad' : ok ? 'ok' : 'dim', text: ok === false ? `✗ .${f.name.split('.').pop()} but looks like ${m[0].ext.split(' ')[0] || '?'}` : ok ? '✓ matches' : '—' }),
      el('td', {}, el('code', { text: hex(b.subarray(0, 16)) }))));
  }
  $('#out').replaceChildren(el('tr', {}, ...['file', 'detected type', 'extension', 'first 16 bytes'].map((t) => el('th', { text: t }))), ...rows);
}, { page: true });
