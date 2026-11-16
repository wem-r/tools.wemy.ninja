import { degrees } from 'pdf-lib';
import { $, el, msg } from '../js/tk.js';
import { single, openJs, openLib, newDoc, thumb, savePdf, outName, progress, fail, tick } from './lib/pdf.js';

let pages = [], src = null, js = null; // pages: [{ i (source index), rot, off }]
const P = progress($('#bar'), $('#msg'));
const thumbs = new Map();

function draw() {
  const grid = $('#pages');
  grid.replaceChildren(...pages.map((p, k) => {
    const c = thumbs.get(p.i);
    const img = el('canvas', { style: `transform: rotate(${p.rot}deg)` });
    if (c) { img.width = c.width; img.height = c.height; img.getContext('2d').drawImage(c, 0, 0); }
    const card = el('div', { class: `tk-page${p.off ? ' off' : ''}`, draggable: 'true', 'data-k': k },
      img, el('span', { class: 'n', text: `${k + 1} · p.${p.i + 1}${p.rot ? ` · ${p.rot}°` : ''}` }),
      el('div', { class: 'ops' },
        el('button', { type: 'button', title: 'rotate left', text: '⟲', onclick: () => { p.rot = (p.rot + 270) % 360; draw(); } }),
        el('button', { type: 'button', title: 'rotate right', text: '⟳', onclick: () => { p.rot = (p.rot + 90) % 360; draw(); } }),
        el('button', { type: 'button', title: 'duplicate', text: '⧉', onclick: () => { pages.splice(k + 1, 0, { ...p }); draw(); } }),
        el('button', { type: 'button', title: p.off ? 'restore' : 'delete', text: p.off ? '↺' : '✕', onclick: () => { p.off = !p.off; draw(); } })));
    card.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', k); card.classList.add('drag'); });
    card.addEventListener('dragend', () => card.classList.remove('drag'));
    card.addEventListener('dragover', (e) => { e.preventDefault(); card.classList.add('over'); });
    card.addEventListener('dragleave', () => card.classList.remove('over'));
    card.addEventListener('drop', (e) => {
      e.preventDefault(); e.stopPropagation();
      const from = +e.dataTransfer.getData('text/plain'); if (Number.isNaN(from) || from === k) return;
      const [m] = pages.splice(from, 1); pages.splice(k, 0, m); draw();
    });
    return card;
  }));
  const kept = pages.filter((p) => !p.off).length;
  msg($('#msg'), `${kept} page${kept === 1 ? '' : 's'} in the output${pages.length !== kept ? ` · ${pages.length - kept} deleted` : ''}`, 'ok');
}

const cur = single(async (f) => {
  src = await openLib(f.bytes); js = await openJs(f.bytes);
  pages = Array.from({ length: js.numPages }, (_, i) => ({ i, rot: 0, off: false }));
  thumbs.clear(); $('#ui').hidden = false; draw();
  for (let i = 0; i < js.numPages; i++) { thumbs.set(i, await thumb(js, i, 160)); if (i % 4 === 3 || i === js.numPages - 1) { draw(); await tick(); } }
});
const all = (fn) => { pages.forEach(fn); draw(); };
$('#rl').addEventListener('click', () => all((p) => { p.rot = (p.rot + 270) % 360; }));
$('#rr').addEventListener('click', () => all((p) => { p.rot = (p.rot + 90) % 360; }));
$('#rev').addEventListener('click', () => { pages.reverse(); draw(); });
$('#reset').addEventListener('click', () => { pages = Array.from({ length: js.numPages }, (_, i) => ({ i, rot: 0, off: false })); draw(); });
$('#save').addEventListener('click', async () => {
  try {
    const keep = pages.filter((p) => !p.off);
    if (!keep.length) return msg($('#msg'), 'every page is deleted');
    const out = await newDoc();
    const copied = await out.copyPages(src, keep.map((p) => p.i));
    copied.forEach((pg, k) => { pg.setRotation(degrees((pg.getRotation().angle + keep[k].rot) % 360)); out.addPage(pg); });
    await savePdf(out, outName(cur().file.name, 'organized'));
    P.done(`saved ${keep.length} pages`);
  } catch (e) { fail($('#msg'), e); }
});
