// Shared PDF plumbing for the PDF tools: pdf.js (render / text), pdf-lib (edit), qpdf (encryption / repair),
// file picking, thumbnails, progress and downloads. Everything runs in the page; nothing is uploaded.
import * as pdfjs from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import { zipSync } from 'fflate';
import { $, el, msg, download } from '../../js/tk.js';
import { dropzone } from './files.js';

const V = '/vendor/pdfjs/';
pdfjs.GlobalWorkerOptions.workerSrc = V + 'pdf.worker.min.mjs';
export { pdfjs };

/** Open with pdf.js (render / text). A copy is passed because pdf.js transfers the buffer to its worker. */
export async function openJs(bytes, password) {
  const task = pdfjs.getDocument({ data: bytes.slice(), password, cMapUrl: V + 'cmaps/', cMapPacked: true, standardFontDataUrl: V + 'standard_fonts/', wasmUrl: V + 'wasm/', isEvalSupported: false });
  const doc = await task.promise;
  doc.close = () => task.destroy();
  return doc;
}

/** Open with pdf-lib. Encrypted files are refused with a clear message (use Unlock first). */
export async function openLib(bytes) {
  try { return await PDFDocument.load(bytes, { updateMetadata: false }); }
  catch (e) {
    if (/encrypted/i.test(e.message)) throw new Error('this PDF is encrypted: remove the password with the Unlock tool first');
    throw new Error(`cannot read this PDF: ${e.message}`);
  }
}
export const newDoc = () => PDFDocument.create({ updateMetadata: false });

/** Render a pdf.js page to a canvas at `scale` (1 = 72 dpi). */
export async function render(page, scale = 1, { canvas = document.createElement('canvas'), forms = false, background = '#ffffff' } = {}) {
  const vp = page.getViewport({ scale });
  canvas.width = Math.ceil(vp.width); canvas.height = Math.ceil(vp.height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = background; ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, canvas, viewport: vp, annotationMode: forms ? pdfjs.AnnotationMode.ENABLE_FORMS : pdfjs.AnnotationMode.ENABLE }).promise;
  return canvas;
}

/** Canvas → JPEG / PNG bytes. */
export function canvasBytes(canvas, type = 'image/jpeg', quality = 0.85) {
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? b.arrayBuffer().then((a) => res(new Uint8Array(a))) : rej(new Error('canvas encoding failed'))), type, quality));
}

/** Drop zone for PDFs. onFiles(entries) with entries = [{ file, bytes }]. */
export function pdfDrop(zone, onFiles, { multiple = false, accept = '.pdf,application/pdf' } = {}) {
  const input = $('input[type=file]', zone);
  if (input) { input.accept = accept; input.multiple = multiple; }
  return dropzone(zone, async (files) => {
    const out = [];
    for (const file of files) out.push({ file, bytes: new Uint8Array(await file.arrayBuffer()) });
    onFiles(out);
  });
}

export const isPdf = (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46;
export const isEncrypted = (b) => { const tail = new TextDecoder('latin1').decode(b.subarray(Math.max(0, b.length - 4096))); const head = new TextDecoder('latin1').decode(b.subarray(0, Math.min(b.length, 2048))); return /\/Encrypt\s/.test(tail) || /\/Encrypt\s/.test(head); };

/** Thumbnail canvas for page i (0-based) of a pdf.js document, `px` wide. */
export async function thumb(doc, i, px = 140) {
  const page = await doc.getPage(i + 1);
  const vp = page.getViewport({ scale: 1 });
  return render(page, px / vp.width);
}

/** Progress helper bound to a .tk-progress bar and a message element. */
export function progress(bar, label) {
  return {
    set(done, total, text) { if (bar) { bar.hidden = false; bar.firstElementChild.style.width = `${Math.round((100 * done) / Math.max(1, total))}%`; } if (label && text) msg(label, text, 'warn'); },
    done(text, kind = 'ok') { if (bar) bar.hidden = true; if (label) msg(label, text, kind); },
  };
}

export const outName = (name, suffix, ext = 'pdf') => `${String(name || 'document').replace(/\.[^.]+$/, '')}${suffix ? `-${suffix}` : ''}.${ext}`;
export const savePdf = async (doc, name) => download(name, await doc.save({ useObjectStreams: true }), 'application/pdf');
export const saveZip = (name, files) => download(name, zipSync(Object.fromEntries(files.map(([n, b]) => [n, [b, { level: 0 }]]))), 'application/zip');

/** Yield to the browser between heavy steps so the page stays responsive. */
export const tick = () => new Promise((r) => setTimeout(r));

/** Standard fonts only know WinAnsi: replace what they can't draw. */
export function winAnsi(s) {
  const map = { '‘': "'", '’': "'", '“': '"', '”': '"', '–': '-', '—': '-', '…': '...', '•': '-', '€': 'EUR', ' ': ' ' };
  return String(s).replace(/[^\x20-\x7e -ÿ]/g, (c) => map[c] ?? (c.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7e]/g, '?')));
}

/** Hex colour → pdf-lib rgb() components. */
export const hexRgb = (h) => { const n = parseInt(String(h).replace('#', ''), 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };

/** Error to a message element (and console). */
export function fail(label, e) { console.error(e); msg(label, e.message || String(e)); }

/** Minimal "one PDF in → options → result" scaffold. Returns the current entry getter. */
export function single(onLoad) {
  let cur = null;
  pdfDrop($('#drop'), async ([f]) => {
    if (!f) return;
    if (!isPdf(f.bytes)) { msg($('#msg'), `${f.file.name} is not a PDF`); return; }
    cur = f;
    try { await onLoad(f); } catch (e) { fail($('#msg'), e); }
  });
  return () => cur;
}

export { el };
