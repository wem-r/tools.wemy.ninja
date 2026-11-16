import { $, el, msg, download, fromHex } from '../js/tk.js';
import { dropzone } from './lib/files.js';

const ROWS = 32, W = 16, PAGE = ROWS * W;
let data = null, orig = null, name = '', start = 0, sel = 0, nib = 0, findAt = -1;
const hx = (n, w = 2) => n.toString(16).padStart(w, '0');
const modified = new Set();

function render() {
  const end = Math.min(data.length, start + PAGE), lines = [];
  for (let o = start; o < end; o += W) {
    const hexes = [], chars = [];
    for (let i = 0; i < W; i++) {
      const p = o + i;
      if (p >= data.length) { hexes.push(el('span', { class: 'b e', text: '  ' })); chars.push(el('span', { class: 'c e', text: ' ' })); continue; }
      const cls = `${p === sel ? ' on' : ''}${modified.has(p) ? ' mod' : ''}`;
      hexes.push(el('span', { class: 'b' + cls, 'data-p': p, text: hx(data[p]) }));
      const c = data[p];
      chars.push(el('span', { class: 'c' + cls, 'data-p': p, text: c >= 32 && c < 127 ? String.fromCharCode(c) : '·' }));
    }
    lines.push(el('div', { class: 'ln' }, el('span', { class: 'o', text: hx(o, 8) }), el('span', { class: 'h' }, ...hexes), el('span', { class: 'a' }, ...chars)));
  }
  $('#hex').replaceChildren(...lines);
  $('#mods').textContent = modified.size ? `${modified.size} byte(s) changed.` : '';
  inspect();
}
function inspect() {
  if (!data) return;
  const dv = new DataView(data.buffer, data.byteOffset, data.byteLength), p = sel, rem = data.length - p;
  const v = (n, f) => (rem >= n ? f() : '—');
  const rows = [
    ['offset', `0x${hx(p, 8)} (${p})`],
    ['binary', data[p].toString(2).padStart(8, '0')],
    ['int8 / uint8', `${dv.getInt8(p)} / ${data[p]}`],
    ['int16 LE / BE', v(2, () => `${dv.getInt16(p, true)} / ${dv.getInt16(p)}`)],
    ['uint32 LE / BE', v(4, () => `${dv.getUint32(p, true)} / ${dv.getUint32(p)}`)],
    ['int64 LE', v(8, () => String(dv.getBigInt64(p, true)))],
    ['float32 LE', v(4, () => String(dv.getFloat32(p, true)))],
    ['float64 LE', v(8, () => String(dv.getFloat64(p, true)))],
    ['Unix time (uint32 LE)', v(4, () => new Date(dv.getUint32(p, true) * 1000).toISOString())],
    ['UTF-8 from here', new TextDecoder().decode(data.subarray(p, p + 32)).replace(/[\x00-\x1f]/g, '·')],
  ];
  $('#insp').replaceChildren(...rows.map(([k, x]) => el('tr', {}, el('td', { text: k }), el('td', {}, el('code', { class: 'v', text: x })))));
}
function go(p) {
  sel = Math.max(0, Math.min(data.length - 1, p)); nib = 0;
  if (sel < start || sel >= start + PAGE) start = Math.floor(sel / W) * W - Math.floor(ROWS / 2) * W;
  start = Math.max(0, Math.min(start, Math.max(0, Math.ceil(data.length / W) * W - PAGE)));
  render();
}
$('#hex').addEventListener('click', (e) => { const p = e.target.dataset?.p; if (p != null) { go(+p); $('#hex').focus(); } });
$('#hex').addEventListener('keydown', (e) => {
  if (!data) return;
  const k = e.key;
  const mv = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: W, ArrowUp: -W, PageDown: PAGE, PageUp: -PAGE, Tab: e.shiftKey ? -1 : 1 }[k];
  if (mv) { e.preventDefault(); go(sel + mv); return; }
  if (/^[0-9a-f]$/i.test(k)) {
    e.preventDefault();
    const d = parseInt(k, 16);
    data[sel] = nib === 0 ? (d << 4) | (data[sel] & 15) : (data[sel] & 0xf0) | d;
    if (data[sel] !== orig[sel]) modified.add(sel); else modified.delete(sel);
    if (nib === 0) { nib = 1; render(); } else { go(sel + 1); }
  }
});
$('#prev').addEventListener('click', () => go(sel - PAGE));
$('#next').addEventListener('click', () => go(sel + PAGE));
$('#goto').addEventListener('change', () => { const n = parseInt($('#goto').value, 16); if (!isNaN(n)) go(n); });
function find() {
  const q = $('#find').value.trim();
  if (!q) return;
  let pat;
  try { pat = /^([0-9a-f]{2}[\s:]?)+$/i.test(q) ? fromHex(q) : new TextEncoder().encode(q); } catch { pat = new TextEncoder().encode(q); }
  const from = findAt >= 0 ? findAt + 1 : sel;
  for (let pass = 0; pass < 2; pass++) {
    for (let i = pass ? 0 : from; i <= data.length - pat.length; i++) {
      let ok = true; for (let j = 0; j < pat.length; j++) if (data[i + j] !== pat[j]) { ok = false; break; }
      if (ok) { findAt = i; msg($('#msg'), `found at 0x${hx(i, 8)}${pass ? ' (wrapped)' : ''}`, 'ok'); go(i); return; }
    }
  }
  msg($('#msg'), 'not found'); findAt = -1;
}
$('#findnext').addEventListener('click', find);
$('#find').addEventListener('keydown', (e) => { if (e.key === 'Enter') find(); });
$('#find').addEventListener('input', () => { findAt = -1; });
$('#save').addEventListener('click', () => download(name.replace(/(\.[^.]*)?$/, (m) => `-edited${m}`), data, 'application/octet-stream'));
dropzone($('#drop'), async ([f]) => {
  data = new Uint8Array(await f.arrayBuffer()); orig = data.slice(); name = f.name; modified.clear(); start = 0; sel = 0; findAt = -1;
  $('#ed').hidden = false;
  msg($('#msg'), `${f.name} · ${data.length.toLocaleString()} bytes`, 'ok');
  if (!data.length) { msg($('#msg'), 'empty file'); return; }
  render();
});
