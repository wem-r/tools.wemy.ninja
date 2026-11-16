import { $, live, kv } from '../js/tk.js';
import { runLines } from './lib/mathexpr.js';

const fmt = (v) => (typeof v !== 'number' ? String(v) : Number.isInteger(v) && Math.abs(v) < 1e21 ? v.toLocaleString('en-US').replace(/,/g, ' ') : Math.abs(v) >= 1e15 || (v !== 0 && Math.abs(v) < 1e-6) ? v.toExponential(10).replace(/\.?0+e/, 'e') : String(+v.toPrecision(14)));
live($('#in'), () => kv($('#out'), runLines($('#in').value).map((r) => [r.src, r.error ? `⚠ ${r.error}` : fmt(r.value)])));
