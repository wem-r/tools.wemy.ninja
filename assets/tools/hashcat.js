import { $, el, live } from '../js/tk.js';
import { MODES, ATTACKS, MASKS, RULES, hashcat, john } from './lib/hashcat.js';

$('#attack').append(...ATTACKS.map(([a, t]) => el('option', { value: String(a), text: `-a ${a}  ${t}` })));
$('#rule').append(...RULES.map((r) => el('option', { value: r, text: r || '(no rules)' })));
$('#masks').append(el('tr', {}, el('th', { text: 'token' }), el('th', { text: 'set' })), ...MASKS.map(([t, s]) => el('tr', {}, el('td', {}, el('code', { text: t })), el('td', { class: 'dim', text: s }))));

function fillModes() {
  const q = $('#mf').value.trim().toLowerCase(), cur = $('#mode').value;
  const list = MODES.filter((m) => !q || m[1].toLowerCase().includes(q) || String(m[0]) === q || String(m[0]).startsWith(q));
  $('#mode').replaceChildren(...list.map((m) => el('option', { value: String(m[0]), text: `${String(m[0]).padStart(5, ' ')}  ${m[1]}` })));
  if (list.some((m) => String(m[0]) === cur)) $('#mode').value = cur; else if (list.length) $('#mode').value = String(list[0][0]);
}
fillModes(); $('#mode').value = '1000';

const opts = () => ({ mode: +$('#mode').value, attack: +$('#attack').value, hashfile: $('#hashfile').value, dict: $('#dict').value, dict2: $('#dict2').value,
  mask: $('#mask').value, rule: $('#rule').value, optimized: $('#opt').checked, user: $('#user').checked, show: $('#show').checked, workload: $('#workload').value });

function render() {
  const a = +$('#attack').value;
  $('#f-dict').hidden = a === 3; $('#f-dict2').hidden = a !== 1; $('#f-mask').hidden = !(a === 3 || a === 6 || a === 7);
  $('#f-rule').style.opacity = a === 0 ? 1 : 0.4;
  $('#dict-l').textContent = a === 1 ? 'first wordlist' : 'wordlist';
  const o = opts();
  $('#outhc').value = hashcat(o); $('#outjohn').value = john(o);
  const m = MODES.find((x) => x[0] === o.mode);
  $('#ex').textContent = m && m[2] ? `example ${m[1]} hash:  ${m[2]}` : '';
}
$('#mf').addEventListener('input', () => { fillModes(); render(); });
live([$('#mode'), $('#attack'), $('#hashfile'), $('#dict'), $('#dict2'), $('#mask'), $('#rule'), $('#opt'), $('#user'), $('#show'), $('#workload')], render);
