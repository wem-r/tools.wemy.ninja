import { StandardFonts, rgb } from 'pdf-lib';
import { $, el, msg, pick } from '../js/tk.js';
import { single, openJs, openLib, savePdf, outName, fail } from './lib/pdf.js';
import { view } from './lib/stamp.js';
import { viewer } from './lib/viewer.js';

let js = null, v = null, fields = []; // { page, x, y, w, h (points, displayed top-left), type, name, options }
const stage = $('#stage');
const counters = {};
function drawBoxes() {
  stage.querySelectorAll('.item').forEach((e) => e.remove());
  for (const f of fields.filter((x) => x.page === v.n)) {
    const d = el('div', { class: 'item', title: f.name, text: f.type === 'checkbox' ? '☐' : f.name });
    Object.assign(d.style, { left: `${f.x * v.scale}px`, top: `${f.y * v.scale}px`, width: `${f.w * v.scale}px`, height: `${f.h * v.scale}px`, fontSize: '10px', background: 'rgba(91,191,161,.18)', color: 'var(--fg)', overflow: 'hidden' });
    stage.append(d);
  }
  $('#list').replaceChildren(el('tr', {}, ...['page', 'type', 'name', ''].map((t) => el('th', { text: t }))), ...fields.map((f, i) => el('tr', {},
    el('td', { text: f.page }), el('td', { class: 'dim', text: f.type }),
    el('td', {}, el('input', { value: f.name, spellcheck: 'false', onchange: (e) => { f.name = e.target.value.trim() || f.name; drawBoxes(); } })),
    el('td', {}, el('button', { type: 'button', class: 'tk-copy', text: '✕', onclick: () => { fields.splice(i, 1); drawBoxes(); } })))));
}
let s = null, ghost = null;
stage.addEventListener('pointerdown', (e) => { if (!v || e.target !== $('#cv')) return; stage.setPointerCapture(e.pointerId); s = v.pt(e); ghost = el('div', { class: 'box', style: 'background:rgba(91,191,161,.25);border-color:var(--cyan)' }); stage.append(ghost); });
stage.addEventListener('pointermove', (e) => { if (!s) return; const [x, y] = v.pt(e); Object.assign(ghost.style, { left: `${Math.min(x, s[0]) * v.scale}px`, top: `${Math.min(y, s[1]) * v.scale}px`, width: `${Math.abs(x - s[0]) * v.scale}px`, height: `${Math.abs(y - s[1]) * v.scale}px` }); });
stage.addEventListener('pointerup', (e) => {
  if (!s) return;
  const [x, y] = v.pt(e), type = pick('ft');
  let w = Math.abs(x - s[0]), h = Math.abs(y - s[1]), x0 = Math.min(x, s[0]), y0 = Math.min(y, s[1]);
  if (w < 6 || h < 6) { // a click: default sizes
    [w, h] = { text: [160, 20], multiline: [220, 70], checkbox: [14, 14], dropdown: [140, 20], signature: [180, 50] }[type];
    x0 = s[0]; y0 = s[1] - h / 2;
  }
  if (type === 'checkbox') { const k = Math.min(w, h); w = h = k; }
  counters[type] = (counters[type] || 0) + 1;
  fields.push({ page: v.n, x: x0, y: y0, w, h, type, name: `${type}${counters[type]}`, options: $('#opts').value.split(',').map((o) => o.trim()).filter(Boolean) });
  s = null; ghost.remove(); drawBoxes();
});
$('#undo').addEventListener('click', () => { fields.pop(); drawBoxes(); });
const cur = single(async (f) => {
  js = await openJs(f.bytes); fields = [];
  $('#ui').hidden = false;
  v = viewer(js, { onShow: drawBoxes });
  await v.show(1);
  msg($('#msg'), 'choose a field type, then drag (or click) on the page', 'ok');
});
$('#save').addEventListener('click', async () => {
  if (!fields.length) return msg($('#msg'), 'add at least one field');
  try {
    const doc = await openLib(cur().bytes), form = doc.getForm(), font = await doc.embedFont(StandardFonts.Helvetica);
    const used = new Set(form.getFields().map((f) => f.getName()));
    for (const f of fields) {
      let name = f.name; while (used.has(name)) name += '_'; used.add(name);
      const page = doc.getPage(f.page - 1), vw = view(page);
      if (vw.rot) throw new Error(`page ${f.page} is rotated: fields are only supported on upright pages (use Organize to save it upright first)`);
      const o = { x: f.x, y: vw.H - f.y - f.h, width: f.w, height: f.h, borderColor: rgb(0.45, 0.45, 0.45), borderWidth: 0.6, font };
      if (f.type === 'text' || f.type === 'multiline' || f.type === 'signature') {
        const t = form.createTextField(name);
        if (f.type === 'multiline') t.enableMultiline();
        t.addToPage(page, o);
        if (f.type === 'signature') page.drawText('sign here', { x: o.x + 2, y: o.y - 9, size: 7, font, color: rgb(0.5, 0.5, 0.5) });
      } else if (f.type === 'checkbox') form.createCheckBox(name).addToPage(page, o);
      else { const d = form.createDropdown(name); d.addOptions(f.options.length ? f.options : ['option 1', 'option 2']); d.addToPage(page, o); }
    }
    form.updateFieldAppearances(font);
    await savePdf(doc, outName(cur().file.name, 'form'));
    msg($('#msg'), `${fields.length} field(s) added`, 'ok');
  } catch (e) { fail($('#msg'), e); }
});
