import { $, el, msg, pick, download } from '../js/tk.js';
import { single, openJs, render, canvasBytes, saveZip, outName, progress, fail, tick } from './lib/pdf.js';
import { parseRanges } from './lib/pages.js';

let js = null;
const P = progress($('#bar'), $('#msg'));
const cur = single(async (f) => { js = await openJs(f.bytes); $('#ui').hidden = false; msg($('#msg'), `${js.numPages} pages`, 'ok'); });
$('#save').addEventListener('click', async () => {
  try {
    const idx = parseRanges($('#pages').value, js.numPages), fmt = pick('fmt'), dpi = +$('#dpi').value || 150, q = (+$('#q').value || 88) / 100;
    const ext = fmt === 'jpeg' ? 'jpg' : fmt, files = [], pv = [];
    for (let k = 0; k < idx.length; k++) {
      P.set(k, idx.length, `page ${idx[k] + 1}…`);
      const page = await js.getPage(idx[k] + 1);
      const c = await render(page, dpi / 72, { background: fmt === 'png' && $('#transp').checked ? 'rgba(0,0,0,0)' : '#ffffff' });
      files.push([outName(cur().file.name, `p${String(idx[k] + 1).padStart(String(js.numPages).length, '0')}`, ext), await canvasBytes(c, `image/${fmt}`, q)]);
      if (pv.length < 12) { const t = document.createElement('canvas'); const s = 160 / c.width; t.width = 160; t.height = c.height * s; t.getContext('2d').drawImage(c, 0, 0, t.width, t.height); pv.push(el('div', { class: 'tk-page' }, t, el('span', { class: 'n', text: `p.${idx[k] + 1} · ${c.width}×${c.height}` }))); }
      await tick();
    }
    $('#pv').replaceChildren(...pv);
    if (files.length === 1) download(files[0][0], files[0][1], `image/${fmt}`);
    else saveZip(outName(cur().file.name, 'images', 'zip'), files);
    P.done(`${files.length} image(s) · ${(files.reduce((a, f) => a + f[1].length, 0) / 1048576).toFixed(1)} MB`);
  } catch (e) { P.done(''); fail($('#msg'), e); }
});
