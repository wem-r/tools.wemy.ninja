import cronstrue from 'cronstrue';
import { $, el, kv, live, msg } from '../js/tk.js';
import { parseCron, nextRuns, MACROS } from './lib/cron.js';

const inp = $('#in');
const PRESETS = [['every minute', '* * * * *'], ['every 5 min', '*/5 * * * *'], ['hourly', '0 * * * *'], ['daily 03:00', '0 3 * * *'],
  ['weekdays 9:00', '0 9 * * 1-5'], ['weekly', '0 0 * * 0'], ['monthly', '0 0 1 * *'], ['@reboot', '@reboot']];
$('#presets').append(...PRESETS.map(([n, e]) => el('button', { type: 'button', class: 'tk-btn', text: n, onclick: () => { inp.value = e; inp.dispatchEvent(new Event('input')); } })));
const toText = (cronstrue.default || cronstrue).toString;
const list = (set, lo, hi, names) => {
  const a = [...set].sort((x, y) => x - y);
  if (a.length === hi - lo + 1) return 'every';
  return a.map((v) => (names ? names[v] : v)).join(', ');
};
const MON = [, 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

live(inp, () => {
  const e = inp.value.trim();
  if (e.toLowerCase() === '@reboot') { msg($('#msg'), ''); $('#human').textContent = 'Once, when the cron daemon starts (at boot).'; kv($('#next'), []); kv($('#fields'), []); return; }
  let c;
  try { c = parseCron(e); msg($('#msg'), ''); }
  catch (err) { msg($('#msg'), err.message); $('#human').textContent = ''; kv($('#next'), []); kv($('#fields'), []); return; }
  const expr = MACROS[e.toLowerCase()] || e;
  try { $('#human').textContent = toText(expr, { use24HourTimeFormat: true, verbose: true }) + '.'; }
  catch (err) { $('#human').textContent = String(err); }
  const fmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  kv($('#next'), nextRuns(c, 5).map((d, i) => [String(i + 1), fmt.format(d), d.toISOString()]));
  kv($('#fields'), [
    ['minute', list(c.min, 0, 59)], ['hour', list(c.hour, 0, 23)], ['day of month', list(c.dom, 1, 31)],
    ['month', list(c.mon, 1, 12, MON)], ['day of week', list(c.dow, 0, 6, DOW)],
    expr !== e && ['expands to', expr],
  ]);
});
