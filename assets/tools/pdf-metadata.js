import { PDFName } from 'pdf-lib';
import { $, kv, msg } from '../js/tk.js';
import { single, openLib, openJs, savePdf, outName, fail } from './lib/pdf.js';
import { fmtSize } from './lib/files.js';

const F = ['title', 'author', 'subject', 'keywords', 'creator', 'producer'];
const fmt = (d) => (d ? d.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC') : '—');
const cur = single(async (f) => {
  const doc = await openLib(f.bytes), js = await openJs(f.bytes), meta = await js.getMetadata();
  const ver = new TextDecoder().decode(f.bytes.subarray(0, 16)).match(/%PDF-(\d\.\d)/)?.[1] || '?';
  const xmp = meta.metadata?.getRaw?.() || '';
  kv($('#info'), [
    ['file', `${f.file.name} · ${fmtSize(f.bytes.length)}`], ['PDF version', ver], ['pages', String(doc.getPageCount())],
    ['title', doc.getTitle() || ''], ['author', doc.getAuthor() || ''], ['subject', doc.getSubject() || ''], ['keywords', doc.getKeywords() || ''],
    ['creator (app)', doc.getCreator() || ''], ['producer', doc.getProducer() || ''],
    ['created', fmt(doc.getCreationDate())], ['modified', fmt(doc.getModificationDate())],
    ['XMP metadata', xmp ? `${xmp.length.toLocaleString()} characters` : 'none'], ['form fields', String(doc.getForm().getFields().length)],
    meta.info?.IsLinearized && ['linearised', 'yes (fast web view)'],
  ]);
  $('#m-title').value = doc.getTitle() || ''; $('#m-author').value = doc.getAuthor() || ''; $('#m-subject').value = doc.getSubject() || '';
  $('#m-keywords').value = doc.getKeywords() || ''; $('#m-creator').value = doc.getCreator() || ''; $('#m-producer').value = doc.getProducer() || '';
  $('#xmpv').textContent = xmp || 'no XMP stream';
  $('#ui').hidden = false; msg($('#msg'), 'loaded', 'ok'); await js.close();
});
async function save(clearAll) {
  try {
    const doc = await openLib(cur().bytes), info = doc.getInfoDict();
    if (clearAll) for (const k of info.keys()) info.delete(k);
    else {
      const v = Object.fromEntries(F.map((k) => [k, $(`#m-${k}`).value.trim()]));
      const set = (key, val) => (val ? null : info.delete(PDFName.of(key)));
      doc.setTitle(v.title); set('Title', v.title); doc.setAuthor(v.author); set('Author', v.author); doc.setSubject(v.subject); set('Subject', v.subject);
      doc.setKeywords(v.keywords ? v.keywords.split(',').map((x) => x.trim()) : []); set('Keywords', v.keywords);
      doc.setCreator(v.creator); set('Creator', v.creator); doc.setProducer(v.producer); set('Producer', v.producer);
      if (!$('#dates').checked) { info.delete(PDFName.of('CreationDate')); info.delete(PDFName.of('ModDate')); }
    }
    if (clearAll || $('#xmp').checked) doc.catalog.delete(PDFName.of('Metadata'));
    await savePdf(doc, outName(cur().file.name, clearAll ? 'nometa' : 'meta'));
    msg($('#msg'), clearAll ? 'all document metadata removed (images inside may still carry EXIF)' : 'saved', 'ok');
  } catch (e) { fail($('#msg'), e); }
}
$('#save').addEventListener('click', () => save(false));
$('#wipe').addEventListener('click', () => save(true));
