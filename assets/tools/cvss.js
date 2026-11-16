import { CVSS31, CVSS40 } from '@pandatix/js-cvss';
import { $, $$, el, live, msg, pick } from '../js/tk.js';
import { V31, V40, rating } from './lib/cvssmeta.js';

const DEF = { '4.0': 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N', '3.1': 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H' };
let cv = null;
const meta = () => (pick('ver') === '4.0' ? V40 : V31);

function draw() {
  const groups = {};
  for (const m of meta()) (groups[m[3]] ||= []).push(m);
  const more = $('#more').checked;
  $('#metrics').replaceChildren(...Object.entries(groups).filter(([g]) => more || g.startsWith('Base')).map(([g, ms]) => el('div', {},
    el('div', { class: 'tk-sec', text: g }),
    ...ms.map(([k, name, vals]) => el('div', { class: 'tk-cvss-row' }, el('span', { class: 'dim', text: `${name} (${k})` }),
      el('div', { class: 'tk-seg' }, ...vals.map(([v, label]) => el('label', {}, el('input', { type: 'radio', name: `m-${k}`, value: v, checked: cv.Get(k) === v, onchange: () => { cv.Set(k, v); update(); } }), el('span', { text: label })))))))));
}
// built here from the metric list: js-cvss 0.4.4's CVSS31.Vector() throws (it loops over Object.entries with for…in)
const vector = () => (pick('ver') === '4.0' ? 'CVSS:4.0' : 'CVSS:3.1') + meta().map(([k, , , g]) => [k, cv.Get(k), g]).filter(([, v, g]) => g.startsWith('Base') || v !== 'X').map(([k, v]) => `/${k}:${v}`).join('');
function update() {
  $('#vec').value = vector();
  const v4 = pick('ver') === '4.0';
  const s = v4 ? cv.Score() : cv.BaseScore();
  const cls = (x) => `tk-sev ${rating(x).toLowerCase()}`;
  const parts = [el('div', { class: cls(s) }, el('b', { text: s.toFixed(1) }), el('span', { text: rating(s) }))];
  if (v4) parts.push(el('div', { class: 'dim', text: `${cv.Nomenclature()} · scored with the official CVSS 4.0 macro-vector tables` }));
  else {
    const t = cv.TemporalScore(), e = cv.EnvironmentalScore();
    parts.push(el('div', { class: 'dim', text: `impact ${cv.Impact().toFixed(1)} · exploitability ${cv.Exploitability().toFixed(1)} · temporal ${t.toFixed(1)} (${rating(t)}) · environmental ${e.toFixed(1)} (${rating(e)})` }));
  }
  $('#score').replaceChildren(...parts);
}
function load(vector) {
  const v4 = /^CVSS:4\.0\//.test(vector);
  const Cls = v4 ? CVSS40 : CVSS31;
  if (/^CVSS:3\.[01]\//.test(vector) || v4) $(`input[name="ver"][value="${v4 ? '4.0' : '3.1'}"]`).checked = true;
  cv = new Cls(vector.replace(/^CVSS:3\.0\//, 'CVSS:3.1/'));
  msg($('#msg'), '');
  draw(); update();
}
$('#vec').addEventListener('input', () => {
  const v = $('#vec').value.trim();
  try { load(v); } catch (e) { msg($('#msg'), `not a valid ${/4\.0/.test(v) ? 'CVSS 4.0' : 'CVSS 3.x'} vector: ${e.message || e.constructor.name}`); }
});
live($$('input[name="ver"]'), () => load(DEF[pick('ver')]), ['change']);
$('#more').addEventListener('change', draw);
