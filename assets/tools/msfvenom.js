import { $, el, live } from '../js/tk.js';
import { PAYLOADS, FORMATS, ENCODERS, ARCHS, build, handler } from './lib/msfvenom.js';

const osLabel = { windows: 'Windows', linux: 'Linux', osx: 'macOS', android: 'Android', php: 'PHP', python: 'Python', java: 'Java', nodejs: 'Node.js', unix: 'Unix cmd' };
$('#format').append(...Object.entries(FORMATS).map(([g, fs]) => el('optgroup', { label: g }, ...fs.map((f) => el('option', { value: f, text: f })))));
$('#format').value = 'exe';
$('#encoder').append(...ENCODERS.map((e) => el('option', { value: e, text: e || '(none)' })));
$('#arch').append(...ARCHS.map((a) => el('option', { value: a, text: a || '(payload default)' })));

function fillPayloads() {
  const q = $('#pf').value.trim().toLowerCase();
  const cur = $('#payload').value;
  const list = PAYLOADS.filter((p) => !q || p.id.includes(q) || osLabel[p.os].toLowerCase().includes(q));
  $('#payload').replaceChildren(...list.map((p) => el('option', { value: p.id, text: p.id })));
  if (list.some((p) => p.id === cur)) $('#payload').value = cur;
  else if (list.length) $('#payload').value = list[0].id;
}
fillPayloads();
$('#payload').value = 'windows/x64/meterpreter/reverse_tcp';

const opts = () => ({ payload: $('#payload').value, lhost: $('#lhost').value, lport: $('#lport').value, rhost: $('#rhost').value, cmd: $('#cmd').value,
  format: $('#format').value, encoder: $('#encoder').value, iter: $('#iter').value, arch: $('#arch').value, badchars: $('#badchars').value, out: $('#out').value });

function render() {
  const p = PAYLOADS.find((x) => x.id === $('#payload').value) || PAYLOADS[0];
  $('#f-lhost').hidden = p.kind !== 'reverse';
  $('#f-rhost').hidden = p.kind !== 'bind';
  $('#f-lport').hidden = p.kind === 'exec';
  $('#f-cmd').hidden = p.kind !== 'exec';
  const o = opts();
  $('#outcmd').value = build(o);
  $('#outh').value = handler(o);
}
$('#pf').addEventListener('input', () => { fillPayloads(); render(); });
live([$('#payload'), $('#lhost'), $('#lport'), $('#rhost'), $('#cmd'), $('#format'), $('#encoder'), $('#iter'), $('#arch'), $('#badchars'), $('#out')], render);
