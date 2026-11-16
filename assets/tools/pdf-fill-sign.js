import { PDFTextField, PDFCheckBox, PDFDropdown, PDFRadioGroup, PDFOptionList, StandardFonts, rgb } from 'pdf-lib';
import { $, $$, el, live, msg, pick } from '../js/tk.js';
import { single, openJs, openLib, savePdf, outName, canvasBytes, fail, winAnsi } from './lib/pdf.js';
import { view } from './lib/stamp.js';
import { viewer, draggable } from './lib/viewer.js';

let js = null, v = null, items = [], sigImage = null; // items: { page, x, y, w, h, kind, text?, png? } (points, top-left origin)
const stage = $('#stage');

// ---- signature pad ----
const pad = $('#pad'), pctx = pad.getContext('2d');
let drawing = false, drawn = false;
pctx.lineWidth = 2.4; pctx.lineCap = pctx.lineJoin = 'round'; pctx.strokeStyle = '#0b2a6b';
const pp = (e) => { const r = pad.getBoundingClientRect(); return [((e.clientX - r.left) * pad.width) / r.width, ((e.clientY - r.top) * pad.height) / r.height]; };
pad.addEventListener('pointerdown', (e) => { pad.setPointerCapture(e.pointerId); drawing = true; pctx.beginPath(); pctx.moveTo(...pp(e)); });
pad.addEventListener('pointermove', (e) => { if (!drawing) return; pctx.lineTo(...pp(e)); pctx.stroke(); drawn = true; });
pad.addEventListener('pointerup', () => { drawing = false; });
$('#sigclear').addEventListener('click', () => { pctx.clearRect(0, 0, pad.width, pad.height); drawn = false; $('#sigtext').value = ''; });
live($$('input[name="sig"]'), () => $$('[data-s]').forEach((e) => { e.hidden = e.dataset.s !== pick('sig'); }));
$('#sigimg').addEventListener('change', async () => { const f = $('#sigimg').files[0]; sigImage = f ? await f.arrayBuffer() : null; });

/** Current signature as a trimmed PNG canvas. */
async function signatureCanvas() {
  const mode = pick('sig');
  let c = document.createElement('canvas');
  if (mode === 'draw') { if (!drawn) throw new Error('draw a signature first'); c.width = pad.width; c.height = pad.height; c.getContext('2d').drawImage(pad, 0, 0); }
  else if (mode === 'type') {
    const t = $('#sigtext').value.trim(); if (!t) throw new Error('type your name first');
    const font = "64px 'Segoe Script', 'Brush Script MT', 'Snell Roundhand', cursive";
    const x = c.getContext('2d'); x.font = font; c.width = Math.ceil(x.measureText(t).width) + 20; c.height = 100;
    const y = c.getContext('2d'); y.font = font; y.fillStyle = '#0b2a6b'; y.textBaseline = 'middle'; y.fillText(t, 10, 52);
  } else {
    if (!sigImage) throw new Error('choose a signature image');
    const img = new Image(); img.src = URL.createObjectURL(new Blob([sigImage])); await img.decode();
    c.width = img.naturalWidth; c.height = img.naturalHeight; c.getContext('2d').drawImage(img, 0, 0);
  }
  return trim(c);
}
function trim(c) {
  const x = c.getContext('2d'), d = x.getImageData(0, 0, c.width, c.height).data;
  let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
  for (let y = 0; y < c.height; y++) for (let i = 0; i < c.width; i++) { const k = (y * c.width + i) * 4; if (d[k + 3] > 10 && (d[k] < 235 || d[k + 1] < 235 || d[k + 2] < 235)) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
  if (x1 <= x0) return c;
  const o = document.createElement('canvas'); o.width = x1 - x0 + 8; o.height = y1 - y0 + 8;
  o.getContext('2d').drawImage(c, x0 - 4, y0 - 4, o.width, o.height, 0, 0, o.width, o.height);
  return o;
}

function drawItems() {
  stage.querySelectorAll('.item').forEach((e) => e.remove());
  items.forEach((it, k) => {
    if (it.page !== v.n) return;
    const d = el('div', { class: 'item' });
    Object.assign(d.style, { left: `${it.x * v.scale}px`, top: `${it.y * v.scale}px`, width: `${it.w * v.scale}px`, height: `${it.h * v.scale}px` });
    if (it.png) d.append(el('img', { src: it.png.toDataURL(), style: 'width:100%;height:100%;pointer-events:none' }));
    else { d.textContent = it.text; d.style.fontSize = `${it.size * v.scale}px`; d.style.fontFamily = 'Helvetica, Arial, sans-serif'; }
    d.append(el('span', { class: 'x', text: '✕', onclick: () => { items.splice(k, 1); drawItems(); } }));
    draggable(d, v, (dx, dy) => { it.x += dx; it.y += dy; d.style.left = `${it.x * v.scale}px`; d.style.top = `${it.y * v.scale}px`; });
    stage.append(d);
  });
}
stage.addEventListener('click', async (e) => {
  if (!v || e.target !== $('#cv')) return;
  const [x, y] = v.pt(e), put = pick('put');
  try {
    if (put === 'sig') { const c = await signatureCanvas(); const w = 150, h = (w * c.height) / c.width; items.push({ page: v.n, x: x - w / 2, y: y - h / 2, w, h, png: c }); }
    else {
      const text = put === 'date' ? new Date().toLocaleDateString() : $('#initials').value.trim();
      if (!text) throw new Error(`type the ${put} first`);
      const size = put === 'initials' ? 14 : 11;
      items.push({ page: v.n, x, y: y - size / 2, w: text.length * size * 0.55 + 4, h: size * 1.2, text, size });
    }
    drawItems();
  } catch (err) { msg($('#msg'), err.message); }
});

function fieldsUI(doc) {
  const fields = doc.getForm().getFields();
  $('#formbox').hidden = !fields.length;
  $('#fields').replaceChildren(...fields.map((f) => {
    const name = f.getName();
    let input;
    if (f instanceof PDFTextField) input = el('input', { value: f.getText() || '', 'data-f': name, spellcheck: 'false' });
    else if (f instanceof PDFCheckBox) input = el('label', { class: 'chk' }, el('input', { type: 'checkbox', checked: f.isChecked(), 'data-f': name }), 'checked');
    else if (f instanceof PDFDropdown || f instanceof PDFOptionList || f instanceof PDFRadioGroup) {
      const opts = f.getOptions(), sel = f instanceof PDFRadioGroup ? f.getSelected() : f.getSelected()[0];
      input = el('select', { 'data-f': name }, el('option', { value: '', text: '—' }), ...opts.map((o) => el('option', { value: o, text: o, selected: o === sel })));
    } else return null;
    return el('div', { class: 'tk-field' }, el('div', { class: 'tk-label' }, el('span', { text: name })), input);
  }));
}

const cur = single(async (f) => {
  js = await openJs(f.bytes); fieldsUI(await openLib(f.bytes)); items = [];
  $('#ui').hidden = false;
  v = viewer(js, { onShow: drawItems });
  await v.show(1);
  msg($('#msg'), 'fill the fields, then click on the page to place your signature', 'ok');
});

$('#save').addEventListener('click', async () => {
  try {
    const doc = await openLib(cur().bytes), form = doc.getForm(), font = await doc.embedFont(StandardFonts.Helvetica);
    for (const i of $$('[data-f]')) {
      const f = form.getField(i.dataset.f);
      if (f instanceof PDFTextField) f.setText(i.value);
      else if (f instanceof PDFCheckBox) (i.checked ? f.check() : f.uncheck());
      else if (i.value) f.select(i.value);
    }
    for (const it of items) {
      const page = doc.getPage(it.page - 1), vw = view(page);
      // items are in displayed top-left coordinates → displayed bottom-left → page space
      const bx = it.x, by = vw.H - it.y - it.h;
      if (it.png) {
        const img = await doc.embedPng(await canvasBytes(it.png, 'image/png'));
        const [x, y] = vw.map(bx, by);
        page.drawImage(img, { x, y, width: it.w, height: it.h, rotate: { type: 'degrees', angle: vw.rot } });
      } else {
        const [x, y] = vw.map(bx + 2, by + it.size * 0.25);
        page.drawText(winAnsi(it.text), { x, y, size: it.size, font, color: rgb(0.04, 0.16, 0.42), rotate: { type: 'degrees', angle: vw.rot } });
      }
    }
    if ($('#flat').checked) form.flatten(); else form.updateFieldAppearances(font);
    await savePdf(doc, outName(cur().file.name, 'signed'));
    msg($('#msg'), 'saved', 'ok');
  } catch (e) { fail($('#msg'), e); }
});
