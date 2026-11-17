import { $, $$, el, live, pick, msg } from '../js/tk.js';
import { SHELLS, ENCODINGS, PAYLOADS, LISTENERS, generate, listen } from './lib/revshells.js';

// static selects / datalist
$('#tk-shells').append(...SHELLS.map((s) => el('option', { value: s })));
$('#enc').append(...ENCODINGS.map(([v, t]) => el('option', { value: v, text: t })));
$('#lsnr').append(...LISTENERS.map((l) => el('option', { value: l.id, text: l.name })));

let current = PAYLOADS[0].id;

const opts = () => ({ ip: $('#ip').value.trim() || '10.10.14.1', port: ($('#port').value.trim() || '9001'), shell: $('#shell').value.trim() || '/bin/sh' });

function visible() {
  const type = pick('type'), os = pick('os'), q = $('#filter').value.trim().toLowerCase();
  return PAYLOADS.filter((p) => {
    if (type === 'bind' && !p.bind) return false;
    if (os && p.os !== os && p.os !== 'any') return false;
    if (q && !(`${p.name} ${p.group} ${p.id}`.toLowerCase().includes(q))) return false;
    return true;
  });
}

function buildList() {
  const list = visible();
  if (!list.some((p) => p.id === current)) current = list[0]?.id;
  const groups = [...new Set(list.map((p) => p.group))];
  $('#list').replaceChildren(...groups.flatMap((g) => [
    el('div', { class: 'tk-rev-grp', text: g }),
    ...list.filter((p) => p.group === g).map((p) => el('button', {
      type: 'button', class: 'tk-rev-item' + (p.id === current ? ' on' : ''), 'data-id': p.id,
      onclick: () => { current = p.id; render(); },
    }, p.name, p.os === 'win' ? el('span', { class: 'tag', text: 'win' }) : p.os === 'any' ? el('span', { class: 'tag', text: 'any' }) : null)),
  ]));
  if (!list.length) $('#list').append(el('p', { class: 'dim', text: 'no payloads match' }));
}

function render() {
  buildList();
  const o = opts(), type = pick('type'), enc = $('#enc').value;
  const p = PAYLOADS.find((x) => x.id === current);
  if (!/^\d{1,5}$/.test(o.port) || +o.port > 65535) msg($('#msg'), 'port should be 1–65535', 'warn'); else msg($('#msg'), '');
  for (const b of $$('.tk-rev-item')) b.classList.toggle('on', b.dataset.id === current);
  if (!p) { $('#cmd').value = ''; $('#pname').textContent = '—'; return; }
  $('#pname').textContent = p.name;
  $('#pos').textContent = { nix: 'Linux / Unix', win: 'Windows', any: 'cross-platform', mac: 'macOS' }[p.os] || '';
  $('#cmd').value = generate(p, o, enc, type);
  $('#note').textContent = type === 'bind' ? 'Bind shell: it listens on the target; connect to it with the command below.' : (p.note || '');
  $('#cmd').rows = Math.min(10, ($('#cmd').value.match(/\n/g)?.length || 0) + Math.ceil($('#cmd').value.length / 70) + 1);
  // catcher
  const l = LISTENERS.find((x) => x.id === $('#lsnr').value) || LISTENERS[0];
  const lc = listen(l, o, type);
  $('#llabel').textContent = type === 'bind' ? 'connect — run this on your box' : 'listener — run this on your box first';
  $('#lcmd').value = lc || `${l.name} has no ${type === 'bind' ? 'connect' : 'listener'} form — pick another`;
}

live([$('#ip'), $('#port'), $('#shell'), $('#enc'), $('#lsnr'), $('#filter'), ...$$('#type input'), ...$$('#os input')], render);