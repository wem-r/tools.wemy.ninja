import DOMPurify from 'dompurify';
import { $, $$ } from '../js/tk.js';

const ed = $('#ed'), out = $('#out');
const clean = (h) => DOMPurify.sanitize(h, { FORBID_TAGS: ['style', 'script', 'font', 'span'], FORBID_ATTR: ['style', 'class', 'id', 'dir', 'lang'] });
const pretty = (h) => h.replace(/></g, '>\n<').replace(/\n<\/(b|i|u|s|em|strong|a|code)>/g, '</$1>').replace(/<(b|i|u|s|em|strong|a|code)([^>]*)>\n/g, '<$1$2>');
const toOut = () => { out.value = pretty(clean(ed.innerHTML)); };
const toEd = () => { ed.innerHTML = clean(out.value); };
for (const b of $$('[data-cmd]')) b.addEventListener('click', () => {
  ed.focus();
  const arg = b.dataset.cmd === 'createLink' ? prompt('link URL', 'https://') : b.dataset.arg;
  if (b.dataset.cmd === 'createLink' && !arg) return;
  document.execCommand(b.dataset.cmd, false, arg);
  toOut();
});
ed.addEventListener('input', toOut);
ed.addEventListener('paste', (e) => { e.preventDefault(); const h = e.clipboardData.getData('text/html'); document.execCommand('insertHTML', false, h ? clean(h) : e.clipboardData.getData('text/plain').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>')); });
out.addEventListener('input', toEd);
toOut();
