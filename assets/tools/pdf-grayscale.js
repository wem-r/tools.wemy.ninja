import { $, live, msg } from '../js/tk.js';
import { single, openJs, newDoc, render, canvasBytes, savePdf, outName, progress, fail, tick } from './lib/pdf.js';

const P = progress($('#bar'), $('#msg'));
live($('#q'), () => { $('#qv').textContent = `${$('#q').value} %`; });
const cur = single(async (f) => { const js = await openJs(f.bytes); $('#ui').hidden = false; msg($('#msg'), `${js.numPages} pages`, 'ok'); await js.close(); });
$('#save').addEventListener('click', async () => {
  try {
    const js = await openJs(cur().bytes), out = await newDoc(), dpi = +$('#dpi').value || 150, bw = $('#bw').checked;
    for (let i = 1; i <= js.numPages; i++) {
      P.set(i - 1, js.numPages, `page ${i} / ${js.numPages}…`);
      const page = await js.getPage(i), vp = page.getViewport({ scale: 1 }), c = await render(page, dpi / 72), ctx = c.getContext('2d');
      const im = ctx.getImageData(0, 0, c.width, c.height), d = im.data;
      for (let k = 0; k < d.length; k += 4) { let g = 0.299 * d[k] + 0.587 * d[k + 1] + 0.114 * d[k + 2]; if (bw) g = g > 160 ? 255 : 0; d[k] = d[k + 1] = d[k + 2] = g; }
      ctx.putImageData(im, 0, 0);
      const img = bw ? await out.embedPng(await canvasBytes(c, 'image/png')) : await out.embedJpg(await canvasBytes(c, 'image/jpeg', (+$('#q').value || 80) / 100));
      out.addPage([vp.width, vp.height]).drawImage(img, { x: 0, y: 0, width: vp.width, height: vp.height });
      await tick();
    }
    await savePdf(out, outName(cur().file.name, 'grey'));
    P.done(`${js.numPages} pages converted`);
  } catch (e) { P.done(''); fail($('#msg'), e); }
});
