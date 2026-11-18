import { $, $$, el, live, pick, msg } from '../js/tk.js';
import { buildSPF, buildDMARC, explain } from './lib/dmarc.js';

function render() {
  const mode = pick('mode'), kind = pick('kind');
  $('#build').hidden = mode !== 'build'; $('#explain').hidden = mode === 'build'; $('#kind').style.display = mode === 'build' ? '' : 'none';
  if (mode === 'build') {
    $('#spf-f').hidden = kind !== 'spf'; $('#dmarc-f').hidden = kind === 'spf';
    if (kind === 'spf') {
      $('#rec').value = buildSPF({ ip4: $('#ip4').value, include: $('#include').value, a: $('#a').checked, mx: $('#mx').checked, all: $('#all').value });
      $('#rl').textContent = 'SPF record — TXT at ' + ($('#domain').value || 'example.com');
      $('#hosthint').textContent = 'host: @ (or the domain root), type TXT';
    } else {
      const r = buildDMARC({ domain: $('#domain').value, p: $('#p').value, pct: $('#pct').value, rua: $('#rua').value });
      $('#rec').value = r.value; $('#rl').textContent = 'DMARC record'; $('#hosthint').textContent = 'host: ' + r.host + ', type TXT';
    }
  } else {
    const r = explain($('#exin').value);
    msg($('#emsg'), r.type === 'unknown' ? 'not recognised' : 'detected: ' + r.type, r.type === 'unknown' ? 'warn' : 'ok');
    $('#exout').replaceChildren(el('tr', {}, el('th', { text: 'term' }), el('th', { text: 'meaning' })),
      ...r.rows.map(([a, b]) => el('tr', {}, el('td', {}, el('code', { text: a })), el('td', { class: 'dim', text: b }))));
  }
}
live([$('#domain'), $('#ip4'), $('#include'), $('#a'), $('#mx'), $('#all'), $('#p'), $('#pct'), $('#rua'), $('#exin'), ...$$('#mode input'), ...$$('#kind input')], render);
