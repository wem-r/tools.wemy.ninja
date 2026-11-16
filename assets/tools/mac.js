import { $, el, kv, live, msg } from '../js/tk.js';
import { parseMac, formats, oui, isMulticast, isLocal, eui64, randomMac } from './lib/mac.js';

const inp = $('#in');
let db = null;
const load = fetch(inp.dataset.oui).then((r) => r.json()).then((j) => { db = j; }).catch(() => { db = {}; });

const run = live(inp, () => {
  let b;
  try { b = parseMac(inp.value); msg($('#msg'), ''); }
  catch (e) { msg($('#msg'), e.message); $('#out').replaceChildren(); return; }
  const f = formats(b), o = oui(b);
  const vendor = db == null ? 'loading…' : db[o] || (isLocal(b) ? '— (locally administered, no vendor)' : 'not in the IEEE MA-L registry');
  const e = eui64(b);
  kv($('#out'), [
    ['vendor', vendor, db ? `OUI ${o}` : ''],
    ['colon', f.colon], ['hyphen (Windows)', f.hyphen], ['dot (Cisco)', f.cisco], ['bare', f.bare], ['upper', f.upper],
    ['cast', isMulticast(b) ? (f.colon === 'ff:ff:ff:ff:ff:ff' ? 'broadcast' : 'multicast (I/G bit set)') : 'unicast'],
    ['administration', isLocal(b) ? 'locally administered (U/L bit set) — often a randomised / private MAC' : 'universally administered (burned-in)'],
    ['EUI-64 interface id', e.id],
    ['IPv6 link-local', e.linkLocal],
  ]);
});
load.then(run);
$('#rnd').addEventListener('click', () => { inp.value = formats(randomMac(null)).colon; run(); });
$('#rndv').addEventListener('click', () => {
  try { inp.value = formats(randomMac(parseMac(inp.value))).colon; run(); } catch (e) { msg($('#msg'), e.message); }
});

const vq = $('#vq');
live(vq, () => {
  const q = vq.value.trim().toLowerCase();
  if (q.length < 3 || !db) { $('#vres').replaceChildren(); return; }
  const hits = Object.entries(db).filter(([, v]) => v.toLowerCase().includes(q));
  $('#vres').replaceChildren(
    el('tr', {}, el('th', { text: `OUI (${hits.length})` }), el('th', { text: 'vendor' })),
    ...hits.slice(0, 200).map(([k, v]) => el('tr', {}, el('td', { text: k.match(/../g).join(':') }), el('td', { text: v }))),
  );
});
load.then(() => vq.dispatchEvent(new Event('input')));
