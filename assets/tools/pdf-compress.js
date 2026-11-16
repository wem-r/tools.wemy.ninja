import { PDFName } from 'pdf-lib';
import { $, $$, kv, live, msg, pick, download } from '../js/tk.js';
import { single, openLib, openJs, newDoc, render, canvasBytes, outName, progress, fail, tick } from './lib/pdf.js';
import { qpdf } from './lib/qpdf.js';
import { images, replaceWithJpeg } from './lib/pdfimages.js';
import { fmtSize } from './lib/files.js';

const P = progress($('#bar'), $('#msg'));
live($$('input[name="mode"]'), () => $$('[data-m]').forEach((e) => { e.hidden = !e.dataset.m.split(' ').includes(pick('mode')); }));
const cur = single(async (f) => { const d = await openLib(f.bytes); $('#ui').hidden = false; msg($('#msg'), `${d.getPageCount()} pages · ${fmtSize(f.bytes.length)} · ${images(d).filter((i) => i.filters.includes('DCTDecode')).length} JPEG image(s)`, 'ok'); });

function wipe(doc) {
  const info = doc.getInfoDict(); for (const k of info.keys()) info.delete(k);
  doc.catalog.delete(PDFName.of('Metadata'));
}
async function recompress(bytes) {
  const doc = await openLib(bytes), q = (+$('#q').value || 70) / 100, maxSide = Math.round((+$('#dpi').value || 150) * 11.7), gray = $('#gray').checked;
  const list = images(doc).filter((i) => i.filters.length === 1 && i.filters[0] === 'DCTDecode' && !i.isMask);
  let done = 0, saved = 0;
  for (const img of list) {
    P.set(done++, list.length, `image ${done} / ${list.length}…`);
    let bmp;
    try { bmp = await createImageBitmap(new Blob([img.stream.contents], { type: 'image/jpeg' })); } catch { continue; }
    const k = Math.min(1, maxSide / Math.max(bmp.width, bmp.height)), w = Math.max(1, Math.round(bmp.width * k)), h = Math.max(1, Math.round(bmp.height * k));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); x.drawImage(bmp, 0, 0, w, h); bmp.close();
    if (gray) { const id = x.getImageData(0, 0, w, h), d = id.data; for (let i = 0; i < d.length; i += 4) d[i] = d[i + 1] = d[i + 2] = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114; x.putImageData(id, 0, 0); }
    const jpg = await canvasBytes(c, 'image/jpeg', q);
    if (jpg.length < img.stream.contents.length * 0.95) { saved += img.stream.contents.length - jpg.length; replaceWithJpeg(doc, img, jpg, w, h, gray); }
    await tick();
  }
  if ($('#strip').checked) wipe(doc);
  return { bytes: await doc.save({ useObjectStreams: true }), note: `${list.length} JPEG image(s), ${fmtSize(Math.max(0, saved))} saved on images` };
}
async function raster(bytes) {
  const js = await openJs(bytes), out = await newDoc(), dpi = +$('#dpi').value || 150, q = (+$('#q').value || 70) / 100;
  for (let i = 1; i <= js.numPages; i++) {
    P.set(i - 1, js.numPages, `page ${i} / ${js.numPages}…`);
    const page = await js.getPage(i), vp = page.getViewport({ scale: 1 });
    const img = await out.embedJpg(await canvasBytes(await render(page, dpi / 72), 'image/jpeg', q));
    out.addPage([vp.width, vp.height]).drawImage(img, { x: 0, y: 0, width: vp.width, height: vp.height });
    await tick();
  }
  if (!$('#strip').checked) { const src = await openLib(bytes); out.setTitle(src.getTitle() || ''); out.setAuthor(src.getAuthor() || ''); }
  return { bytes: await out.save({ useObjectStreams: true }), note: `${js.numPages} pages re-rendered at ${dpi} dpi` };
}
$('#save').addEventListener('click', async () => {
  try {
    const before = cur().bytes.length, mode = pick('mode');
    let r = mode === 'images' ? await recompress(cur().bytes) : mode === 'raster' ? await raster(cur().bytes) : { bytes: cur().bytes, note: 'structure only' };
    if (mode === 'lossless' && $('#strip').checked) { const d = await openLib(r.bytes); wipe(d); r = { ...r, bytes: await d.save({ useObjectStreams: true }) }; }
    P.set(1, 1, 'optimising the structure with qpdf…');
    const q = await qpdf(r.bytes, ['--object-streams=generate', '--compress-streams=y', '--recompress-flate', '--compression-level=9', '--remove-unreferenced-resources=yes', 'IN', 'OUT']);
    const best = q.out && q.code !== 2 && q.out.length < r.bytes.length ? q.out : r.bytes;
    const after = best.length;
    kv($('#out'), [['before', fmtSize(before)], ['after', fmtSize(after), after < before ? `−${Math.round((100 * (before - after)) / before)} %` : 'no gain'], ['details', r.note]]);
    if (after >= before) P.done('could not make this file smaller — the original is already compact', 'warn');
    else { download(outName(cur().file.name, 'compressed'), best, 'application/pdf'); P.done(`saved ${fmtSize(before - after)}`); }
  } catch (e) { P.done(''); fail($('#msg'), e); }
});
