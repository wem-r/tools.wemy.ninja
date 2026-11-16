import { PDFName } from 'pdf-lib';
import { $, msg } from '../js/tk.js';
import { single, openJs, openLib, newDoc, render, canvasBytes, savePdf, outName, progress, fail, tick } from './lib/pdf.js';

let js = null, lib = null, pageNo = 1, scale = 1, vpW = 0, vpH = 0;
const boxes = new Map(); // page → [[x0, y0, x1, y1] in PDF points, top-left origin of the displayed page]
const P = progress($('#bar'), $('#msg'));
const cv = $('#cv'), stage = $('#stage');

async function show() {
  const page = await js.getPage(pageNo);
  const vp = page.getViewport({ scale: 1 });
  vpW = vp.width; vpH = vp.height;
  scale = Math.min(2, (stage.parentElement.clientWidth - 4) / vpW);
  await render(page, scale, { canvas: cv });
  cv.style.width = `${vpW * scale}px`;
  $('#pn').textContent = ` page ${pageNo} / ${js.numPages} `;
  drawBoxes();
}
function drawBoxes() {
  stage.querySelectorAll('.box').forEach((b) => b.remove());
  for (const [x0, y0, x1, y1] of boxes.get(pageNo) || []) {
    const b = document.createElement('div'); b.className = 'box';
    Object.assign(b.style, { left: `${x0 * scale}px`, top: `${y0 * scale}px`, width: `${(x1 - x0) * scale}px`, height: `${(y1 - y0) * scale}px` });
    stage.append(b);
  }
  const n = [...boxes.values()].reduce((a, l) => a + l.length, 0);
  $('#cnt').textContent = n ? `${n} box(es) on ${[...boxes.values()].filter((l) => l.length).length} page(s).` : '';
}
let start = null, live = null;
const pt = (e) => { const r = cv.getBoundingClientRect(); return [Math.max(0, Math.min(vpW, (e.clientX - r.left) / scale)), Math.max(0, Math.min(vpH, (e.clientY - r.top) / scale))]; };
stage.addEventListener('pointerdown', (e) => { if (!js) return; stage.setPointerCapture(e.pointerId); start = pt(e); live = document.createElement('div'); live.className = 'box'; stage.append(live); });
stage.addEventListener('pointermove', (e) => {
  if (!start) return; const [x, y] = pt(e);
  Object.assign(live.style, { left: `${Math.min(x, start[0]) * scale}px`, top: `${Math.min(y, start[1]) * scale}px`, width: `${Math.abs(x - start[0]) * scale}px`, height: `${Math.abs(y - start[1]) * scale}px` });
});
stage.addEventListener('pointerup', (e) => {
  if (!start) return; const [x, y] = pt(e);
  if (Math.abs(x - start[0]) > 2 && Math.abs(y - start[1]) > 2) boxes.set(pageNo, [...(boxes.get(pageNo) || []), [Math.min(x, start[0]), Math.min(y, start[1]), Math.max(x, start[0]), Math.max(y, start[1])]]);
  start = null; live?.remove(); drawBoxes();
});
$('#prev').addEventListener('click', () => { if (pageNo > 1) { pageNo--; show(); } });
$('#next').addEventListener('click', () => { if (pageNo < js.numPages) { pageNo++; show(); } });
$('#undo').addEventListener('click', () => { boxes.get(pageNo)?.pop(); drawBoxes(); });
$('#clearp').addEventListener('click', () => { boxes.delete(pageNo); drawBoxes(); });

const cur = single(async (f) => {
  js = await openJs(f.bytes); lib = await openLib(f.bytes); boxes.clear(); pageNo = 1;
  $('#ui').hidden = false; msg($('#msg'), `${js.numPages} pages — draw boxes over what must disappear`, 'ok');
  await show();
});
$('#save').addEventListener('click', async () => {
  const todo = [...boxes].filter(([, l]) => l.length);
  if (!todo.length) return msg($('#msg'), 'draw at least one box');
  try {
    const out = await newDoc(), dpi = +$('#dpi').value || 200;
    // copy only the untouched pages: copying a page to be redacted would leave its original
    // objects (the text!) in the file even if the page itself is never added
    const n = lib.getPageCount(), keep = [...Array(n).keys()].filter((i) => !boxes.get(i + 1)?.length);
    // internal links point at page objects: copying them would drag redacted pages along, so drop them
    const src = await openLib(cur().bytes);
    for (const i of keep) {
      const node = src.getPage(i).node, annots = node.Annots();
      if (!annots) continue;
      for (let a = annots.size() - 1; a >= 0; a--) {
        const d = src.context.lookup(annots.get(a));
        if (d?.get?.(PDFName.of('Subtype'))?.toString() === '/Link' && (d.get(PDFName.of('Dest')) || d.get(PDFName.of('A')))) annots.remove(a);
      }
    }
    const copied = new Map((await out.copyPages(src, keep)).map((p, k) => [keep[k], p]));
    for (let i = 0; i < n; i++) {
      const list = boxes.get(i + 1);
      if (!list?.length) { out.addPage(copied.get(i)); continue; }
      P.set(i, n, `rasterising page ${i + 1}…`);
      const page = await js.getPage(i + 1), vp = page.getViewport({ scale: 1 }), k = dpi / 72;
      const c = await render(page, k), ctx = c.getContext('2d');
      ctx.fillStyle = '#000';
      for (const [x0, y0, x1, y1] of list) ctx.fillRect(Math.floor(x0 * k), Math.floor(y0 * k), Math.ceil((x1 - x0) * k) + 1, Math.ceil((y1 - y0) * k) + 1);
      const img = await out.embedPng(await canvasBytes(c, 'image/png'));
      out.addPage([vp.width, vp.height]).drawImage(img, { x: 0, y: 0, width: vp.width, height: vp.height });
      await tick();
    }
    if ($('#meta').checked) { out.setTitle(''); out.setAuthor(''); out.setSubject(''); out.setKeywords([]); out.setCreator(''); out.setProducer(''); }
    else { out.setTitle(lib.getTitle() || ''); out.setAuthor(lib.getAuthor() || ''); }
    await savePdf(out, outName(cur().file.name, 'redacted'));
    P.done(`${todo.length} page(s) redacted — check the result before sharing it`);
  } catch (e) { P.done(''); fail($('#msg'), e); }
});
window.addEventListener('resize', () => js && show());
