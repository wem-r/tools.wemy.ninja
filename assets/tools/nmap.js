import { $, $$, el, live, pick } from '../js/tk.js';
import { SCANS, NSE, PRESETS, build } from './lib/nmap.js';

$('#scan').append(...SCANS.map(([v, t]) => el('option', { value: v, text: `${v}  ${t}` })));
$('#scan').value = '-sS';
$('#t').append(...[0, 1, 2, 3, 4, 5].map((n) => el('option', { value: String(n), text: `-T${n} ${['paranoid', 'sneaky', 'polite', 'normal', 'aggressive', 'insane'][n]}` })));
$('#t').value = '4';
$('#preset').append(...Object.keys(PRESETS).map((k) => el('option', { value: k, text: k })));
$('#nse-cats').append(...NSE.map(([c]) => el('option', { value: c })), el('option', { value: 'default,vuln' }));
$('#nse').append(el('tr', {}, el('th', { text: 'category' }), el('th', { text: 'what it does' })), ...NSE.map(([c, d]) => el('tr', {}, el('td', {}, el('code', { text: c })), el('td', { class: 'dim', text: d }))));

const opts = () => ({ target: $('#target').value, scan: $('#scan').value, ports: pick('ports'), top: +$('#top').value, range: $('#range').value, list: $('#list').value,
  sv: $('#sv').checked, svLight: $('#svLight').checked, sc: $('#sc').checked, o: $('#o').checked, a: $('#a').checked, pn: $('#pn').checked, n: $('#n').checked,
  open: $('#open').checked, reason: $('#reason').checked, f: $('#f').checked, t: +$('#t').value, v: +$('#v').value, scripts: $('#scripts').value, scriptArgs: $('#scriptArgs').value, out: $('#out').value });

function render() {
  const mode = pick('ports');
  $('#top').hidden = mode !== 'top'; $('#range').hidden = mode !== 'range'; $('#list').hidden = mode !== 'list';
  $('#outcmd').value = build(opts());
}
$('#preset').addEventListener('change', () => {
  const p = PRESETS[$('#preset').value]; if (!p) return;
  if (p.scan) $('#scan').value = p.scan;
  if ('ports' in p) { const r = $$('#ports input').find((x) => x.value === (p.ports || 'top')); if (r) r.checked = true; }
  for (const key of ['sv', 'sc', 'o', 'a', 'pn', 'n', 'open', 'f']) $('#' + key).checked = !!p[key];
  if (p.top) $('#top').value = p.top;
  if (p.t != null) $('#t').value = p.t;
  $('#scripts').value = p.scripts || '';
  render();
});
live([$('#target'), $('#scan'), $('#top'), $('#range'), $('#list'), $('#t'), $('#v'), $('#scripts'), $('#scriptArgs'), $('#out'),
  ...$$('#ports input'), ...$$('#flags input')], () => { $('#preset').value = ''; render(); });
render();
