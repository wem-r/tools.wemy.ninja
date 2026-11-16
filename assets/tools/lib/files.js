// File pickers for the tools: a drop zone (<label class="tk-drop"><input type=file hidden><span>…</span></label>),
// page-wide drag and drop, and pasted images. Files are read locally, never uploaded.
import { $ } from '../../js/tk.js';

/** Wire a drop zone. onFiles(File[]) is called with the chosen / dropped files. */
export function dropzone(zone, onFiles, { page = true, paste = false } = {}) {
  const input = $('input[type=file]', zone);
  const label = $('span', zone);
  const idle = label ? label.textContent : '';
  const take = (list) => {
    const files = [...(list || [])];
    if (!files.length) return;
    if (label) label.textContent = files.length === 1 ? `${files[0].name} — ${files[0].size.toLocaleString()} bytes` : `${files.length} files`;
    onFiles(input && !input.multiple ? files.slice(0, 1) : files);
  };
  input?.addEventListener('change', () => { take(input.files); input.value = ''; });
  for (const ev of ['dragenter', 'dragover']) zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add('over'); });
  for (const ev of ['dragleave', 'drop']) zone.addEventListener(ev, () => zone.classList.remove('over'));
  zone.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); take(e.dataTransfer.files); });
  if (page) {
    document.addEventListener('dragover', (e) => e.preventDefault());
    document.addEventListener('drop', (e) => { if (e.dataTransfer?.files?.length) { e.preventDefault(); take(e.dataTransfer.files); } });
  }
  if (paste) document.addEventListener('paste', (e) => {
    const f = [...(e.clipboardData?.files || [])];
    if (f.length) { e.preventDefault(); take(f); }
  });
  return { reset: () => { if (label) label.textContent = idle; } };
}

/** Bytes → text, honouring UTF-8 / UTF-16 byte order marks (Windows exports are often UTF-16). */
export function bytesToText(b) {
  if (b[0] === 0xff && b[1] === 0xfe) return new TextDecoder('utf-16le').decode(b.subarray(2));
  if (b[0] === 0xfe && b[1] === 0xff) return new TextDecoder('utf-16be').decode(b.subarray(2));
  const s = new TextDecoder('utf-8').decode(b);
  return s.replace(/^﻿/, '');
}

export const fmtSize = (n) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`);

/** Image file → { img, canvas, ctx, data } decoded by the browser. */
export async function loadImage(file, maxSide = 0) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    let w = img.naturalWidth, h = img.naturalHeight;
    if (maxSide && Math.max(w, h) > maxSide) { const k = maxSide / Math.max(w, h); w = Math.round(w * k); h = Math.round(h * k); }
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    return { img, canvas, ctx, w, h };
  } finally { URL.revokeObjectURL(url); }
}
