// Page ranges, page-number labels and geometry helpers for the PDF tools. Pure.

/** "1-3, 5, 8-" → [0, 1, 2, 4, 7, 8, …] (0-based, in the order written, duplicates kept). Empty = all pages. */
export function parseRanges(spec, n) {
  const s = String(spec || '').trim();
  if (!s) return Array.from({ length: n }, (_, i) => i);
  const out = [];
  for (const part of s.split(/[,;\s]+/).filter(Boolean)) {
    const p = part.toLowerCase();
    let m;
    if (p === 'odd' || p === 'even') { for (let i = p === 'odd' ? 0 : 1; i < n; i += 2) out.push(i); continue; }
    if ((m = p.match(/^(\d+|last|z)?-(\d+|last|z)?$/))) {
      const a = m[1] ? (/\d/.test(m[1]) ? +m[1] : n) : 1;
      const b = m[2] ? (/\d/.test(m[2]) ? +m[2] : n) : n;
      if (a < 1 || b < 1 || a > n || b > n) throw new Error(`"${part}" is outside 1–${n}`);
      if (a <= b) for (let i = a; i <= b; i++) out.push(i - 1); else for (let i = a; i >= b; i--) out.push(i - 1);
      continue;
    }
    if ((m = p.match(/^(\d+|last|z)$/))) {
      const a = /\d/.test(m[1]) ? +m[1] : n;
      if (a < 1 || a > n) throw new Error(`page ${a} does not exist (1–${n})`);
      out.push(a - 1); continue;
    }
    throw new Error(`cannot read "${part}" — use e.g. 1-3, 5, 8-, odd, even, last`);
  }
  return out;
}

/** Split plans: groups of 0-based page indexes. */
export function splitEvery(n, k) { const g = []; for (let i = 0; i < n; i += k) g.push(Array.from({ length: Math.min(k, n - i) }, (_, j) => i + j)); return g; }
export function splitRanges(spec, n) {
  return String(spec).split(/[;\n]+/).map((x) => x.trim()).filter(Boolean).map((r) => parseRanges(r.replace(/,/g, ' '), n));
}

/** Page label from a format: {n} page, {total}, {date}, {file}; roman numerals with {n:roman}. */
export function label(fmt, { n, total, date = '', file = '' }) {
  return fmt.replace(/\{n:roman\}/g, roman(n).toLowerCase()).replace(/\{n:ROMAN\}/g, roman(n)).replace(/\{n\}/g, n).replace(/\{total\}/g, total).replace(/\{date\}/g, date).replace(/\{file\}/g, file);
}
export function roman(n) {
  const t = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let s = ''; for (const [v, r] of t) while (n >= v) { s += r; n -= v; } return s;
}

export const SIZES = { A3: [841.89, 1190.55], A4: [595.28, 841.89], A5: [419.53, 595.28], Letter: [612, 792], Legal: [612, 1008], Tabloid: [792, 1224] };

/** Fit a w×h box into W×H: { scale, x, y } centred. */
export function fit(w, h, W, H, mode = 'fit') {
  const s = mode === 'fill' ? Math.max(W / w, H / h) : mode === 'none' ? 1 : Math.min(W / w, H / h);
  return { scale: s, x: (W - w * s) / 2, y: (H - h * s) / 2 };
}

/** N-up grid for n pages per sheet: [cols, rows] (landscape sheet for 2 and 6). */
export const NUP = { 2: [2, 1, true], 4: [2, 2, false], 6: [3, 2, true], 8: [4, 2, true], 9: [3, 3, false], 16: [4, 4, false] };

// ---------- perspective (scans) ----------
/** Homography mapping the 4 source points to the 4 destination points ([[x,y]×4]). Returns 3×3 as a flat array. */
export function homography(src, dst) {
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i], [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  const h = solve(A, b);
  return [...h, 1];
}
function solve(A, b) {
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    if (Math.abs(M[c][c]) < 1e-12) throw new Error('points are degenerate');
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  return M.map((r, i) => r[n] / r[i]);
}
export const project = (H, x, y) => { const w = H[6] * x + H[7] * y + H[8]; return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w]; };

/** Order 4 points as top-left, top-right, bottom-right, bottom-left. */
export function orderCorners(pts) {
  const s = pts.map(([x, y]) => x + y), d = pts.map(([x, y]) => x - y);
  return [pts[s.indexOf(Math.min(...s))], pts[d.indexOf(Math.max(...d))], pts[s.indexOf(Math.max(...s))], pts[d.indexOf(Math.min(...d))]];
}

// ---------- deskew ----------
/**
 * Estimate the skew angle (degrees, positive = rotated clockwise) of text in a binary image.
 * ink(x, y) → bool; w, h dimensions. Uses the variance of horizontal projection profiles.
 */
export function skewAngle(ink, w, h, { range = 10, step = 0.25 } = {}) {
  const pts = [];
  const stride = Math.max(1, Math.floor(Math.sqrt((w * h) / 120000)));
  for (let y = 0; y < h; y += stride) for (let x = 0; x < w; x += stride) if (ink(x, y)) pts.push([x - w / 2, y - h / 2]);
  if (pts.length < 50) return 0;
  let best = 0, bestScore = -1;
  const score = (deg) => {
    const a = (deg * Math.PI) / 180, s = Math.sin(a), c = Math.cos(a);
    const bins = new Map();
    for (const [x, y] of pts) { const r = Math.round((y * c - x * s) / stride); bins.set(r, (bins.get(r) || 0) + 1); }
    let sum = 0; for (const v of bins.values()) sum += v * v; return sum;
  };
  for (let d = -range; d <= range + 1e-9; d += step) { const sc = score(d); if (sc > bestScore) { bestScore = sc; best = d; } }
  for (let d = best - step; d <= best + step + 1e-9; d += step / 5) { const sc = score(d); if (sc > bestScore) { bestScore = sc; best = d; } }
  return Math.round(best * 100) / 100;
}
