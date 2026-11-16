// Text helpers: case, slug, accents, statistics, line operations. Pure.

export const removeAccents = (s) => s.normalize('NFD').replace(/\p{M}/gu, '')
  .replace(/ß/g, 'ss').replace(/æ/g, 'ae').replace(/Æ/g, 'AE').replace(/œ/g, 'oe').replace(/Œ/g, 'OE')
  .replace(/ø/g, 'o').replace(/Ø/g, 'O').replace(/ł/g, 'l').replace(/Ł/g, 'L').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/þ/g, 'th');

/** Split into words, understanding camelCase, snake_case, kebab-case and dots. */
export function words(s) {
  return String(s)
    .replace(/([\p{Ll}\d])(\p{Lu})/gu, '$1 $2')
    .replace(/(\p{Lu})(\p{Lu}\p{Ll})/gu, '$1 $2')
    .split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}
const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
const SMALL = new Set('a an and as at but by for if in nor of on or so the to up via vs yet'.split(' '));
const AP_SMALL = new Set('a an and at but by for in nor of on or so the to up yet'.split(' '));

function title(s, small) {
  return s.toLowerCase().replace(/[\p{L}\p{N}'’]+/gu, (w, i) => {
    const before = s.slice(0, i), atStart = !before.trim() || /[:.!?—–-]\s*$/.test(before);
    const isLast = !/[\p{L}\p{N}]/u.test(s.slice(i + w.length));
    return !atStart && !isLast && small.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1);
  });
}

export const CASES = {
  upper: ['UPPER CASE', (s) => s.toUpperCase()],
  lower: ['lower case', (s) => s.toLowerCase()],
  title: ['Title Case', (s) => title(s, SMALL)],
  ap: ['AP-style title', (s) => title(s, AP_SMALL)],
  sentence: ['Sentence case', (s) => s.toLowerCase().replace(/(^\s*|[.!?]\s+)(\p{L})/gu, (a, p, l) => p + l.toUpperCase())],
  camel: ['camelCase', (s) => words(s).map((w, i) => (i ? cap(w) : w.toLowerCase())).join('')],
  pascal: ['PascalCase', (s) => words(s).map(cap).join('')],
  snake: ['snake_case', (s) => words(s).map((w) => w.toLowerCase()).join('_')],
  constant: ['CONSTANT_CASE', (s) => words(s).map((w) => w.toUpperCase()).join('_')],
  kebab: ['kebab-case', (s) => words(s).map((w) => w.toLowerCase()).join('-')],
  train: ['Train-Case', (s) => words(s).map(cap).join('-')],
  dot: ['dot.case', (s) => words(s).map((w) => w.toLowerCase()).join('.')],
  path: ['path/case', (s) => words(s).map((w) => w.toLowerCase()).join('/')],
  swap: ['sWAP cASE', (s) => [...s].map((c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase())).join('')],
  alternating: ['aLtErNaTiNg', (s) => { let i = 0; return [...s].map((c) => (/\p{L}/u.test(c) ? (i++ % 2 ? c.toUpperCase() : c.toLowerCase()) : c)).join(''); }],
};

export function slugify(s, { sep = '-', lower = true, max = 0 } = {}) {
  let out = removeAccents(String(s)).replace(/&/g, ' and ').replace(/['’]/g, '');
  if (lower) out = out.toLowerCase();
  out = out.replace(/[^A-Za-z0-9]+/g, sep).replace(new RegExp(`^\\${sep}+|\\${sep}+$`, 'g'), '');
  if (max && out.length > max) out = out.slice(0, max).replace(new RegExp(`\\${sep}[^\\${sep}]*$`), '') || out.slice(0, max);
  return out;
}

export function stats(text) {
  const t = String(text);
  const ws = t.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || [];
  const sentences = (t.match(/[^.!?]+[.!?]+(\s|$)/g) || []).length || (t.trim() ? 1 : 0);
  const graphemes = typeof Intl !== 'undefined' && Intl.Segmenter ? [...new Intl.Segmenter().segment(t)].length : [...t].length;
  const letters = (t.match(/\p{L}/gu) || []);
  const vowels = letters.filter((c) => /[aeiouyàâäéèêëîïôöùûüÿæœ]/i.test(c)).length;
  return {
    chars: graphemes, codePoints: [...t].length, utf16: t.length, bytes: new TextEncoder().encode(t).length,
    noSpaces: t.replace(/\s/g, '').length, words: ws.length, uniqueWords: new Set(ws.map((w) => w.toLowerCase())).size,
    lines: t ? t.split(/\r\n|\r|\n/).length : 0, paragraphs: t.split(/\n\s*\n/).filter((p) => p.trim()).length, sentences,
    letters: letters.length, vowels, consonants: letters.length - vowels, digits: (t.match(/\p{N}/gu) || []).length,
    spaces: (t.match(/\s/g) || []).length, readingMin: ws.length / 230, speakingMin: ws.length / 140,
    avgWord: ws.length ? ws.reduce((a, w) => a + w.length, 0) / ws.length : 0,
  };
}

export function frequency(items, n = 20) {
  const m = new Map();
  for (const x of items) m.set(x, (m.get(x) || 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, n);
}
export const wordList = (t) => (String(t).toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []);

// ---------- lines ----------
const coll = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
export const LINE_OPS = {
  sort: (ls) => [...ls].sort(coll.compare),
  sortDesc: (ls) => [...ls].sort((a, b) => coll.compare(b, a)),
  sortLen: (ls) => [...ls].sort((a, b) => a.length - b.length || coll.compare(a, b)),
  reverse: (ls) => [...ls].reverse(),
  shuffle: (ls, rnd = Math.random) => { const a = [...ls]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
  dedupe: (ls) => [...new Set(ls)],
  dedupeI: (ls) => { const s = new Set(); return ls.filter((l) => { const k = l.toLowerCase().trim(); return s.has(k) ? false : s.add(k); }); },
  removeEmpty: (ls) => ls.filter((l) => l.trim()),
  trim: (ls) => ls.map((l) => l.trim()),
  number: (ls) => { const w = String(ls.length).length; return ls.map((l, i) => `${String(i + 1).padStart(w, ' ')}  ${l}`); },
  unnumber: (ls) => ls.map((l) => l.replace(/^\s*\d+[.):]?\s+/, '')),
};

export function normaliseSpaces(t, { collapse = true, tabs = false, trimLines = true, maxBlank = 1 } = {}) {
  let s = t.replace(/\r\n?/g, '\n').replace(/[  -   　]/g, ' ');
  if (tabs) s = s.replace(/\t/g, '    ');
  if (collapse) s = s.replace(/[ \t]{2,}/g, ' ');
  if (trimLines) s = s.split('\n').map((l) => l.trim()).join('\n');
  if (maxBlank >= 0) s = s.replace(new RegExp(`\\n{${maxBlank + 2},}`, 'g'), '\n'.repeat(maxBlank + 1));
  return s.trim();
}

/** Hard-wrap at `width` columns, breaking on spaces (long words are cut). */
export function wrap(t, width = 80) {
  return t.split('\n').map((line) => {
    if (line.length <= width) return line;
    const out = []; let cur = '';
    for (const w of line.split(/(\s+)/)) {
      if ((cur + w).length > width && cur.trim()) { out.push(cur.trimEnd()); cur = w.trimStart(); }
      else cur += w;
      while (cur.length > width) { out.push(cur.slice(0, width)); cur = cur.slice(width); }
    }
    if (cur) out.push(cur.trimEnd());
    return out.join('\n');
  }).join('\n');
}

export function truncate(t, n, { ellipsis = '…', words: byWord = true } = {}) {
  const chars = [...t];
  if (chars.length <= n) return t;
  let s = chars.slice(0, Math.max(0, n - [...ellipsis].length)).join('');
  if (byWord && /\s/.test(s)) s = s.replace(/\s+\S*$/, '');
  return s + ellipsis;
}
