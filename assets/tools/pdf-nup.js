import { rgb } from 'pdf-lib';
import { $, msg, pick } from '../js/tk.js';
import { single, openLib, newDoc, savePdf, outName, fail } from './lib/pdf.js';
import { SIZES, NUP } from './lib/pages.js';

const MM = 72 / 25.4;
const cur = single(async (f) => { const d = await openLib(f.bytes); $('#ui').hidden = false; msg($('#msg'), `${d.getPageCount()} pages`, 'ok'); });
$('#save').addEventListener('click', async () => {
  try {
    const src = await openLib(cur().bytes), out = await newDoc();
    const n = +pick('n'), [cols, rows, land] = NUP[n];
    let [W, H] = SIZES[$('#sheet').value];
    if (land) [W, H] = [H, W];
    const m = (+$('#margin').value || 0) * MM, g = (+$('#gap').value || 0) * MM;
    const cw = (W - 2 * m - (cols - 1) * g) / cols, ch = (H - 2 * m - (rows - 1) * g) / rows;
    const pages = src.getPages(), emb = await out.embedPages(pages);
    for (let s = 0; s < emb.length; s += n) {
      const sheet = out.addPage([W, H]);
      for (let k = 0; k < n && s + k < emb.length; k++) {
        const e = emb[s + k], rot = pages[s + k].getRotation().angle % 360;
        const col = $('#cols').checked ? Math.floor(k / rows) : k % cols, row = $('#cols').checked ? k % rows : Math.floor(k / cols);
        const x0 = m + col * (cw + g), y0 = H - m - (row + 1) * ch - row * g;
        const pw = rot % 180 ? e.height : e.width, ph = rot % 180 ? e.width : e.height;
        const sc = Math.min(cw / pw, ch / ph), w = pw * sc, h = ph * sc, x = x0 + (cw - w) / 2, y = y0 + (ch - h) / 2;
        // place the embedded page so it appears upright even if the source page has /Rotate
        const o = { 0: [x, y], 90: [x, y + h], 180: [x + w, y + h], 270: [x + w, y] }[rot] || [x, y];
        sheet.drawPage(e, { x: o[0], y: o[1], xScale: sc, yScale: sc, rotate: { type: 'degrees', angle: -rot } });
        if ($('#border').checked) sheet.drawRectangle({ x, y, width: w, height: h, borderColor: rgb(0.6, 0.6, 0.6), borderWidth: 0.5 });
      }
    }
    await savePdf(out, outName(cur().file.name, `${n}-up`));
    msg($('#msg'), `${emb.length} pages on ${out.getPageCount()} sheets`, 'ok');
  } catch (e) { fail($('#msg'), e); }
});
