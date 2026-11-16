import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { $, $$, live, pick } from '../js/tk.js';

const FONTS = { sans: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif', serif: 'Georgia, "Times New Roman", serif', mono: 'ui-monospace, Menlo, Consolas, monospace' };
function html() {
  const src = $('#in').value;
  const body = DOMPurify.sanitize(pick('src') === 'md' ? marked.parse(src, { gfm: true }) : src, { WHOLE_DOCUMENT: false, FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'] });
  return `<!doctype html><html><head><meta charset="utf-8"><title>document</title><style>
@page { size: ${$('#size').value} ${$('#orient').value}; margin: ${+$('#margin').value || 0}mm; }
html { background: #fff; } body { font: 11pt/1.5 ${FONTS[$('#font').value]}; color: #111; margin: 0; padding: 12px; }
h1, h2, h3 { line-height: 1.2; break-after: avoid; } h1 { font-size: 22pt; margin: 0 0 .4em; } h2 { font-size: 15pt; margin: 1.2em 0 .4em; }
table { border-collapse: collapse; margin: .6em 0; } th, td { border: 1px solid #bbb; padding: 3px 8px; text-align: left; } th { background: #f2f2f2; }
pre, code { font-family: ${FONTS.mono}; font-size: 9.5pt; } pre { background: #f5f5f5; padding: 8px 10px; border-radius: 4px; white-space: pre-wrap; }
blockquote { margin: .6em 0; padding: 2px 12px; border-left: 3px solid #999; color: #444; } img { max-width: 100%; }
tr, img, pre, blockquote { break-inside: avoid; } @media print { body { padding: 0; } }
</style></head><body>${body}</body></html>`;
}
live([$('#in'), $('#size'), $('#orient'), $('#margin'), $('#font'), ...$$('input[name="src"]')], () => { $('#pv').srcdoc = html(); });
$('#print').addEventListener('click', () => { const w = $('#pv').contentWindow; w.focus(); w.print(); });
