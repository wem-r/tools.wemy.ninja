// Username permutations and password-spray lists. Pure string generation — for building
// candidate lists against accounts you are authorised to test.

const strip = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z-]/g, '').toLowerCase();

export const FORMATS = [
  ['flast', (f, l) => f[0] + l],
  ['f.last', (f, l) => f[0] + '.' + l],
  ['f_last', (f, l) => f[0] + '_' + l],
  ['first.last', (f, l) => f + '.' + l],
  ['first_last', (f, l) => f + '_' + l],
  ['firstlast', (f, l) => f + l],
  ['first.l', (f, l) => f + '.' + l[0]],
  ['firstl', (f, l) => f + l[0]],
  ['lastf', (f, l) => l + f[0]],
  ['last.first', (f, l) => l + '.' + f],
  ['lastfirst', (f, l) => l + f],
  ['last', (f, l) => l],
  ['first', (f, l) => f],
  ['flast (3)', (f, l) => f.slice(0, 3) + l.slice(0, 3)],
];

export function usernames(fullNames, formatIds, { domain = '', upper = false } = {}) {
  const fmts = FORMATS.filter(([id]) => formatIds.includes(id));
  const set = new Set();
  for (const raw of fullNames) {
    const parts = raw.trim().split(/[\s,]+/).filter(Boolean).map(strip).filter(Boolean);
    if (parts.length < 1) continue;
    const first = parts[0], last = parts.length > 1 ? parts[parts.length - 1] : parts[0];
    for (const [, fn] of fmts) {
      let u;
      try { u = fn(first, last); } catch { continue; }
      if (!u) continue;
      if (upper) u = u.toUpperCase();
      set.add(domain ? u + domain : u);
    }
  }
  return [...set];
}

const SEASONS = ['Spring', 'Summer', 'Autumn', 'Fall', 'Winter'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const leet = (s) => s.replace(/a/gi, '4').replace(/e/gi, '3').replace(/i/gi, '1').replace(/o/gi, '0').replace(/s/gi, '$');

export function sprayList({ bases = [], year = new Date().getFullYear(), seasons = true, months = false, suffixes = ['', '!', '1', '123', '@', '#', '2024', '2025'], leetspeak = false, capitalize = true } = {}) {
  const roots = new Set();
  const cap = (s) => (capitalize ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s);
  const yrs = [year, year % 100, (year - 1), (year - 1) % 100];
  if (seasons) for (const s of SEASONS) for (const y of yrs) roots.add(cap(s) + y);
  if (months) for (const mo of MONTHS) for (const y of [year, year % 100]) roots.add(cap(mo) + y);
  for (const b of bases.map((x) => x.trim()).filter(Boolean)) {
    roots.add(cap(b));
    for (const y of yrs) roots.add(cap(b) + y);
    roots.add(cap(b) + '@' + year);
  }
  const out = new Set();
  for (const r of roots) for (const suf of suffixes) {
    out.add(r + suf);
    if (leetspeak) out.add(leet(r) + suf);
  }
  return [...out];
}
