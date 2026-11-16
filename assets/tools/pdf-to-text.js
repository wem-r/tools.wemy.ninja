import { $, msg, download } from '../js/tk.js';
import { single, openJs, outName, progress, fail } from './lib/pdf.js';
import { parseRanges } from './lib/pages.js';

let js = null;
const P = progress($('#bar'), $('#msg'));
/** Rebuild lines from text items using their y position (and x gaps for spaces). */
function lines(items, keepLayout) {
  const rows = [];
  for (const it of items) {
    if (!it.str && !it.hasEOL) continue;
    const [, , , , x, y] = it.transform;
    let r = rows.find((row) => Math.abs(row.y - y) < Math.max(2, it.height * 0.4));
    if (!r) { r = { y, parts: [] }; rows.push(r); }
    r.parts.push({ x, w: it.width, s: it.str, h: it.height });
  }
  rows.sort((a, b) => b.y - a.y);
  return rows.map((r) => {
    r.parts.sort((a, b) => a.x - b.x);
    let out = '', end = null;
    for (const p of r.parts) {
      if (end != null) {
        const gap = p.x - end, cw = (p.h || 10) * 0.5;
        if (keepLayout && gap > cw * 1.5) out += ' '.repeat(Math.min(40, Math.round(gap / cw)));
        else if (gap > cw * 0.25 && !out.endsWith(' ') && !p.s.startsWith(' ')) out += ' ';
      }
      out += p.s; end = p.x + p.w;
    }
    return out.replace(/\s+$/, '');
  }).join('\n');
}
const cur = single(async (f) => { js = await openJs(f.bytes); $('#ui').hidden = false; msg($('#msg'), `${js.numPages} pages`, 'ok'); $('#go').click(); });
$('#go').addEventListener('click', async () => {
  try {
    const idx = parseRanges($('#pages').value, js.numPages), parts = [];
    let empty = 0;
    for (let k = 0; k < idx.length; k++) {
      P.set(k, idx.length, `page ${idx[k] + 1}…`);
      const tc = await (await js.getPage(idx[k] + 1)).getTextContent();
      const t = lines(tc.items, $('#layout').checked);
      if (!t.trim()) empty++;
      parts.push(($('#sep').checked ? `──── page ${idx[k] + 1} ────\n` : '') + t);
    }
    $('#out').value = parts.join('\n\n');
    $('#cnt').textContent = `${$('#out').value.length.toLocaleString()} characters`;
    P.done(empty === idx.length ? 'no text layer: this looks like a scan — use the OCR tool' : `${idx.length} page(s)${empty ? ` · ${empty} without text` : ''}`, empty === idx.length ? 'warn' : 'ok');
  } catch (e) { P.done(''); fail($('#msg'), e); }
});
$('#dl').addEventListener('click', () => download(outName(cur().file.name, '', 'txt'), $('#out').value));
