import { $, $$, live, msg, pick } from '../js/tk.js';
import { single, openLib, openJs, newDoc, render, canvasBytes, savePdf, outName, progress, fail, tick } from './lib/pdf.js';

let doc = null;
const P = progress($('#bar'), $('#msg'));
live($$('input[name="mode"]'), () => $$('[data-m]').forEach((e) => { e.hidden = e.dataset.m !== pick('mode'); }));
const cur = single(async (f) => {
  doc = await openLib(f.bytes);
  const fields = doc.getForm().getFields().length;
  let annots = 0;
  for (const p of doc.getPages()) annots += p.node.Annots()?.size() || 0;
  $('#info').textContent = `${fields} form field(s), ${annots} annotation(s) (form fields count as annotations too). "Form fields" keeps the text layer; "everything" also burns comments, stamps and highlights in.`;
  $('#ui').hidden = false; msg($('#msg'), `${doc.getPageCount()} pages`, 'ok');
});
$('#save').addEventListener('click', async () => {
  try {
    if (pick('mode') === 'forms') {
      const d = await openLib(cur().bytes);
      d.getForm().flatten();
      await savePdf(d, outName(cur().file.name, 'flat'));
      return P.done('form fields flattened');
    }
    const js = await openJs(cur().bytes), out = await newDoc(), dpi = +$('#dpi').value || 150;
    for (let i = 1; i <= js.numPages; i++) {
      P.set(i - 1, js.numPages, `page ${i} / ${js.numPages}…`);
      const page = await js.getPage(i), vp = page.getViewport({ scale: 1 });
      const img = await out.embedJpg(await canvasBytes(await render(page, dpi / 72, { forms: true }), 'image/jpeg', 0.88));
      out.addPage([vp.width, vp.height]).drawImage(img, { x: 0, y: 0, width: vp.width, height: vp.height });
      await tick();
    }
    await savePdf(out, outName(cur().file.name, 'flat'));
    P.done('flattened to images');
  } catch (e) { P.done(''); fail($('#msg'), e); }
});
