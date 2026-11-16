import { createWorker } from 'tesseract.js';
import { $, msg, pick, download } from '../js/tk.js';
import { pdfDrop, openJs, openLib, newDoc, render, canvasBytes, outName, progress, fail, isPdf } from './lib/pdf.js';
import { parseRanges } from './lib/pages.js';
import { view } from './lib/stamp.js';

let input = [], resultPdf = null, resultText = '', stop = false;
const P = progress($('#bar'), $('#msg'));
const base = location.origin + '/vendor/tesseract';
pdfDrop($('#drop'), (list) => {
  input = list; $('#ui').hidden = false;
  const pdf = list.find((f) => isPdf(f.bytes));
  msg($('#msg'), pdf ? `${pdf.file.name}` : `${list.length} image(s)`, 'ok');
}, { multiple: true, accept: '.pdf,application/pdf,image/*' });

$('#stop').addEventListener('click', () => { stop = true; });
$('#go').addEventListener('click', async () => {
  if (!input.length) return;
  stop = false; $('#go').disabled = true; $('#stop').hidden = false; $('#dlpdf').disabled = $('#dltxt').disabled = true; $('#out').value = '';
  let worker;
  try {
    P.set(0, 1, 'loading the OCR engine…');
    worker = await createWorker(pick('lang'), 1, {
      workerPath: `${base}/worker.min.js`, corePath: `${base}/core`, langPath: `${base}/lang`, gzip: true, workerBlobURL: false,
      logger: (m) => { if (m.status === 'recognizing text') P.set(m.progress, 1); else if (m.status && m.progress != null) P.set(m.progress, 1, `${m.status}…`); },
    });
    const pdfIn = input.find((f) => isPdf(f.bytes));
    const out = pdfIn ? await openLib(pdfIn.bytes) : await newDoc();
    const texts = [];
    const ocrCanvas = async (canvas, label) => {
      P.set(0, 1, `${label}: recognising…`);
      const { data } = await worker.recognize(canvas, { pdfTitle: 'OCR', pdfTextOnly: true }, { text: true, pdf: true });
      texts.push(`──── ${label} ────\n${data.text.trim()}`);
      $('#out').value = texts.join('\n\n');
      return (await newDocFrom(data.pdf));
    };
    const newDocFrom = async (bytes) => (await openLib(Uint8Array.from(bytes)));
    if (pdfIn) {
      const js = await openJs(pdfIn.bytes), dpi = +$('#dpi').value || 300, idx = [...new Set(parseRanges($('#pages').value, js.numPages))];
      for (const i of idx) {
        if (stop) break;
        const page = await js.getPage(i + 1);
        const c = await render(page, dpi / 72);
        const layer = await ocrCanvas(c, `page ${i + 1}`);
        // draw the invisible text layer over the original page, sized to the page as displayed
        const [emb] = await out.embedPdf(layer, [0]);
        const pg = out.getPage(i), v = view(pg);
        const [x, y] = v.map(0, 0);
        pg.drawPage(emb, { x, y, xScale: v.W / emb.width, yScale: v.H / emb.height, rotate: { type: 'degrees', angle: v.rot } });
      }
    } else {
      for (const f of input) {
        if (stop) break;
        const blob = new Blob([f.bytes]), img = new Image(); img.src = URL.createObjectURL(blob); await img.decode();
        const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; c.getContext('2d').drawImage(img, 0, 0);
        const layer = await ocrCanvas(c, f.file.name);
        const W = c.width * 0.75, H = c.height * 0.75, page = out.addPage([W, H]);
        page.drawImage(await out.embedJpg(await canvasBytes(c, 'image/jpeg', 0.85)), { x: 0, y: 0, width: W, height: H });
        const [emb] = await out.embedPdf(layer, [0]);
        page.drawPage(emb, { x: 0, y: 0, xScale: W / emb.width, yScale: H / emb.height });
      }
    }
    resultPdf = await out.save({ useObjectStreams: true }); resultText = $('#out').value;
    $('#dlpdf').disabled = $('#dltxt').disabled = false;
    P.done(stop ? 'stopped — partial result ready' : 'done: download the searchable PDF or the text', stop ? 'warn' : 'ok');
  } catch (e) { P.done(''); fail($('#msg'), e); }
  finally { await worker?.terminate(); $('#go').disabled = false; $('#stop').hidden = true; }
});
const name = () => (input.find((f) => isPdf(f.bytes))?.file.name || 'scan.pdf');
$('#dlpdf').addEventListener('click', () => download(outName(name(), 'ocr'), resultPdf, 'application/pdf'));
$('#dltxt').addEventListener('click', () => download(outName(name(), 'ocr', 'txt'), resultText));
