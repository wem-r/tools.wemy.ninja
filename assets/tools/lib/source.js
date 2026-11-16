// Wires the shared "text or file" input block (layouts/_partials/tools/_input.html).
import { $, $$, live, pick, bytesFrom, readFile } from '../../js/tk.js';

/** onChange(getBytes, info) is called whenever the text, format or file changes. getBytes() → Promise<Uint8Array>. */
export function source(onChange) {
  let file = null;
  const drop = $('#drop'), fi = $('#file');
  const info = () => ({ mode: pick('src'), file });
  const get = async () => (pick('src') === 'file' ? (file ? readFile(file) : new Uint8Array()) : bytesFrom($('#txt').value, pick('fmt')));
  const run = () => {
    const f = pick('src') === 'file';
    $('#textbox').hidden = f; $('#fmtseg').hidden = f; $('#filebox').hidden = !f;
    return onChange(get, info());
  };
  const setFile = (f) => {
    file = f || null;
    $('#fname').textContent = file ? `${file.name} — ${file.size.toLocaleString()} bytes` : 'drop a file here, or click to choose';
    run();
  };
  fi.addEventListener('change', () => setFile(fi.files[0]));
  for (const ev of ['dragenter', 'dragover']) drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); });
  for (const ev of ['dragleave', 'drop']) drop.addEventListener(ev, () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => { e.preventDefault(); if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]); });
  // dropping a file anywhere on the tool switches to file mode
  document.addEventListener('dragover', (e) => e.preventDefault());
  document.addEventListener('drop', (e) => {
    if (drop.contains(e.target) || !e.dataTransfer?.files[0]) return;
    e.preventDefault(); $('input[name="src"][value="file"]').checked = true; setFile(e.dataTransfer.files[0]);
  });
  return live([$('#txt'), ...$$('input[name="src"]'), ...$$('input[name="fmt"]')], run);
}
