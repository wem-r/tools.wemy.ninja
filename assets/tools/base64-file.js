import { $, $$, live, msg, pick, download, toB64, fromB64 } from '../js/tk.js';
import { dropzone, fmtSize } from './lib/files.js';
import { identify } from './lib/magic.js';

let file = null, bytes = null;
const render = () => {
  if (!bytes) return;
  const b = toB64(bytes), f = pick('fmt');
  $('#out').value = f === 'uri' ? `data:${file.type || 'application/octet-stream'};base64,${b}` : f === 'wrap' ? b.match(/.{1,76}/g)?.join('\n') ?? '' : b;
  $('#info').textContent = `${file.name} · ${fmtSize(bytes.length)} → ${fmtSize($('#out').value.length)}`;
};
dropzone($('#drop'), async ([f]) => { file = f; bytes = new Uint8Array(await f.arrayBuffer()); render(); });
live($$('input[name="fmt"]'), render);
let decoded = null;
live($('#in'), () => {
  const t = $('#in').value.trim(); $('#pvbox').replaceChildren(); decoded = null;
  if (!t) { $('#det').textContent = ''; return; }
  try {
    const m = t.match(/^data:([^;,]*)(?:;[^,]*)?,(.*)$/s);
    decoded = fromB64(m ? m[2] : t);
    const kind = identify(decoded)[0];
    $('#det').textContent = `${fmtSize(decoded.length)} · ${kind ? kind.name : 'unknown type'}`;
    if (kind?.ext) $('#name').value = `file.${kind.ext.split(' ')[0]}`;
    if (kind?.mime.startsWith('image/') && kind.mime !== 'image/svg+xml') { const img = document.createElement('img'); img.src = URL.createObjectURL(new Blob([decoded], { type: kind.mime })); img.style.maxWidth = '100%'; img.style.maxHeight = '240px'; $('#pvbox').append(img); }
  } catch { $('#det').textContent = 'not valid Base64'; }
});
$('#save').addEventListener('click', () => (decoded ? download($('#name').value || 'file.bin', decoded, 'application/octet-stream') : msg($('#det'), 'nothing to save')));
