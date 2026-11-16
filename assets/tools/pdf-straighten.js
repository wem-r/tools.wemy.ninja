import { $, el, msg } from '../js/tk.js';
import { single, openJs, openLib, newDoc, render, savePdf, outName, progress, fail, tick } from './lib/pdf.js';
import { skewAngle } from './lib/pages.js';

let js = null, angles = [];
const P = progress($('#bar'), $('#msg'));
function list() {
  $('#list').replaceChildren(el('tr', {}, ...['page', 'detected tilt (°)', ''].map((t) => el('th', { text: t }))), ...angles.map((a, i) => el('tr', {},
    el('td', { text: i + 1 }), el('td', {}, el('input', { type: 'number', step: '0.05', value: a ?? '', style: 'width:7em', oninput: (e) => { angles[i] = +e.target.value || 0; } })),
    el('td', { class: 'dim', text: a == null ? 'not measured' : Math.abs(a) < (+$('#min').value || 0) ? 'left as is' : a > 0 ? 'tilted clockwise' : 'tilted anticlockwise' }))));
}
async function detect() {
  angles = [];
  for (let i = 1; i <= js.numPages; i++) {
    P.set(i - 1, js.numPages, `measuring page ${i}…`);
    const c = await render(await js.getPage(i), 100 / 72), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, w = c.width;
    angles.push(skewAngle((x, y) => { const k = (y * w + x) * 4; return d[k] + d[k + 1] + d[k + 2] < 360; }, c.width, c.height, { range: 8, step: 0.2 }));
    list(); await tick();
  }
  P.done(`${angles.filter((a) => Math.abs(a) >= (+$('#min').value || 0)).length} page(s) to straighten`);
}
const cur = single(async (f) => { js = await openJs(f.bytes); $('#ui').hidden = false; angles = Array(js.numPages).fill(null); list(); await detect(); });
$('#detect').addEventListener('click', () => js && detect());
$('#save').addEventListener('click', async () => {
  try {
    const src = await openLib(cur().bytes), out = await newDoc(), min = +$('#min').value || 0;
    const pages = src.getPages(), emb = await out.embedPages(pages);
    pages.forEach((p, i) => {
      const a = angles[i] || 0, rot = p.getRotation().angle % 360;
      if (Math.abs(a) < min || rot) { out.addPage([emb[i].width, emb[i].height]).drawPage(emb[i]); if (rot) out.getPage(i).setRotation(p.getRotation()); return; }
      const W = emb[i].width, H = emb[i].height, page = out.addPage([W, H]);
      // rotate about the page centre: content tilted clockwise by a° is turned back anticlockwise by a°
      const t = (a * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t);
      const x = W / 2 - (c * W / 2 - s * H / 2), y = H / 2 - (s * W / 2 + c * H / 2);
      page.drawPage(emb[i], { x, y, rotate: { type: 'degrees', angle: a } });
    });
    await savePdf(out, outName(cur().file.name, 'straight'));
    msg($('#msg'), 'saved', 'ok');
  } catch (e) { fail($('#msg'), e); }
});
