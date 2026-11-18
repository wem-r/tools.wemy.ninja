import { $, el, live } from '../js/tk.js';
import { TOOLS, GROUPS } from './lib/impacket.js';

function fill() {
  const q = $('#tf').value.trim().toLowerCase(), cur = $('#action').value;
  const list = TOOLS.filter((t) => !q || (t.name + ' ' + t.id + ' ' + t.group).toLowerCase().includes(q));
  $('#action').replaceChildren(...GROUPS.filter((g) => list.some((t) => t.group === g)).map((g) =>
    el('optgroup', { label: g }, ...list.filter((t) => t.group === g).map((t) => el('option', { value: t.id, text: t.name })))));
  if (list.some((t) => t.id === cur)) $('#action').value = cur; else if (list.length) $('#action').value = list[0].id;
}
fill(); $('#action').value = 'secretsdump';

const opts = () => ({ domain: $('#domain').value.trim(), user: $('#user').value.trim(), pass: $('#pass').value, hash: $('#hash').value.trim(), target: $('#target').value.trim(), dcip: $('#dcip').value.trim(), extra: $('#extra').value.trim(), kerb: $('#kerb').checked });
function render() {
  const t = TOOLS.find((x) => x.id === $('#action').value) || TOOLS[0];
  const o = opts();
  $('#out').value = t.build(o);
  const alt = t.alt ? t.alt(o) : null;
  $('#altbox').hidden = !alt; if (alt) $('#alt').value = alt;
}
$('#tf').addEventListener('input', () => { fill(); render(); });
live([$('#action'), $('#domain'), $('#user'), $('#pass'), $('#hash'), $('#target'), $('#dcip'), $('#extra'), $('#kerb')], render);
