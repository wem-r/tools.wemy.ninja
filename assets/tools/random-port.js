import { $, $$, kv, live, pick } from '../js/tk.js';

let assigned = null;
fetch($('#out').dataset.ports).then((r) => r.json()).then((j) => { assigned = new Set(Object.keys(j).map((k) => +k.split('/')[0])); gen(); });
function gen() {
  const [lo, hi] = { dyn: [49152, 65535], reg: [1024, 49151], any: [1024, 65535] }[pick('r')], n = Math.max(1, Math.min(100, +$('#n').value || 1));
  const out = new Set(); let guard = 0;
  while (out.size < n && guard++ < 100000) {
    const a = new Uint32Array(1); crypto.getRandomValues(a);
    const p = lo + (a[0] % (hi - lo + 1));
    if ($('#avoid').checked && assigned?.has(p)) continue;
    out.add(p);
  }
  kv($('#out'), [...out].map((p, i) => [String(i + 1), String(p)]));
}
$('#go').addEventListener('click', gen);
live([...$$('input[name="r"]'), $('#n'), $('#avoid')], gen);
