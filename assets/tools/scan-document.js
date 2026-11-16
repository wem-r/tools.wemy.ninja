import { $, $$, el, msg, pick } from '../js/tk.js';
import { dropzone, loadImage } from './lib/files.js';
import { newDoc, canvasBytes, savePdf, fail } from './lib/pdf.js';
import { homography, project, orderCorners, SIZES } from './lib/pages.js';

let src = null, corners = null, pages = [], scale = 1; // src: canvas of the current photo; corners in its pixels
const stage = $('#stage'), cv = $('#cv');

function drawStage() {
  const maxW = Math.min(stage.parentElement.clientWidth - 4, 900);
  scale = Math.min(1, maxW / src.width, 560 / src.height);
  cv.width = src.width * scale; cv.height = src.height * scale;
  const x = cv.getContext('2d');
  x.drawImage(src, 0, 0, cv.width, cv.height);
  x.strokeStyle = '#5bbfa1'; x.lineWidth = 2; x.fillStyle = 'rgba(91,191,161,.12)';
  x.beginPath(); corners.forEach(([a, b], i) => (i ? x.lineTo(a * scale, b * scale) : x.moveTo(a * scale, b * scale))); x.closePath(); x.fill(); x.stroke();
  stage.querySelectorAll('.handle').forEach((h) => h.remove());
  corners.forEach((c, i) => {
    const h = el('div', { class: 'handle' }); h.style.left = `${c[0] * scale}px`; h.style.top = `${c[1] * scale}px`;
    h.addEventListener('pointerdown', (e) => { h.setPointerCapture(e.pointerId); h.dataset.drag = 1; });
    h.addEventListener('pointermove', (e) => { if (!h.dataset.drag) return; const r = cv.getBoundingClientRect(); corners[i] = [Math.max(0, Math.min(src.width, (e.clientX - r.left) / scale)), Math.max(0, Math.min(src.height, (e.clientY - r.top) / scale))]; drawStage(); });
    h.addEventListener('pointerup', () => { delete h.dataset.drag; });
    stage.append(h);
  });
}

/** Find the paper: Otsu threshold on a small grey copy, keep the largest bright blob, take its extreme corners. */
function detect(c) {
  const k = Math.min(1, 320 / Math.max(c.width, c.height)), w = Math.round(c.width * k), h = Math.round(c.height * k);
  const t = document.createElement('canvas'); t.width = w; t.height = h;
  const x = t.getContext('2d', { willReadFrequently: true }); x.drawImage(c, 0, 0, w, h);
  const d = x.getImageData(0, 0, w, h).data, g = new Uint8Array(w * h), hist = new Array(256).fill(0);
  for (let i = 0; i < w * h; i++) { g[i] = (d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114) | 0; hist[g[i]]++; }
  let sum = 0, sumB = 0, wB = 0, best = 0, th = 128; for (let i = 0; i < 256; i++) sum += i * hist[i];
  for (let i = 0; i < 256; i++) { wB += hist[i]; if (!wB) continue; const wF = w * h - wB; if (!wF) break; sumB += i * hist[i]; const mB = sumB / wB, mF = (sum - sumB) / wF, v = wB * wF * (mB - mF) ** 2; if (v > best) { best = v; th = i; } }
  const lab = new Int32Array(w * h).fill(-1); let bestLab = -1, bestN = 0, cur = 0;
  for (let s = 0; s < w * h; s++) {
    if (g[s] <= th || lab[s] >= 0) continue;
    const st = [s]; lab[s] = cur; let n = 0;
    while (st.length) { const p = st.pop(); n++; const px = p % w, py = (p / w) | 0; for (const q of [px > 0 && p - 1, px < w - 1 && p + 1, py > 0 && p - w, py < h - 1 && p + w]) if (q !== false && lab[q] < 0 && g[q] > th) { lab[q] = cur; st.push(q); } }
    if (n > bestN) { bestN = n; bestLab = cur; } cur++;
  }
  if (bestN < w * h * 0.08) return null;
  const pts = []; for (let p = 0; p < w * h; p++) if (lab[p] === bestLab) pts.push([(p % w) / k, ((p / w) | 0) / k]);
  return orderCorners(pts);
}
const whole = () => [[0, 0], [src.width, 0], [src.width, src.height], [0, src.height]];

async function open(file) {
  try {
    const { canvas } = await loadImage(file, 2400);
    src = canvas; corners = detect(src) || whole();
    $('#edit').hidden = false; drawStage();
    msg($('#msg'), 'adjust the corners if needed, then "add page"', 'ok');
  } catch (e) { fail($('#msg'), e); }
}
let queue = [];
dropzone($('#drop'), (files) => { queue = files.slice(1); open(files[0]); });
$('#auto').addEventListener('click', () => { corners = detect(src) || whole(); drawStage(); });
$('#full').addEventListener('click', () => { corners = whole(); drawStage(); });
$('#rot').addEventListener('click', () => {
  const c = document.createElement('canvas'); c.width = src.height; c.height = src.width;
  const x = c.getContext('2d'); x.translate(c.width, 0); x.rotate(Math.PI / 2); x.drawImage(src, 0, 0);
  corners = corners.map(([a, b]) => [src.height - b, a]); src = c; corners = orderCorners(corners); drawStage();
});

/** Warp the quadrilateral to a flat page (inverse mapping, bilinear-ish via nearest for speed). */
function warp() {
  const [tl, tr, br, bl] = corners;
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const W = Math.round(Math.max(dist(tl, tr), dist(bl, br))), H = Math.round(Math.max(dist(tl, bl), dist(tr, br)));
  const Hm = homography([[0, 0], [W, 0], [W, H], [0, H]], corners);
  const sd = src.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, src.width, src.height).data;
  const out = document.createElement('canvas'); out.width = W; out.height = H;
  const ox = out.getContext('2d'), od = ox.createImageData(W, H), o = od.data, sw = src.width, sh = src.height;
  const flt = pick('flt');
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const [u, v] = project(Hm, x + 0.5, y + 0.5);
    const xi = Math.min(sw - 1, Math.max(0, u | 0)), yi = Math.min(sh - 1, Math.max(0, v | 0)), s = (yi * sw + xi) * 4, t = (y * W + x) * 4;
    o[t] = sd[s]; o[t + 1] = sd[s + 1]; o[t + 2] = sd[s + 2]; o[t + 3] = 255;
  }
  if (flt !== 'color') {
    // grey; for B&W an adaptive threshold against a blurred background (handles shadows)
    const g = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) g[i] = o[i * 4] * 0.299 + o[i * 4 + 1] * 0.587 + o[i * 4 + 2] * 0.114;
    let res = g;
    if (flt === 'bw') {
      const r = Math.max(8, Math.round(Math.min(W, H) / 40)), I = new Float64Array((W + 1) * (H + 1));
      for (let y = 0; y < H; y++) { let row = 0; for (let x = 0; x < W; x++) { row += g[y * W + x]; I[(y + 1) * (W + 1) + x + 1] = I[y * (W + 1) + x + 1] + row; } }
      res = new Float32Array(W * H);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const x0 = Math.max(0, x - r), x1 = Math.min(W, x + r + 1), y0 = Math.max(0, y - r), y1 = Math.min(H, y + r + 1);
        const mean = (I[y1 * (W + 1) + x1] - I[y0 * (W + 1) + x1] - I[y1 * (W + 1) + x0] + I[y0 * (W + 1) + x0]) / ((x1 - x0) * (y1 - y0));
        res[y * W + x] = g[y * W + x] < mean * 0.86 ? 0 : 255;
      }
    }
    for (let i = 0; i < W * H; i++) o[i * 4] = o[i * 4 + 1] = o[i * 4 + 2] = res[i];
  }
  ox.putImageData(od, 0, 0);
  return out;
}
function drawPages() {
  $('#pages').replaceChildren(...pages.map((c, i) => {
    const t = document.createElement('canvas'), s = 140 / c.width; t.width = 140; t.height = c.height * s; t.getContext('2d').drawImage(c, 0, 0, t.width, t.height);
    return el('div', { class: 'tk-page' }, t, el('span', { class: 'n', text: `page ${i + 1}` }), el('div', { class: 'ops' },
      el('button', { type: 'button', text: '↑', onclick: () => { if (i) { [pages[i - 1], pages[i]] = [pages[i], pages[i - 1]]; drawPages(); } } }),
      el('button', { type: 'button', text: '✕', onclick: () => { pages.splice(i, 1); drawPages(); } })));
  }));
}
$('#add').addEventListener('click', () => {
  if (!src) return;
  pages.push(warp()); drawPages();
  if (queue.length) open(queue.shift()); else { $('#edit').hidden = true; msg($('#msg'), `${pages.length} page(s) — add more or save`, 'ok'); }
});
$('#save').addEventListener('click', async () => {
  if (!pages.length) return msg($('#msg'), 'add a page first');
  try {
    const doc = await newDoc(), q = (+$('#q').value || 80) / 100;
    for (const c of pages) {
      const bw = pick('flt') === 'bw';
      const img = await doc.embedJpg(await canvasBytes(c, 'image/jpeg', bw ? Math.max(q, 0.75) : q));
      let [W, H] = $('#size').value === 'fit' ? [c.width * 0.36, c.height * 0.36] : SIZES[$('#size').value];
      if (c.width > c.height && $('#size').value !== 'fit') [W, H] = [H, W];
      const s = Math.min(W / img.width, H / img.height), w = img.width * s, h = img.height * s;
      doc.addPage([W, H]).drawImage(img, { x: (W - w) / 2, y: (H - h) / 2, width: w, height: h });
    }
    doc.setTitle('Scan'); doc.setCreationDate(new Date());
    await savePdf(doc, `scan-${new Date().toISOString().slice(0, 10)}.pdf`);
    msg($('#msg'), `${pages.length} page(s) saved`, 'ok');
  } catch (e) { fail($('#msg'), e); }
});

// camera
let stream = null;
$('#cam').addEventListener('click', async () => {
  const v = $('#video');
  if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; v.hidden = true; $('#shot').hidden = true; $('#cam').textContent = 'use the camera'; return; }
  try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 2560 }, height: { ideal: 1920 } } }); }
  catch (e) { return msg($('#msg'), `camera not available: ${e.message}`); }
  v.srcObject = stream; v.hidden = false; await v.play(); $('#shot').hidden = false; $('#cam').textContent = 'stop the camera';
});
$('#shot').addEventListener('click', () => {
  const v = $('#video'), c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext('2d').drawImage(v, 0, 0);
  src = c; corners = detect(src) || whole(); $('#edit').hidden = false; drawStage();
});
