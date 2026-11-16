import { $, kv, live } from '../js/tk.js';

const local = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 19);
$('#start').value = local(new Date(Date.now() - 47 * 6e4));
const dur = (ms) => { if (!isFinite(ms)) return '∞'; const s = Math.round(ms / 1000), d = Math.floor(s / 86400), h = Math.floor(s / 3600) % 24, m = Math.floor(s / 60) % 60; return [d && `${d} d`, (d || h) && `${h} h`, `${m} min`, !d && !h && `${s % 60} s`].filter(Boolean).join(' '); };
live([$('#done'), $('#total'), $('#start'), $('#el')], () => {
  const done = +$('#done').value, total = +$('#total').value;
  const elapsed = $('#el').value !== '' ? +$('#el').value * 6e4 : Date.now() - new Date($('#start').value).getTime();
  if (!(total > 0) || !(done > 0) || !(elapsed > 0)) { kv($('#out'), [['status', 'need done > 0, total > 0 and a start time in the past']]); return; }
  const rate = done / elapsed, left = (total - done) / rate, end = new Date(Date.now() + left);
  kv($('#out'), [['progress', `${((done / total) * 100).toFixed(1)} %`], ['elapsed', dur(elapsed)], ['speed', `${(rate * 6e4).toPrecision(4)} / min · ${(rate * 3.6e6).toPrecision(4)} / h`],
    ['time left', done >= total ? 'done' : dur(left)], ['finishes at', done >= total ? '' : end.toLocaleString()], ['total duration', dur(total / rate)]]);
});
