import { $, $$, live, pick, msg } from '../js/tk.js';
import { cisco7Decode, cisco7Encode, juniperDecode, juniperEncode } from './lib/cisco7.js';

function render() {
  const mode = pick('mode'), type = pick('type'), t = $('#in').value.trim();
  $('#inl').textContent = mode === 'dec' ? (type === 'cisco' ? 'Cisco type 7 value' : '$9$ value') : 'plaintext password';
  $('#outl').textContent = mode === 'dec' ? 'plaintext' : (type === 'cisco' ? 'Cisco type 7' : 'Juniper $9$');
  msg($('#msg'), '');
  if (!t) { $('#out').value = ''; return; }
  try {
    $('#out').value = mode === 'dec'
      ? (type === 'cisco' ? cisco7Decode(t) : juniperDecode(t))
      : (type === 'cisco' ? cisco7Encode(t) : juniperEncode(t));
  } catch (e) { $('#out').value = ''; msg($('#msg'), e.message, 'err'); }
}
live([$('#in'), ...$$('#mode input'), ...$$('#type input')], render);
