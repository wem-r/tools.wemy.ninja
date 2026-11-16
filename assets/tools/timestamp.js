import { $, $$, kv, live, msg, pick } from '../js/tk.js';
import { parseTime, formats } from './lib/timefmt.js';

const inp = $('#in'), pickEl = $('#pick');
const pad = (x) => String(x).padStart(2, '0');
const toLocalInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

const run = live([inp, ...$$('input[name="unit"]')], () => {
  try {
    const { ms, unit } = parseTime(inp.value, pick('unit'));
    msg($('#msg'), `read as ${{ s: 'Unix seconds', ms: 'Unix milliseconds', us: 'Unix microseconds', ns: 'Unix nanoseconds', filetime: 'Windows FILETIME (100 ns since 1601)' }[unit] || unit}`, 'ok');
    kv($('#out'), formats(ms));
    pickEl.value = toLocalInput(new Date(ms));
  } catch (e) { msg($('#msg'), e.message); $('#out').replaceChildren(); }
});
$('#now').addEventListener('click', () => { inp.value = String(Math.floor(Date.now() / 1000)); run(); });
pickEl.addEventListener('change', () => { const d = new Date(pickEl.value); if (!isNaN(d)) { inp.value = String(Math.floor(d / 1000)); run(); } });
const tick = () => { $('#clock').textContent = `${Math.floor(Date.now() / 1000)} · ${new Date().toISOString()}`; };
tick(); setInterval(tick, 1000);
