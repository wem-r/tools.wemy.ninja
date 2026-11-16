import { $, $$, el, live, pick, fmtInt } from '../js/tk.js';

const inp = $('#in');
let db = null;
const out = $('#out');
const LIMIT = 300;

const run = () => {
  if (!db) { out.replaceChildren(el('tr', {}, el('td', { colspan: 4, class: 'dim', text: 'loading the IANA registry…' }))); return; }
  const q = inp.value.trim().toLowerCase(), proto = pick('proto');
  let test;
  const r = q.match(/^(\d+)\s*-\s*(\d+)$/);
  if (r) test = (e) => e[0] >= +r[1] && e[0] <= +r[2];
  else if (/^\d+$/.test(q)) test = (e) => e[0] === +q;
  else if (q) test = (e) => e[2].toLowerCase().includes(q) || e[3].toLowerCase().includes(q);
  else test = () => true;
  const hits = db.filter((e) => (!proto || e[1] === proto) && test(e));
  $('#cnt').textContent = `${fmtInt(hits.length)} match${hits.length === 1 ? '' : 'es'}${hits.length > LIMIT ? ` · first ${LIMIT}` : ''}`;
  out.replaceChildren(...(hits.length ? hits.slice(0, LIMIT).map((e) => el('tr', {},
    el('td', { text: e[0] }), el('td', { class: 'dim', text: e[1] }), el('td', { text: e[2] || '—' }), el('td', { text: e[3] }))) :
    [el('tr', {}, el('td', { colspan: 4, class: 'dim', text: 'unassigned in the IANA registry (it may still be used unofficially)' }))]));
};
live([inp, ...$$('input[name="proto"]')], run);
fetch(inp.dataset.ports).then((r) => r.json()).then((j) => {
  db = Object.entries(j).map(([k, [svc, desc]]) => { const [p, proto] = k.split('/'); return [+p, proto, svc || '', desc || '']; })
    .sort((a, b) => a[0] - b[0] || a[1].localeCompare(b[1]));
  run();
});
