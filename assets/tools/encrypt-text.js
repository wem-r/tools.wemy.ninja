import CryptoJS from 'crypto-js';
import { $, $$, live, msg, pick } from '../js/tk.js';

let busy = false;
const enc = () => { if (busy) return; busy = true; try { $('#enc').value = $('#pw').value ? CryptoJS[pick('alg')].encrypt($('#plain').value, $('#pw').value).toString() : ''; msg($('#msg'), $('#pw').value ? 'encrypted' : 'enter a passphrase', $('#pw').value ? 'ok' : 'warn'); } finally { busy = false; } };
const dec = () => {
  if (busy) return; busy = true;
  try {
    const t = $('#enc').value.trim(); if (!t) return;
    let out = '';
    try { out = CryptoJS[pick('alg')].decrypt(t, $('#pw').value).toString(CryptoJS.enc.Utf8); } catch { out = ''; }
    if (out) { $('#plain').value = out; msg($('#msg'), 'decrypted', 'ok'); } else msg($('#msg'), 'cannot decrypt: wrong passphrase, algorithm or data');
  } finally { busy = false; }
};
live([$('#plain'), $('#pw'), ...$$('input[name="alg"]')], enc);
$('#enc').addEventListener('input', dec);
