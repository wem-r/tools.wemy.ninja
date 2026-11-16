import { StandardFonts } from 'pdf-lib';
import { $, $$, live, msg, pick } from '../js/tk.js';
import { single, openLib, savePdf, outName, fail } from './lib/pdf.js';
import { parseRanges } from './lib/pages.js';
import { view, text, image, sendToBack } from './lib/stamp.js';
import { preview } from './lib/preview.js';

live([...$$('input[name="kind"]')], () => $$('[data-k]').forEach((e) => { e.hidden = e.dataset.k !== pick('kind'); }));
let imgBytes = null;
$('#img').addEventListener('change', async () => { const f = $('#img').files[0]; imgBytes = f ? { bytes: new Uint8Array(await f.arrayBuffer()), png: f.type === 'image/png' } : null; });

async function apply(bytes, onlyFirst = false) {
  const doc = await openLib(bytes);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const img = pick('kind') === 'image' ? (imgBytes ? await (imgBytes.png ? doc.embedPng(imgBytes.bytes) : doc.embedJpg(imgBytes.bytes)) : null) : null;
  if (pick('kind') === 'image' && !img) throw new Error('choose an image');
  const idx = parseRanges($('#pages').value, doc.getPageCount());
  const size = +$('#size').value || 60, op = (+$('#op').value || 20) / 100, ang = +$('#ang').value || 0, lay = pick('lay');
  for (const i of onlyFirst ? idx.slice(0, 1) : [...new Set(idx)]) {
    const page = doc.getPage(i), v = view(page);
    const spots = lay === 'center' ? [[v.W / 2, v.H / 2]] : lay === 'br' ? [[v.W - size * 2.2, size * 1.2]] : [];
    if (lay === 'tile') { const step = size * 4.2; for (let y = step / 2; y < v.H; y += step) for (let x = ((y / step) % 2 ? 0 : step / 2); x < v.W + step; x += step * 1.4) spots.push([x, y]); }
    for (const [cx, cy] of spots) {
      if (img) { const w = size * 3, h = (w * img.height) / img.width; image(page, img, { cx, cy, w, h, opacity: op, angle: lay === 'br' ? 0 : ang }); }
      else text(page, font, $('#text').value, { vx: cx, vy: cy, size: lay === 'br' ? size / 3 : lay === 'tile' ? size / 2 : size, color: $('#col').value, opacity: op, angle: lay === 'br' ? 0 : ang, ax: 0.5, ay: 0.5 });
    }
    if ($('#under').checked) sendToBack(page);
  }
  return { doc, first: idx[0] ?? 0 };
}
const cur = single(async (f) => { $('#ui').hidden = false; msg($('#msg'), `${f.file.name} ready`, 'ok'); $('#preview').click(); });
$('#preview').addEventListener('click', async () => { try { const { doc, first } = await apply(cur().bytes, true); await preview(doc, $('#cv'), first); } catch (e) { fail($('#msg'), e); } });
$('#save').addEventListener('click', async () => { try { const { doc } = await apply(cur().bytes); await savePdf(doc, outName(cur().file.name, 'watermarked')); msg($('#msg'), 'watermark added', 'ok'); } catch (e) { fail($('#msg'), e); } });
