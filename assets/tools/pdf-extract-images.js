import { $, el, msg } from '../js/tk.js';
import { single, openLib, canvasBytes, saveZip, outName, progress, fail, tick } from './lib/pdf.js';
import { images, toRGBA } from './lib/pdfimages.js';
import { fmtSize } from './lib/files.js';

let files = [];
const P = progress($('#bar'), $('#msg'));
const cur = single(async (f) => {
  const doc = await openLib(f.bytes), n = images(doc).length;
  $('#ui').hidden = false; $('#pv').replaceChildren(); $('#zip').disabled = true;
  msg($('#msg'), `${n} image object(s) in the file`, 'ok');
});
$('#go').addEventListener('click', async () => {
  try {
    const doc = await openLib(cur().bytes), list = images(doc), min = +$('#min').value || 0;
    files = []; let skipped = 0, small = 0; const pv = [];
    for (let k = 0; k < list.length; k++) {
      const img = list[k];
      P.set(k, list.length, `image ${k + 1} / ${list.length}…`);
      if (img.w < min || img.h < min) { small++; continue; }
      let bytes = null, ext = '';
      if (img.filters.length === 1 && img.filters[0] === 'DCTDecode') { bytes = img.stream.contents; ext = 'jpg'; }
      else if (img.filters.length === 1 && img.filters[0] === 'JPXDecode') { bytes = img.stream.contents; ext = 'jp2'; }
      else {
        const rgba = toRGBA(doc, img);
        if (!rgba) { skipped++; continue; }
        const c = document.createElement('canvas'); c.width = rgba.w; c.height = rgba.h;
        c.getContext('2d').putImageData(new ImageData(rgba.data, rgba.w, rgba.h), 0, 0);
        bytes = await canvasBytes(c, 'image/png'); ext = 'png';
      }
      const name = `image-${String(files.length + 1).padStart(3, '0')}-${img.w}x${img.h}.${ext}`;
      files.push([name, bytes]);
      if (pv.length < 24 && ext !== 'jp2') pv.push(el('div', { class: 'tk-page' }, el('img', { src: URL.createObjectURL(new Blob([bytes], { type: ext === 'png' ? 'image/png' : 'image/jpeg' })), loading: 'lazy' }), el('span', { class: 'n', text: `${img.w}×${img.h} · ${ext} · ${fmtSize(bytes.length)}` })));
      if (k % 8 === 7) await tick();
    }
    $('#pv').replaceChildren(...pv);
    $('#zip').disabled = !files.length;
    P.done(`${files.length} image(s) extracted${small ? ` · ${small} too small` : ''}${skipped ? ` · ${skipped} in an unsupported format` : ''}`, files.length ? 'ok' : 'warn');
  } catch (e) { P.done(''); fail($('#msg'), e); }
});
$('#zip').addEventListener('click', () => saveZip(outName(cur().file.name, 'images', 'zip'), files));
