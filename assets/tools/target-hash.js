import { $, el, live, copyBtn } from '../js/tk.js';
import { generate } from './lib/targethash.js';

let seq = 0;
async function render() {
  const id = ++seq;
  const rows = await generate($('#pw').value, { user: $('#user').value.trim() || 'postgres' });
  if (id !== seq) return;
  $('#out').replaceChildren(
    el('tr', {}, el('th', { text: 'type' }), el('th', { text: 'hash' }), el('th', { text: 'crack with' }), el('th', {})),
    ...rows.map(([name, hash, note]) => el('tr', {},
      el('td', {}, el('b', { text: name })), el('td', {}, el('code', { text: hash })), el('td', { class: 'dim', text: note }), el('td', { class: 'r' }, copyBtn(() => hash)))));
}
live([$('#pw'), $('#user')], render);
