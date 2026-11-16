import { $, live, msg, pick } from '../js/tk.js';
import { single, openLib, newDoc, savePdf, outName, fail } from './lib/pdf.js';
import { SIZES, parseRanges } from './lib/pages.js';

const MM = 72 / 25.4;
live($('#size'), () => { $('#cw').hidden = $('#ch').hidden = $('#size').value !== 'custom'; });
const cur = single(async (f) => {
  const d = await openLib(f.bytes);
  const sizes = [...new Set(d.getPages().map((p) => { const { width, height } = p.getSize(); return `${Math.round(width / MM)}×${Math.round(height / MM)} mm`; }))];
  $('#sizes').textContent = `now: ${sizes.slice(0, 4).join(', ')}${sizes.length > 4 ? '…' : ''}`;
  $('#ui').hidden = false; msg($('#msg'), `${d.getPageCount()} pages`, 'ok');
});
$('#save').addEventListener('click', async () => {
  try {
    const src = await openLib(cur().bytes), out = await newDoc(), pages = src.getPages(), emb = await out.embedPages(pages);
    const sel = new Set(parseRanges($('#pages').value, pages.length));
    let [TW, TH] = $('#size').value === 'custom' ? [(+$('#cw').value || 210) * MM, (+$('#ch').value || 297) * MM] : SIZES[$('#size').value];
    const mode = pick('fit');
    pages.forEach((p, i) => {
      const e = emb[i], rot = p.getRotation().angle % 360;
      const pw = rot % 180 ? e.height : e.width, ph = rot % 180 ? e.width : e.height;
      if (!sel.has(i)) { const pg = out.addPage([e.width, e.height]); pg.drawPage(e); pg.setRotation(p.getRotation()); return; }
      let W = Math.min(TW, TH), H = Math.max(TW, TH);
      const o = $('#orient').value;
      if (o === 'l' || (o === 'auto' && pw > ph)) [W, H] = [H, W];
      const s = mode === 'none' ? 1 : mode === 'fill' ? Math.max(W / pw, H / ph) : Math.min(W / pw, H / ph);
      const w = pw * s, h = ph * s, x = (W - w) / 2, y = (H - h) / 2;
      const at = { 0: [x, y], 90: [x, y + h], 180: [x + w, y + h], 270: [x + w, y] }[rot] || [x, y];
      out.addPage([W, H]).drawPage(e, { x: at[0], y: at[1], xScale: s, yScale: s, rotate: { type: 'degrees', angle: -rot } });
    });
    await savePdf(out, outName(cur().file.name, 'resized'));
    msg($('#msg'), `${sel.size} page(s) resized`, 'ok');
  } catch (e) { fail($('#msg'), e); }
});
