import { $, msg, download } from '../js/tk.js';
import { single, openLib, outName, fail } from './lib/pdf.js';
import { qpdf } from './lib/qpdf.js';

const cur = single(async (f) => {
  $('#ui').hidden = false; $('#log').textContent = '';
  let ok = true; try { await openLib(f.bytes); } catch { ok = false; }
  msg($('#msg'), ok ? 'this file opens fine here — repairing can still fix problems other readers have' : 'this file has structural problems', ok ? 'ok' : 'warn');
});
$('#save').addEventListener('click', async () => {
  try {
    msg($('#msg'), 'repairing…', 'warn');
    const r = await qpdf(cur().bytes, ['IN', 'OUT']);
    $('#log').textContent = r.log.join('\n') || 'qpdf reported nothing: the structure was fine';
    if (!r.out || r.code === 2) throw new Error('qpdf could not recover this file');
    let pages = '?'; try { pages = (await openLib(r.out)).getPageCount(); } catch { /* still damaged */ }
    download(outName(cur().file.name, 'repaired'), r.out, 'application/pdf');
    msg($('#msg'), `repaired${r.code === 3 ? ' with warnings' : ''} · ${pages} page(s)`, r.code === 3 ? 'warn' : 'ok');
  } catch (e) { fail($('#msg'), e); }
});
