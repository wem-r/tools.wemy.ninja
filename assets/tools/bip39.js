import { generateMnemonic, validateMnemonic, mnemonicToEntropy, entropyToMnemonic, mnemonicToSeed } from '@scure/bip39';
import { wordlist as english } from '@scure/bip39/wordlists/english.js';
import { wordlist as french } from '@scure/bip39/wordlists/french.js';
import { wordlist as spanish } from '@scure/bip39/wordlists/spanish.js';
import { wordlist as italian } from '@scure/bip39/wordlists/italian.js';
import { $, $$, kv, live, msg, pick, toHex, fromHex } from '../js/tk.js';

const LISTS = { english, french, spanish, italian };
const wl = () => LISTS[$('#lang').value];
const norm = (s) => s.normalize('NFKD').trim().split(/\s+/).join(' ');
let job = 0;
const check = async () => {
  const id = ++job, m = norm($('#m').value);
  if (!m) { msg($('#msg'), ''); kv($('#out'), []); return; }
  if (!validateMnemonic(m, wl())) {
    const bad = m.split(' ').filter((w) => !wl().includes(w));
    msg($('#msg'), bad.length ? `not in the ${$('#lang').value} list: ${bad.slice(0, 5).join(', ')}` : 'invalid checksum (a word is wrong or the order changed)');
    kv($('#out'), []); return;
  }
  msg($('#msg'), `✓ valid ${m.split(' ').length}-word mnemonic`, 'ok');
  const ent = mnemonicToEntropy(m, wl()), seed = await mnemonicToSeed(m, $('#pp').value);
  if (id === job) kv($('#out'), [['entropy', toHex(ent), `${ent.length * 8} bits`], ['seed (BIP39, PBKDF2-SHA512 × 2048)', toHex(seed)]]);
};
$('#go').addEventListener('click', () => { $('#m').value = generateMnemonic(wl(), +pick('n')); check(); });
live([$('#m'), $('#pp'), $('#lang')], check);
live($('#ent'), () => { try { $('#eout').textContent = $('#ent').value.trim() ? entropyToMnemonic(fromHex($('#ent').value.trim()), wl()) : ''; } catch (e) { $('#eout').textContent = e.message; } });
$$('input[name="n"]').forEach((r) => r.addEventListener('change', () => $('#go').click()));
$('#go').click();
