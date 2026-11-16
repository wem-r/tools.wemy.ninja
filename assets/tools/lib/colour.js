// Colour conversions and WCAG contrast. Pure functions; rgb channels are 0–255.

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const r1 = (x) => Math.round(x * 10) / 10;

export function parseColour(s) {
  const t = String(s).trim().toLowerCase();
  let m;
  if ((m = t.match(/^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/))) {
    let h = m[1];
    if (h.length <= 4) h = [...h].map((c) => c + c).join('');
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1 };
  }
  const nums = (str) => str.split(/[\s,/]+/).filter(Boolean);
  if ((m = t.match(/^rgba?\((.*)\)$/))) {
    const p = nums(m[1]);
    if (p.length < 3) throw new Error('rgb() needs 3 values');
    const ch = (v) => clamp(v.endsWith('%') ? parseFloat(v) * 2.55 : parseFloat(v), 0, 255);
    return { r: Math.round(ch(p[0])), g: Math.round(ch(p[1])), b: Math.round(ch(p[2])), a: alpha(p[3]) };
  }
  if ((m = t.match(/^hsla?\((.*)\)$/))) {
    const p = nums(m[1]);
    if (p.length < 3) throw new Error('hsl() needs 3 values');
    return { ...hslToRgb(parseFloat(p[0]), parseFloat(p[1]), parseFloat(p[2])), a: alpha(p[3]) };
  }
  if ((m = t.match(/^cmyk\((.*)\)$/))) {
    const [c, mm, y, k] = nums(m[1]).map((v) => parseFloat(v) / 100);
    return { r: Math.round(255 * (1 - c) * (1 - k)), g: Math.round(255 * (1 - mm) * (1 - k)), b: Math.round(255 * (1 - y) * (1 - k)), a: 1 };
  }
  throw new Error('use #hex, rgb(), hsl() or cmyk()');
}
const alpha = (v) => (v == null ? 1 : clamp(v.endsWith('%') ? parseFloat(v) / 100 : parseFloat(v), 0, 1));

export function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360; s = clamp(s, 0, 100) / 100; l = clamp(l, 0, 100) / 100;
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return { r: Math.round(f(0) * 255), g: Math.round(f(8) * 255), b: Math.round(f(4) * 255) };
}
export function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min, l = (max + min) / 2;
  let h = 0, s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  return { h: Math.round(h), s: r1(s * 100), l: r1(l * 100) };
}
export function rgbToCmyk({ r, g, b }) {
  const k = 1 - Math.max(r, g, b) / 255;
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
  const f = (x) => r1(((1 - x / 255 - k) / (1 - k)) * 100);
  return { c: f(r), m: f(g), y: f(b), k: r1(k * 100) };
}
export const toHex = ({ r, g, b, a = 1 }) => '#' + [r, g, b, ...(a < 1 ? [Math.round(a * 255)] : [])].map((x) => x.toString(16).padStart(2, '0')).join('');

/** WCAG 2.x relative luminance and contrast ratio. */
export function luminance({ r, g, b }) {
  const c = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
}
export function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
