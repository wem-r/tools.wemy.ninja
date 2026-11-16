import { $, msg, download } from '../js/tk.js';
import { single, outName, isEncrypted, fail } from './lib/pdf.js';
import { qpdf } from './lib/qpdf.js';

$('#show').addEventListener('change', (e) => { $('#user').type = $('#owner').type = e.target.checked ? 'text' : 'password'; });
const cur = single(async (f) => {
  $('#ui').hidden = false;
  msg($('#msg'), isEncrypted(f.bytes) ? 'this PDF is already encrypted: unlock it first' : `${f.file.name} ready`, isEncrypted(f.bytes) ? 'warn' : 'ok');
});
$('#save').addEventListener('click', async () => {
  const user = $('#user').value, owner = $('#owner').value || user;
  if (!user && !owner) return msg($('#msg'), 'enter a password');
  const yn = (id) => ($(`#p-${id}`).checked ? 'y' : 'n');
  const args = ['IN', '--encrypt', user, owner, '256',
    `--print=${$('#p-print').checked ? 'full' : 'none'}`, `--modify=${$('#p-modify').checked ? 'all' : 'none'}`, `--extract=${yn('extract')}`,
    `--annotate=${yn('annotate')}`, `--form=${yn('form')}`, `--assemble=${yn('assemble')}`, '--', 'OUT'];
  msg($('#msg'), 'encrypting…', 'warn');
  try {
    const r = await qpdf(cur().bytes, args);
    if (!r.out || r.code === 2) throw new Error(r.log.join(' ') || 'qpdf failed');
    download(outName(cur().file.name, 'protected'), r.out, 'application/pdf');
    msg($('#msg'), `protected with AES-256${user ? '' : ' (opens without a password, permissions restricted)'}`, 'ok');
  } catch (e) { fail($('#msg'), e); }
});
