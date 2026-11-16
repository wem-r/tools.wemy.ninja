import exifr from 'exifr';
import piexif from 'piexifjs';
import { $, $$, el, kv, msg, download } from '../js/tk.js';
import { dropzone } from './lib/files.js';
import { strip } from './lib/metastrip.js';

let file = null, bytes = null, all = null;
const show = (v) => (v instanceof Date ? v.toISOString().replace('T', ' ').replace('.000Z', '') : v instanceof Uint8Array || ArrayBuffer.isView(v) ? `${v.length} bytes` : Array.isArray(v) ? v.join(', ') : typeof v === 'object' && v ? JSON.stringify(v) : String(v));
const latin1 = (b) => { let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return s; };
const fromLatin1 = (s) => Uint8Array.from(s, (c) => c.charCodeAt(0));

function renderAll() {
  const q = $('#f').value.toLowerCase();
  $('#all').replaceChildren(...Object.entries(all || {}).filter(([, g]) => g && typeof g === 'object').map(([group, tags]) => {
    const rows = Object.entries(tags).filter(([k, v]) => !q || `${k} ${show(v)}`.toLowerCase().includes(q));
    if (!rows.length) return null;
    const t = el('table', { class: 'tk-kv' });
    kv(t, rows.map(([k, v]) => [k, show(v).slice(0, 400)]));
    return el('div', {}, el('div', { class: 'tk-sec', text: `${group} (${rows.length})` }), t);
  }));
}

dropzone($('#drop'), async ([f]) => {
  file = f; bytes = new Uint8Array(await f.arrayBuffer());
  $('#res').hidden = false;
  try { $('#prev').src = URL.createObjectURL(f); } catch { /* not displayable */ }
  try {
    all = await exifr.parse(bytes, { tiff: true, exif: true, gps: true, interop: true, ifd1: true, iptc: true, xmp: true, icc: true, jfif: true, ihdr: true, makerNote: false, mergeOutput: false, translateValues: true, reviveValues: true }) || {};
  } catch (e) { all = {}; msg($('#msg'), `could not read metadata: ${e.message}`); }
  const flat = Object.assign({}, ...Object.values(all).filter((g) => g && typeof g === 'object'));
  let gps = null;
  try { gps = await exifr.gps(bytes); } catch { /* none */ }
  const n = Object.values(flat).length;
  msg($('#msg'), n ? `${n} metadata fields${gps ? ' · ⚠ contains GPS location' : ''}` : 'no metadata found', gps ? 'warn' : 'ok');
  kv($('#key'), [
    ['file', `${f.name} · ${bytes.length.toLocaleString()} bytes`],
    (flat.Make || flat.Model) && ['camera', [flat.Make, flat.Model].filter(Boolean).join(' ')],
    flat.LensModel && ['lens', flat.LensModel],
    flat.DateTimeOriginal && ['taken', show(flat.DateTimeOriginal)],
    (flat.ExifImageWidth || flat.ImageWidth) && ['size', `${flat.ExifImageWidth || flat.ImageWidth} × ${flat.ExifImageHeight || flat.ImageHeight}`],
    flat.ExposureTime && ['exposure', `1/${Math.round(1 / flat.ExposureTime)} s · f/${flat.FNumber ?? '?'} · ISO ${flat.ISO ?? '?'}${flat.FocalLength ? ` · ${flat.FocalLength} mm` : ''}`],
    flat.Software && ['software', flat.Software],
    (flat.Artist || flat.Copyright) && ['author', [flat.Artist, flat.Copyright].filter(Boolean).join(' · ')],
    gps && ['GPS', `${gps.latitude.toFixed(6)}, ${gps.longitude.toFixed(6)}`, `openstreetmap.org/?mlat=${gps.latitude.toFixed(5)}&mlon=${gps.longitude.toFixed(5)}`],
    flat.GPSAltitude != null && ['altitude', `${Math.round(flat.GPSAltitude)} m`],
  ]);
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
  $('#editbox').hidden = !jpeg;
  if (jpeg) for (const i of $$('[data-tag]')) i.value = flat[i.dataset.tag] instanceof Date ? show(flat[i.dataset.tag]).replace(/-/g, ':') : flat[i.dataset.tag] ?? '';
  $('#stripinfo').textContent = /jpe?g|png|webp/i.test(f.type) || jpeg ? '' : 'cleaning works on JPEG, PNG and WebP';
  renderAll();
});
$('#f').addEventListener('input', renderAll);
const outName = (suffix) => file.name.replace(/(\.[^.]*)?$/, (m) => `-${suffix}${m}`);
$('#strip').addEventListener('click', () => {
  try {
    const r = strip(bytes, { keepICC: $('#icc').checked });
    download(outName('clean'), r.bytes, file.type || 'application/octet-stream');
    $('#stripinfo').textContent = r.removed.length ? `removed: ${r.removed.join(' · ')}` : 'nothing to remove';
  } catch (e) { $('#stripinfo').textContent = e.message; }
});
$('#save').addEventListener('click', () => {
  try {
    const bin = latin1(bytes);
    let ex;
    try { ex = piexif.load(bin); } catch { ex = { '0th': {}, Exif: {}, GPS: {}, Interop: {}, '1st': {}, thumbnail: null }; }
    const ascii = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7e]/g, '?');
    for (const i of $$('[data-tag]')) {
      const tag = i.dataset.tag, ifd = tag === 'DateTimeOriginal' ? 'Exif' : '0th';
      const id = (ifd === 'Exif' ? piexif.ExifIFD : piexif.ImageIFD)[tag];
      if (i.value.trim()) ex[ifd][id] = ascii(i.value.trim()); else delete ex[ifd][id];
    }
    if ($('#nogps').checked) ex.GPS = {};
    const out = piexif.insert(piexif.dump(ex), bin);
    download(outName('edited'), fromLatin1(out), 'image/jpeg');
    msg($('#msg'), 'saved (EXIF text is ASCII: accents are dropped)', 'ok');
  } catch (e) { msg($('#msg'), `could not write EXIF: ${e.message}`); }
});
