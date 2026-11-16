import { $, $$, el, kv, live, msg, pick, enc } from '../js/tk.js';
import { toUnicode } from './lib/punycode.js';

const inp = $('#in');
let u = null;

function table() {
  const rows = [...u.searchParams.entries()];
  const sync = () => { inp.value = u.href; render(false); };
  $('#qs').replaceChildren(
    el('tr', {}, el('th', { text: 'key' }), el('th', { text: 'value (decoded)' }), el('th', {})),
    ...rows.map(([k, v], i) => {
      const ki = el('input', { value: k, spellcheck: 'false' }), vi = el('input', { value: v, spellcheck: 'false' });
      const upd = () => { const all = [...u.searchParams.entries()]; all[i] = [ki.value, vi.value]; u.search = new URLSearchParams(all).toString(); sync(); };
      ki.addEventListener('change', upd); vi.addEventListener('change', upd);
      return el('tr', {}, el('td', {}, ki), el('td', {}, vi), el('td', {}, el('button', { type: 'button', class: 'tk-copy', text: 'remove', onclick: () => {
        const all = [...u.searchParams.entries()]; all.splice(i, 1); u.search = new URLSearchParams(all).toString(); sync(); table(); } })));
    }),
  );
}
function render(rebuildTable = true) {
  const dec = (s) => { try { return decodeURIComponent(s); } catch { return s; } };
  kv($('#out'), [
    ['protocol', u.protocol],
    u.username && ['username', dec(u.username)], u.password && ['password', dec(u.password), 'credentials in a URL end up in logs and history'],
    ['hostname', u.hostname, /xn--/.test(u.hostname) ? `IDN: ${toUnicode(u.hostname)}` : ''],
    ['port', u.port || '(default)', u.port ? '' : { 'http:': '80', 'https:': '443', 'ftp:': '21', 'ws:': '80', 'wss:': '443' }[u.protocol] || ''],
    ['origin', u.origin],
    ['path', dec(u.pathname), u.pathname !== dec(u.pathname) ? `raw ${u.pathname}` : ''],
    ['query', u.search],
    ['fragment', u.hash],
    ['normalised', u.href],
  ]);
  if (rebuildTable) table();
}
live(inp, () => {
  try { u = new URL(inp.value.trim()); msg($('#msg'), ''); render(); }
  catch { msg($('#msg'), 'not an absolute URL (it needs a scheme, e.g. https://)'); $('#out').replaceChildren(); $('#qs').replaceChildren(); }
});
$('#addq').addEventListener('click', () => { if (!u) return; u.searchParams.append('key', 'value'); inp.value = u.href; render(); });

// encode / decode
const plain = $('#plain'), coded = $('#coded');
const ENC = {
  comp: encodeURIComponent, uri: encodeURI,
  form: (s) => new URLSearchParams({ x: s }).toString().slice(2),
  all: (s) => [...enc.encode(s)].map((b) => '%' + b.toString(16).toUpperCase().padStart(2, '0')).join(''),
};
const DEC = { comp: decodeURIComponent, uri: decodeURI, form: (s) => decodeURIComponent(s.replace(/\+/g, ' ')), all: decodeURIComponent };
const fwd = () => { try { coded.value = ENC[pick('mode')](plain.value); msg($('#emsg'), ''); } catch (e) { msg($('#emsg'), e.message); } };
live([plain, ...$$('input[name="mode"]')], fwd);
coded.addEventListener('input', () => { try { plain.value = DEC[pick('mode')](coded.value); msg($('#emsg'), ''); } catch { msg($('#emsg'), 'malformed % sequence'); } });
