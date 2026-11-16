// Cron expression parser and next-run calculator (Vixie / crontab(5) semantics, local time). Pure.

const FIELDS = [
  ['minute', 0, 59], ['hour', 0, 23], ['day of month', 1, 31], ['month', 1, 12], ['day of week', 0, 7],
];
const NAMES = {
  3: ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'],
  4: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
};
export const MACROS = {
  '@yearly': '0 0 1 1 *', '@annually': '0 0 1 1 *', '@monthly': '0 0 1 * *', '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *', '@midnight': '0 0 * * *', '@hourly': '0 * * * *',
};

function field(src, i) {
  const [name, lo, hi] = FIELDS[i];
  const set = new Set();
  const num = (v) => {
    const n = NAMES[i]?.indexOf(v.toLowerCase());
    const x = n >= 0 ? n + (i === 3 ? 1 : 0) : /^\d+$/.test(v) ? Number(v) : NaN;
    if (!(x >= lo && x <= hi)) throw new Error(`${name}: "${v}" is out of range ${lo}–${hi}`);
    return x;
  };
  for (const part of src.split(',')) {
    const m = part.match(/^(\*|[\w]+(?:-[\w]+)?)(?:\/(\d+))?$/);
    if (!m) throw new Error(`${name}: cannot read "${part}"`);
    let a = lo, b = hi;
    if (m[1] !== '*') {
      const [x, y] = m[1].split('-');
      a = num(x); b = y !== undefined ? num(y) : m[2] ? hi : a;
      if (a > b) throw new Error(`${name}: range ${m[1]} goes backwards`);
    }
    const step = m[2] ? Number(m[2]) : 1;
    if (!step) throw new Error(`${name}: step must be ≥ 1`);
    for (let v = a; v <= b; v += step) set.add(i === 4 && v === 7 ? 0 : v);
  }
  return { set, star: src.startsWith('*') };
}

export function parseCron(expr) {
  let e = String(expr).trim().toLowerCase();
  if (e === '@reboot') throw new Error('@reboot runs at boot, it has no schedule');
  e = MACROS[e] || e;
  const parts = e.split(/\s+/);
  if (parts.length !== 5) throw new Error(`expected 5 fields (minute hour dom month dow), got ${parts.length}`);
  const f = parts.map(field);
  return { min: f[0].set, hour: f[1].set, dom: f[2].set, mon: f[3].set, dow: f[4].set, domStar: f[2].star, dowStar: f[4].star };
}

/** Next `n` run times after `from` (local time). Day-of-month and day-of-week are OR-ed when both are restricted. */
export function nextRuns(expr, n = 5, from = new Date()) {
  const c = typeof expr === 'string' ? parseCron(expr) : expr;
  const d = new Date(from.getTime());
  d.setSeconds(0, 0); d.setMinutes(d.getMinutes() + 1);
  const out = [];
  const limit = from.getTime() + 8 * 366 * 864e5;
  const dayOk = (x) => {
    const a = c.dom.has(x.getDate()), b = c.dow.has(x.getDay());
    if (c.domStar && c.dowStar) return true;
    if (c.domStar) return b;
    if (c.dowStar) return a;
    return a || b;
  };
  while (out.length < n && d.getTime() < limit) {
    if (!c.mon.has(d.getMonth() + 1)) { d.setMonth(d.getMonth() + 1, 1); d.setHours(0, 0); continue; }
    if (!dayOk(d)) { d.setDate(d.getDate() + 1); d.setHours(0, 0); continue; }
    if (!c.hour.has(d.getHours())) { d.setHours(d.getHours() + 1, 0); continue; }
    if (!c.min.has(d.getMinutes())) { d.setMinutes(d.getMinutes() + 1); continue; }
    out.push(new Date(d.getTime()));
    d.setMinutes(d.getMinutes() + 1);
  }
  return out;
}
