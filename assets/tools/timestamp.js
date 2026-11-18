import { $, el, kv, live, copyBtn } from '../js/tk.js';
import { interpretations, allFrom } from './lib/timestamp.js';

function renderNum() {
  const v = Number($('#num').value.trim().replace(/[\s,_]/g, ''));
  if (!isFinite(v)) { $('#interp').replaceChildren(el('tr', {}, el('td', { class: 'dim', text: 'enter a number' }))); return; }
  $('#interp').replaceChildren(
    el('tr', {}, el('th', { text: 'interpreted as' }), el('th', { text: 'UTC date/time' }), el('th', {})),
    ...interpretations(v).map((r) => el('tr', { class: r.likely ? 'hit' : '' },
      el('td', { text: r.label }), el('td', {}, el('code', { text: r.iso })), el('td', { class: 'dim', text: r.likely ? '✓ plausible' : '' }))));
}
function renderDate() {
  const ms = $('#dt').value ? new Date($('#dt').value).getTime() : Date.now();
  kv($('#enc'), allFrom(ms).map(([, label, val]) => [label, String(val)]));
}
$('#nowbtn').addEventListener('click', () => { $('#num').value = String(Date.now()); renderNum(); });
const pad = (n) => String(n).padStart(2, '0');
const d = new Date(); $('#dt').value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
live([$('#num')], renderNum); live([$('#dt')], renderDate);
renderNum(); renderDate();
