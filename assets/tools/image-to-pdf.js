import exifr from 'exifr';
import { $, el, msg } from '../js/tk.js';
import { dropzone, fmtSize } from './lib/files.js';
import { newDoc, canvasBytes, savePdf, progress, fail, tick } from './lib/pdf.js';
import { SIZES } from './lib/pages.js';

let files = [];
const P = progress($('#bar'), $('#msg'));
const MM = 72 / 25.4;
function draw() {
  $('#files').replaceChildren(...files.map((f, i) => el('li', {},
    el('img', { src: f.url, style: 'width:42px;height:42px;object-fit:cover;border-radius:3px' }),
    el('span', { class: 'nm', text: f.file.name }), el('span', { class: 'dim', text: fmtSize(f.file.size) }),
    el('button', { type: 'button', class: 'tk-copy', text: '↑', onclick: () => { if (i) { [files[i - 1], files[i]] = [files[i], files[i - 1]]; draw(); } } }),
    el('button', { type: 'button', class: 'tk-copy', text: '↓', onclick: () => { if (i < files.length - 1) { [files[i + 1], files[i]] = [files[i], files[i + 1]]; draw(); } } }),
    el('button', { type: 'button', class: 'tk-copy', text: '✕', onclick: () => { URL.revokeObjectURL(f.url); files.splice(i, 1); draw(); } }))));
  msg($('#msg'), files.length ? `${files.length} image(s)` : '', 'ok');
}
dropzone($('#drop'), (list) => { for (const file of list) if (/^image\//.test(file.type) || /\.(heic|avif)$/i.test(file.name)) files.push({ file, url: URL.createObjectURL(file) }); draw(); });

/** Embed one image, upright: JPEG / PNG as stored when possible, everything else via a canvas. */
async function embed(doc, f) {
  const bytes = new Uint8Array(await f.file.arrayBuffer());
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8, png = bytes[0] === 0x89 && bytes[1] === 0x50;
  let orient = 1;
  if (jpeg) { try { orient = (await exifr.orientation(bytes)) || 1; } catch { orient = 1; } }
  if (png) return doc.embedPng(bytes);
  if (jpeg && orient === 1) return doc.embedJpg(bytes);
  const img = new Image(); img.src = f.url; await img.decode(); // browsers apply the EXIF orientation when drawing
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0);
  return doc.embedJpg(await canvasBytes(c, 'image/jpeg', (+$('#q').value || 90) / 100));
}
$('#save').addEventListener('click', async () => {
  if (!files.length) return msg($('#msg'), 'add some images');
  try {
    const doc = await newDoc(), per = +$('#per').value, m = (+$('#margin').value || 0) * MM;
    const [cols, rows] = { 1: [1, 1], 2: [1, 2], 4: [2, 2], 6: [2, 3] }[per];
    let page = null, W = 0, H = 0;
    for (let i = 0; i < files.length; i++) {
      P.set(i, files.length, `image ${i + 1} / ${files.length}…`);
      const img = await embed(doc, files[i]);
      const slot = i % per;
      if (slot === 0) {
        if ($('#size').value === 'fit' && per === 1) { W = img.width * 0.75 + 2 * m; H = img.height * 0.75 + 2 * m; }
        else {
          [W, H] = SIZES[$('#size').value === 'fit' ? 'A4' : $('#size').value];
          const o = $('#orient').value, land = o === 'l' || (o === 'auto' && per === 1 && img.width > img.height);
          if (land) [W, H] = [H, W];
        }
        page = doc.addPage([W, H]);
      }
      const cw = (W - 2 * m) / cols, ch = (H - 2 * m) / rows, c = slot % cols, r = Math.floor(slot / cols);
      const pad = per > 1 ? 4 : 0, s = Math.min((cw - 2 * pad) / img.width, (ch - 2 * pad) / img.height);
      const w = img.width * s, h = img.height * s;
      page.drawImage(img, { x: m + c * cw + (cw - w) / 2, y: H - m - (r + 1) * ch + (ch - h) / 2, width: w, height: h });
      await tick();
    }
    await savePdf(doc, files.length === 1 ? files[0].file.name.replace(/\.[^.]+$/, '.pdf') : 'images.pdf');
    P.done(`${files.length} image(s) on ${doc.getPageCount()} page(s)`);
  } catch (e) { P.done(''); fail($('#msg'), e); }
});
