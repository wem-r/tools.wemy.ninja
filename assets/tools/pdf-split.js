import { $, $$, live, msg, pick } from '../js/tk.js';
import { single, openLib, newDoc, savePdf, saveZip, outName, progress, fail } from './lib/pdf.js';
import { parseRanges, splitEvery, splitRanges } from './lib/pages.js';

let doc = null;
const P = progress($('#bar'), $('#msg'));
function plan() {
  const n = doc.getPageCount(), m = pick('mode');
  if (m === 'ranges') return splitRanges($('#ranges').value, n);
  if (m === 'every') return splitEvery(n, Math.max(1, +$('#n').value || 1));
  if (m === 'each') return splitEvery(n, 1);
  return [parseRanges($('#pick').value, n)];
}
const show = () => {
  $$('[data-m]').forEach((e) => { e.hidden = e.dataset.m !== pick('mode'); });
  if (!doc) return;
  try { const p = plan(); $('#plan').textContent = `${p.length} file${p.length === 1 ? '' : 's'}: ${p.slice(0, 6).map((g) => (g.length > 1 ? `${g[0] + 1}–${g.at(-1) + 1}` : g[0] + 1)).join(', ')}${p.length > 6 ? '…' : ''}`; msg($('#msg'), `${doc.getPageCount()} pages`, 'ok'); }
  catch (e) { $('#plan').textContent = ''; msg($('#msg'), e.message); }
};
live([...$$('input[name="mode"]'), $('#ranges'), $('#n'), $('#pick')], show);
const cur = single(async (f) => { doc = await openLib(f.bytes); $('#ui').hidden = false; show(); });
$('#save').addEventListener('click', async () => {
  try {
    const groups = plan().filter((g) => g.length), base = cur().file.name, out = [];
    for (let k = 0; k < groups.length; k++) {
      P.set(k, groups.length, `file ${k + 1} of ${groups.length}…`);
      const d = await newDoc();
      (await d.copyPages(doc, groups[k])).forEach((p) => d.addPage(p));
      const g = groups[k];
      out.push([outName(base, g.length > 1 ? `p${g[0] + 1}-${g.at(-1) + 1}` : `p${g[0] + 1}`), d]);
    }
    if (out.length === 1) await savePdf(out[0][1], out[0][0]);
    else saveZip(outName(base, 'split', 'zip'), await Promise.all(out.map(async ([n, d]) => [n, await d.save({ useObjectStreams: true })])));
    P.done(`${out.length} file${out.length === 1 ? '' : 's'} saved`);
  } catch (e) { P.done(''); fail($('#msg'), e); }
});
