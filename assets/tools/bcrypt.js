import bcrypt from 'bcryptjs';
import { $, live, msg } from '../js/tk.js';

$('#go').addEventListener('click', async () => {
  const cost = Math.max(4, Math.min(15, +$('#cost').value || 10));
  $('#go').disabled = true; $('#time').textContent = 'hashing…';
  const t = performance.now();
  try { $('#out').value = await bcrypt.hash($('#pw').value, cost); $('#time').textContent = `${Math.round(performance.now() - t)} ms at cost ${cost}`; $('#chash').value = $('#out').value; $('#cpw').value = $('#pw').value; cmp(); }
  finally { $('#go').disabled = false; }
});
let job = 0;
const cmp = live([$('#cpw'), $('#chash')], async () => {
  const id = ++job, h = $('#chash').value.trim();
  if (!/^\$2[abxy]?\$\d\d\$[./A-Za-z0-9]{53}$/.test(h)) return msg($('#cmsg'), h ? 'not a bcrypt hash ($2a$ / $2b$ / $2y$, cost, 53 characters)' : '');
  msg($('#cmsg'), 'checking…', 'warn');
  const ok = await bcrypt.compare($('#cpw').value, h.replace(/^\$2y\$/, '$2b$'));
  if (id === job) msg($('#cmsg'), ok ? '✓ the password matches' : '✗ no match', ok ? 'ok' : 'err');
});
$('#go').click();
