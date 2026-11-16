import { StandardFonts, rgb } from 'pdf-lib';
import { $, msg } from '../js/tk.js';
import { single, openLib, savePdf, outName, fail, hexRgb } from './lib/pdf.js';
import { parseRanges, label } from './lib/pages.js';
import { view, text } from './lib/stamp.js';
import { preview } from './lib/preview.js';

async function apply(bytes, name) {
  const doc = await openLib(bytes), font = await doc.embedFont(StandardFonts.Helvetica);
  const n = doc.getPageCount(), idx = [...new Set(parseRanges($('#pages').value, n))].sort((a, b) => a - b);
  const size = +$('#size').value || 9, m = +$('#margin').value || 0, col = $('#col').value;
  const date = new Date().toLocaleDateString();
  for (const i of idx) {
    const page = doc.getPage(i), v = view(page), ctx = { n: i + 1, total: n, date, file: name };
    const put = (id, ax, top) => { const s = $('#' + id).value; if (s.trim()) text(page, font, label(s, ctx), { vx: ax === 0 ? m : ax === 1 ? v.W - m : v.W / 2, vy: top ? v.H - m - size : m, size, color: col, ax }); };
    put('hl', 0, true); put('hc', 0.5, true); put('hr', 1, true); put('fl', 0, false); put('fc', 0.5, false); put('fr', 1, false);
    if ($('#line').checked && v.rot === 0) {
      const c = rgb(...hexRgb(col));
      page.drawLine({ start: { x: m, y: v.H - m - size - 4 }, end: { x: v.W - m, y: v.H - m - size - 4 }, thickness: 0.5, color: c });
      page.drawLine({ start: { x: m, y: m + size + 3 }, end: { x: v.W - m, y: m + size + 3 }, thickness: 0.5, color: c });
    }
  }
  return { doc, first: idx[0] ?? 0, count: idx.length };
}
const cur = single(async (f) => { $('#ui').hidden = false; msg($('#msg'), `${f.file.name} ready`, 'ok'); $('#preview').click(); });
$('#preview').addEventListener('click', async () => { try { const { doc, first } = await apply(cur().bytes, cur().file.name); await preview(doc, $('#cv'), first); } catch (e) { fail($('#msg'), e); } });
$('#save').addEventListener('click', async () => { try { const { doc, count } = await apply(cur().bytes, cur().file.name); await savePdf(doc, outName(cur().file.name, 'header-footer')); msg($('#msg'), `${count} pages done`, 'ok'); } catch (e) { fail($('#msg'), e); } });
