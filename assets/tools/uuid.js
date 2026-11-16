import { $, $$, kv, live, msg, pick } from '../js/tk.js';
import { v4, v7, NIL, MAX, parse, NAMES } from './lib/uuid.js';

const gen = () => {
  const ver = pick('ver'), count = Math.max(1, Math.min(500, +$('#count').value || 1));
  const make = { v4: () => v4(), v7: () => v7(), nil: () => NIL, max: () => MAX }[ver];
  const out = [];
  let t = Date.now();
  for (let i = 0; i < count; i++) {
    let u = ver === 'v7' ? v7(t++) : make(); // v7: bump the ms so a batch stays strictly ordered
    if ($('#nodash').checked) u = u.replace(/-/g, '');
    if ($('#upper').checked) u = u.toUpperCase();
    if ($('#braces').checked) u = `{${u}}`;
    out.push(u);
  }
  $('#gen').value = out.join('\n');
};
live([...$$('input[name="ver"]'), $('#count'), $('#upper'), $('#braces'), $('#nodash')], gen);
$('#go').addEventListener('click', gen);

const inp = $('#in');
live(inp, () => {
  try {
    const p = parse(inp.value);
    msg($('#msg'), '');
    kv($('#out'), [
      ['canonical', p.canonical],
      ['version', typeof p.version === 'number' ? `${p.version} — ${NAMES[p.version] || 'unknown'}` : p.version],
      ['variant', p.variant],
      p.time && ['timestamp', p.time.toISOString(), p.time.toString().replace(/ \(.*\)$/, '')],
      p.node && ['node (MAC)', p.node],
      p.clockSeq != null && ['clock sequence', String(p.clockSeq)],
      ['URN', `urn:uuid:${p.canonical}`],
      ['hex', p.canonical.replace(/-/g, '')],
    ]);
  } catch (e) { msg($('#msg'), e.message); $('#out').replaceChildren(); }
});
