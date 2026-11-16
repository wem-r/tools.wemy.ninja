import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { $, live } from '../js/tk.js';

live([$('#in'), $('#gfm'), $('#br'), $('#san')], () => {
  let html = marked.parse($('#in').value, { gfm: $('#gfm').checked, breaks: $('#br').checked });
  if ($('#san').checked) html = DOMPurify.sanitize(html);
  $('#out').value = html.trim();
  $('#pv').srcdoc = `<!doctype html><meta charset="utf-8"><style>body{font:15px/1.6 system-ui,sans-serif;color:#111;margin:16px}pre{background:#f4f4f4;padding:8px}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:3px 8px}blockquote{border-left:3px solid #999;margin:0;padding-left:12px;color:#444}</style>${DOMPurify.sanitize(html)}`;
});
