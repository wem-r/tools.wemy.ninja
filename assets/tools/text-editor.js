import { $, live, download } from '../js/tk.js';
import { stats } from './lib/text.js';

const ed = $('#ed'), KEY = 'tk-editor-draft', NKEY = 'tk-editor-name';
const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } } };
ed.value = store.get(KEY) ?? '';
$('#name').value = store.get(NKEY) || 'notes.txt';
let t;
live(ed, () => {
  const s = stats(ed.value);
  const pos = ed.value.slice(0, ed.selectionStart).split('\n');
  $('#st').textContent = `${s.words.toLocaleString()} words · ${s.chars.toLocaleString()} chars · ${s.lines} lines · Ln ${pos.length}, Col ${pos.at(-1).length + 1}`;
  clearTimeout(t); t = setTimeout(() => store.set(KEY, ed.value), 300);
}, ['input', 'click', 'keyup']);
live([$('#wrap'), $('#mono')], () => { ed.style.whiteSpace = $('#wrap').checked ? 'pre-wrap' : 'pre'; ed.style.overflowX = $('#wrap').checked ? 'hidden' : 'auto'; ed.style.fontFamily = $('#mono').checked ? '' : 'system-ui, sans-serif'; });
$('#name').addEventListener('change', () => store.set(NKEY, $('#name').value));
$('#open').addEventListener('click', () => $('#file').click());
$('#file').addEventListener('change', async () => { const f = $('#file').files[0]; if (!f) return; ed.value = await f.text(); $('#name').value = f.name; store.set(NKEY, f.name); ed.dispatchEvent(new Event('input')); });
$('#save').addEventListener('click', () => download($('#name').value || 'notes.txt', ed.value));
$('#clear').addEventListener('click', () => { if (!ed.value || confirmClear()) { ed.value = ''; ed.dispatchEvent(new Event('input')); } });
function confirmClear() { $('#clear').textContent = 'click again to clear'; if ($('#clear').dataset.armed) { delete $('#clear').dataset.armed; $('#clear').textContent = 'new'; return true; } $('#clear').dataset.armed = 1; setTimeout(() => { delete $('#clear').dataset.armed; $('#clear').textContent = 'new'; }, 2500); return false; }
document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 's' && document.activeElement === ed) { e.preventDefault(); $('#save').click(); } });
ed.addEventListener('keydown', (e) => { if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); ed.setRangeText('\t', ed.selectionStart, ed.selectionEnd, 'end'); ed.dispatchEvent(new Event('input')); } });

const rx = () => {
  const q = $('#find').value; if (!q) return null;
  try { return new RegExp($('#re').checked ? q : q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $('#cs').checked ? 'g' : 'gi'); } catch { $('#fc').textContent = 'bad regex'; return null; }
};
live([$('#find'), $('#re'), $('#cs')], () => { const r = rx(); $('#fc').textContent = r ? `${(ed.value.match(r) || []).length} found` : ''; });
$('#fn').addEventListener('click', () => {
  const r = rx(); if (!r) return;
  r.lastIndex = ed.selectionEnd; let m = r.exec(ed.value);
  if (!m) { r.lastIndex = 0; m = r.exec(ed.value); }
  if (m) { ed.focus(); ed.setSelectionRange(m.index, m.index + m[0].length); }
});
$('#ra').addEventListener('click', () => { const r = rx(); if (!r) return; ed.value = ed.value.replace(r, $('#rep').value); ed.dispatchEvent(new Event('input')); });
