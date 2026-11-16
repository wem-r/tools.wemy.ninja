import { $, msg, download } from '../js/tk.js';
import { single, outName, isEncrypted, fail } from './lib/pdf.js';
import { qpdf } from './lib/qpdf.js';

const cur = single(async (f) => {
  $('#ui').hidden = false;
  msg($('#msg'), isEncrypted(f.bytes) ? 'encrypted — enter its password' : 'this PDF does not look encrypted', isEncrypted(f.bytes) ? 'warn' : 'ok');
});
const go = async () => {
  try {
    const r = await qpdf(cur().bytes, [`--password=${$('#pw').value}`, '--decrypt', 'IN', 'OUT']);
    if (!r.out || r.code === 2) throw new Error(/password/i.test(r.log.join(' ')) ? 'wrong password' : r.log.join(' ') || 'qpdf failed');
    download(outName(cur().file.name, 'unlocked'), r.out, 'application/pdf');
    msg($('#msg'), 'password and restrictions removed', 'ok');
  } catch (e) { fail($('#msg'), e); }
};
$('#save').addEventListener('click', go);
$('#pw').addEventListener('keydown', (e) => e.key === 'Enter' && go());
