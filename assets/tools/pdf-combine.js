import { $, el, msg } from '../js/tk.js';
import { pdfDrop, openLib, newDoc, savePdf, isPdf, progress, fail } from './lib/pdf.js';
import { parseRanges } from './lib/pages.js';
import { fmtSize } from './lib/files.js';
import { PDFName, PDFString, PDFNumber } from 'pdf-lib';

let files = []; // { file, bytes, doc, n, range }
const P = progress($('#bar'), $('#msg'));
function draw() {
  $('#files').replaceChildren(...files.map((f, i) => el('li', {},
    el('span', { class: 'nm', text: f.file.name, title: f.file.name }), el('span', { class: 'dim', text: `${f.n} p · ${fmtSize(f.bytes.length)}` }),
    el('input', { value: f.range, placeholder: 'all pages', class: 'short', style: 'width:9em', spellcheck: 'false', oninput: (e) => { f.range = e.target.value; } }),
    el('button', { type: 'button', class: 'tk-copy', text: '↑', onclick: () => { if (i) { [files[i - 1], files[i]] = [files[i], files[i - 1]]; draw(); } } }),
    el('button', { type: 'button', class: 'tk-copy', text: '↓', onclick: () => { if (i < files.length - 1) { [files[i + 1], files[i]] = [files[i], files[i + 1]]; draw(); } } }),
    el('button', { type: 'button', class: 'tk-copy', text: '✕', onclick: () => { files.splice(i, 1); draw(); } }))));
  msg($('#msg'), files.length ? `${files.length} file(s) · ${files.reduce((a, f) => a + f.n, 0)} pages` : '', 'ok');
}
pdfDrop($('#drop'), async (list) => {
  for (const f of list) {
    if (!isPdf(f.bytes)) { msg($('#msg'), `${f.file.name} is not a PDF — skipped`); continue; }
    try { const doc = await openLib(f.bytes); files.push({ ...f, doc, n: doc.getPageCount(), range: '' }); }
    catch (e) { fail($('#msg'), new Error(`${f.file.name}: ${e.message}`)); }
  }
  draw();
}, { multiple: true });
$('#sort').addEventListener('click', () => { files.sort((a, b) => a.file.name.localeCompare(b.file.name, undefined, { numeric: true })); draw(); });
$('#clear').addEventListener('click', () => { files = []; draw(); });
$('#save').addEventListener('click', async () => {
  if (files.length < 1) return msg($('#msg'), 'add at least one PDF');
  try {
    const out = await newDoc();
    const marks = [];
    for (let k = 0; k < files.length; k++) {
      const f = files[k];
      P.set(k, files.length, `adding ${f.file.name}…`);
      const idx = parseRanges(f.range, f.n);
      const pages = await out.copyPages(f.doc, idx);
      marks.push([f.file.name.replace(/\.pdf$/i, ''), out.getPageCount()]);
      pages.forEach((p) => out.addPage(p));
    }
    if ($('#bm').checked && files.length > 1) outline(out, marks);
    await savePdf(out, 'combined.pdf');
    P.done(`combined ${files.length} files · ${out.getPageCount()} pages`);
  } catch (e) { P.done(''); fail($('#msg'), e); }
});

/** Flat outline (bookmarks): one entry per source file. */
function outline(doc, marks) {
  const ctx = doc.context, root = ctx.nextRef(), refs = marks.map(() => ctx.nextRef()), pages = doc.getPages();
  marks.forEach(([title, at], i) => {
    const d = ctx.obj({});
    d.set(PDFName.of('Title'), PDFString.of(title));
    d.set(PDFName.of('Parent'), root);
    d.set(PDFName.of('Dest'), ctx.obj([pages[at].ref, PDFName.of('XYZ'), null, null, null]));
    if (i > 0) d.set(PDFName.of('Prev'), refs[i - 1]);
    if (i < marks.length - 1) d.set(PDFName.of('Next'), refs[i + 1]);
    ctx.assign(refs[i], d);
  });
  ctx.assign(root, ctx.obj({ Type: 'Outlines', First: refs[0], Last: refs.at(-1), Count: PDFNumber.of(marks.length) }));
  doc.catalog.set(PDFName.of('Outlines'), root);
  doc.catalog.set(PDFName.of('PageMode'), PDFName.of('UseOutlines'));
}
