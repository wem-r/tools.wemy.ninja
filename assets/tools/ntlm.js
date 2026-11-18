import { $, kv, live } from '../js/tk.js';
import { ntHash, netNtlmv2 } from './lib/ntlm.js';

const randHex = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, '0')).join('');
$('#schal').value = randHex(8);

function render() {
  const pw = $('#pw').value;
  kv($('#nt'), [['NT hash (NTLM)', ntHash(pw)], ['format', 'hashcat -m 1000 · john --format=nt']]);
  const schal = /^[0-9a-f]{16}$/i.test($('#schal').value.trim()) ? $('#schal').value.trim() : '';
  const r = netNtlmv2($('#user').value || 'user', $('#domain').value || '', pw, schal, '');
  $('#v2').value = r.hashcat;
  kv($('#v2kv'), [['NT proof string', r.ntProof], ['server challenge', r.serverChal], ['NTLMv2 key', r.v2key]]);
}
$('#roll').addEventListener('click', () => { $('#schal').value = randHex(8); render(); });
live([$('#pw'), $('#user'), $('#domain'), $('#schal')], render);
