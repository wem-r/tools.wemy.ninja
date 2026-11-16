import { StandardFonts } from 'pdf-lib';
import { $, live, msg } from '../js/tk.js';
import { single, openLib, savePdf, outName, fail } from './lib/pdf.js';
import { parseRanges, label } from './lib/pages.js';
import { view, text } from './lib/stamp.js';
import { preview } from './lib/preview.js';

live($('#fmt'), () => { $('#custom').hidden = $('#fmt').value !== 'custom'; });
async function apply(bytes) {
  const doc = await openLib(bytes), font = await doc.embedFont(StandardFonts.Helvetica);
  const n = doc.getPageCount(), idx = [...new Set(parseRanges($('#pages').value, n))].sort((a, b) => a - b);
  const fmt = $('#fmt').value === 'custom' ? $('#custom').value : $('#fmt').value;
  const size = +$('#size').value || 10, m = +$('#margin').value || 0, pos = $('#pos').value, start = +$('#start').value || 1;
  idx.forEach((i, k) => {
    const page = doc.getPage(i), v = view(page), s = label(fmt, { n: start + k, total: start + idx.length - 1 });
    let p = pos; if (p === 'out') p = (i % 2 ? 'bl' : 'br');
    const ax = p[1] === 'l' ? 0 : p[1] === 'r' ? 1 : 0.5;
    text(page, font, s, { vx: ax === 0 ? m : ax === 1 ? v.W - m : v.W / 2, vy: p[0] === 'b' ? m : v.H - m - size, size, color: $('#col').value, ax });
  });
  return { doc, first: idx[0] ?? 0, count: idx.length };
}
const cur = single(async (f) => { $('#ui').hidden = false; msg($('#msg'), `${f.file.name} ready`, 'ok'); $('#preview').click(); });
$('#preview').addEventListener('click', async () => { try { const { doc, first } = await apply(cur().bytes); await preview(doc, $('#cv'), first); } catch (e) { fail($('#msg'), e); } });
$('#save').addEventListener('click', async () => { try { const { doc, count } = await apply(cur().bytes); await savePdf(doc, outName(cur().file.name, 'numbered')); msg($('#msg'), `${count} pages numbered`, 'ok'); } catch (e) { fail($('#msg'), e); } });
