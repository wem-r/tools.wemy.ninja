// Timestamp parsing and formats. Pure (the "now" is injectable).

const FT_EPOCH = 116444736000000000n; // 100-ns ticks between 1601-01-01 and 1970-01-01

/** Guess what a number is. Returns { ms (BigInt-safe Number of Unix ms), unit } or throws. */
export function readNumber(s, unit = 'auto') {
  const t = String(s).trim();
  if (!/^-?\d+(\.\d+)?$/.test(t)) throw new Error('not a number');
  const n = Number(t);
  const digits = t.replace(/^-/, '').split('.')[0].length;
  if (unit === 'auto') {
    if (digits >= 17) unit = 'filetime';
    else if (digits >= 15) unit = 'us';
    else if (digits >= 12) unit = 'ms';
    else unit = 's';
    if (digits >= 19 && t.length <= 19) unit = 'ns';
  }
  const conv = {
    s: () => n * 1000, ms: () => n, us: () => n / 1000, ns: () => n / 1e6,
    filetime: () => Number((BigInt(t.split('.')[0]) - FT_EPOCH) / 10000n),
  };
  if (!conv[unit]) throw new Error(`unknown unit ${unit}`);
  return { ms: conv[unit](), unit };
}

/** Parse anything: a number (see readNumber) or a date string Date.parse understands. */
export function parseTime(s, unit = 'auto') {
  const t = String(s).trim();
  if (!t) throw new Error('empty');
  if (/^-?\d+(\.\d+)?$/.test(t)) return readNumber(t, unit);
  const ms = Date.parse(t);
  if (Number.isNaN(ms)) throw new Error('could not read this as a date');
  return { ms, unit: 'date string' };
}

export const toFiletime = (ms) => BigInt(Math.round(ms)) * 10000n + FT_EPOCH;

export function relative(ms, now = Date.now()) {
  const d = (ms - now) / 1000, a = Math.abs(d);
  const steps = [[60, 'second', 1], [3600, 'minute', 60], [86400, 'hour', 3600], [2629800, 'day', 86400], [31557600, 'month', 2629800], [Infinity, 'year', 31557600]];
  for (const [lim, u, div] of steps) if (a < lim) {
    const v = Math.round(a / div);
    const w = `${v} ${u}${v === 1 ? '' : 's'}`;
    return d >= 0 ? `in ${w}` : `${w} ago`;
  }
}

export function formats(ms, now = Date.now()) {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) throw new Error('date out of range');
  const pad = (x, n = 2) => String(x).padStart(n, '0');
  const off = -d.getTimezoneOffset();
  const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ` +
    `${off >= 0 ? '+' : '-'}${pad(Math.floor(Math.abs(off) / 60))}:${pad(Math.abs(off) % 60)}`;
  return [
    ['Unix seconds', String(Math.floor(ms / 1000))],
    ['Unix milliseconds', String(Math.round(ms))],
    ['ISO 8601 (UTC)', d.toISOString()],
    ['Local', local],
    ['RFC 2822 / HTTP', d.toUTCString()],
    ['Relative', relative(ms, now)],
    ['Windows FILETIME / LDAP', toFiletime(ms).toString()],
    ['Day of year / ISO week', `${dayOfYear(d)} / W${isoWeek(d)}`],
  ];
}
const dayOfYear = (d) => Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(d.getUTCFullYear(), 0, 1)) / 864e5) + 1;
function isoWeek(d) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  return Math.ceil(((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7);
}
