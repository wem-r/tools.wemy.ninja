// Drawing on a page "as displayed": handles pages with /Rotate 90 / 180 / 270. pdf-lib draws in the
// unrotated space, so a visual position and angle are mapped back before drawing.
import { degrees, rgb, StandardFonts } from 'pdf-lib';
import { winAnsi, hexRgb } from './pdf.js';

export function view(page) {
  const { width: W, height: H } = page.getSize();
  const r = ((page.getRotation().angle % 360) + 360) % 360;
  const map = (vx, vy) => (r === 90 ? [W - vy, vx] : r === 180 ? [W - vx, H - vy] : r === 270 ? [vy, H - vx] : [vx, vy]);
  return { W: r % 180 ? H : W, H: r % 180 ? W : H, rot: r, map };
}

/** Draw text with its visual box anchored: ax/ay = 0 (left/bottom) … 0.5 (centre) … 1 (right/top) at (vx, vy). */
export function text(page, font, s, { vx, vy, size = 10, color = '#000000', opacity = 1, angle = 0, ax = 0, ay = 0 }) {
  const t = winAnsi(s);
  const w = font.widthOfTextAtSize(t, size), h = font.heightAtSize(size, { descender: false });
  const a = (angle * Math.PI) / 180;
  // origin so that the anchor lands on (vx, vy) after rotating the text by `angle` (visual, counter-clockwise)
  const dx = -ax * w, dy = -ay * h * 0.8;
  const ox = vx + dx * Math.cos(a) - dy * Math.sin(a), oy = vy + dx * Math.sin(a) + dy * Math.cos(a);
  const v = view(page);
  const [x, y] = v.map(ox, oy);
  page.drawText(t, { x, y, size, font, color: rgb(...hexRgb(color)), opacity, rotate: degrees(angle + v.rot) });
  return { w, h };
}

/** Draw an embedded image of visual size w×h centred at (cx, cy), rotated by `angle`. */
export function image(page, img, { cx, cy, w, h, opacity = 1, angle = 0 }) {
  const a = (angle * Math.PI) / 180;
  const ox = cx - (w / 2) * Math.cos(a) + (h / 2) * Math.sin(a), oy = cy - (w / 2) * Math.sin(a) - (h / 2) * Math.cos(a);
  const v = view(page);
  const [x, y] = v.map(ox, oy);
  page.drawImage(img, { x, y, width: w, height: h, opacity, rotate: degrees(angle + v.rot) });
}

/** Move the content stream just drawn to the bottom of the page (under the existing content). */
export function sendToBack(page) {
  const arr = page.node.Contents();
  if (!arr || !arr.size || arr.size() < 2) return;
  const last = arr.get(arr.size() - 1);
  arr.remove(arr.size() - 1);
  arr.insert(0, last);
}

export const FONTS = { Helvetica: StandardFonts.Helvetica, 'Helvetica-Bold': StandardFonts.HelveticaBold, Times: StandardFonts.TimesRoman, Courier: StandardFonts.Courier };
