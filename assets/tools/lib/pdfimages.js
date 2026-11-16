// Image XObjects inside a pdf-lib document: list, decode (to RGBA) and replace. Browser only (canvas, createImageBitmap).
import { PDFName, PDFRawStream, PDFNumber, PDFArray, PDFDict } from 'pdf-lib';
import { unzlibSync } from 'fflate';

const N = (n) => PDFName.of(n);
const name = (v) => (v instanceof PDFName ? v.asString().slice(1) : '');

/** [{ ref, stream, dict, filters: ['DCTDecode', …], w, h, bpc, cs }] */
export function images(doc) {
  const out = [];
  for (const [ref, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue;
    const d = obj.dict;
    if (name(d.get(N('Subtype'))) !== 'Image') continue;
    const f = d.lookup(N('Filter'));
    const filters = f instanceof PDFArray ? f.asArray().map((x) => name(x)) : f ? [name(f)] : [];
    out.push({ ref, stream: obj, dict: d, filters, w: d.lookup(N('Width'))?.asNumber?.() || 0, h: d.lookup(N('Height'))?.asNumber?.() || 0, bpc: d.lookup(N('BitsPerComponent'))?.asNumber?.() || 8, cs: d.lookup(N('ColorSpace')), isMask: !!d.lookup(N('ImageMask')) });
  }
  return out;
}

/** Colour space → { kind: 'rgb' | 'gray' | 'cmyk' | 'indexed', base?, hival?, lut? } or null if unsupported. */
export function colourSpace(doc, cs) {
  if (cs instanceof PDFName) return { DeviceRGB: { kind: 'rgb' }, DeviceGray: { kind: 'gray' }, DeviceCMYK: { kind: 'cmyk' }, CalRGB: { kind: 'rgb' }, CalGray: { kind: 'gray' } }[name(cs)] || null;
  if (cs instanceof PDFArray) {
    const t = name(cs.lookup(0));
    if (t === 'ICCBased') { const n = cs.lookup(1)?.dict?.lookup(N('N'))?.asNumber?.(); return n === 3 ? { kind: 'rgb' } : n === 1 ? { kind: 'gray' } : n === 4 ? { kind: 'cmyk' } : null; }
    if (t === 'CalRGB') return { kind: 'rgb' };
    if (t === 'CalGray') return { kind: 'gray' };
    if (t === 'Indexed') {
      const base = colourSpace(doc, cs.lookup(1)), hival = cs.lookup(2)?.asNumber?.();
      const l = cs.lookup(3);
      let lut = null;
      if (l?.asBytes) lut = l.asBytes();
      else if (l instanceof PDFRawStream) lut = decodeStream(l);
      else if (l?.decodeText) lut = Uint8Array.from(l.decodeText(), (c) => c.charCodeAt(0));
      return base && lut ? { kind: 'indexed', base, hival, lut } : null;
    }
  }
  return null;
}

/** Undo FlateDecode (+ PNG predictors). */
export function decodeStream(stream, colors = 1, bpc = 8, columns = 1) {
  let data = unzlibSync(stream.contents);
  const p = stream.dict.lookup(N('DecodeParms'));
  const parms = p instanceof PDFArray ? p.lookup(0) : p;
  if (parms instanceof PDFDict) {
    const pred = parms.lookup(N('Predictor'))?.asNumber?.() || 1;
    if (pred >= 10) {
      const c = parms.lookup(N('Colors'))?.asNumber?.() || colors, b = parms.lookup(N('BitsPerComponent'))?.asNumber?.() || bpc, cols = parms.lookup(N('Columns'))?.asNumber?.() || columns;
      const bpp = Math.max(1, Math.ceil((c * b) / 8)), row = Math.ceil((c * b * cols) / 8), out = new Uint8Array(Math.floor(data.length / (row + 1)) * row);
      let prev = new Uint8Array(row);
      for (let r = 0, o = 0, i = 0; i + row < data.length + 1 && o < out.length; r++) {
        const ft = data[i++], line = out.subarray(o, o + row);
        for (let x = 0; x < row; x++) {
          const raw = data[i + x], a = x >= bpp ? line[x - bpp] : 0, up = prev[x], ul = x >= bpp ? prev[x - bpp] : 0;
          let v = raw;
          if (ft === 1) v = raw + a; else if (ft === 2) v = raw + up; else if (ft === 3) v = raw + ((a + up) >> 1);
          else if (ft === 4) { const pa = Math.abs(up - ul), pb = Math.abs(a - ul), pc = Math.abs(a + up - 2 * ul); v = raw + (pa <= pb && pa <= pc ? a : pb <= pc ? up : ul); }
          line[x] = v & 255;
        }
        prev = line; i += row; o += row;
      }
      data = out;
    }
  }
  return data;
}

/** Decode a Flate / unfiltered image to RGBA ImageData-like { w, h, data }. Returns null when unsupported. */
export function toRGBA(doc, img) {
  if (img.filters.some((f) => f !== 'FlateDecode')) return null;
  const cs = img.isMask ? { kind: 'gray' } : colourSpace(doc, img.cs);
  if (!cs || ![1, 8].includes(img.bpc)) return null;
  const comps = cs.kind === 'rgb' ? 3 : cs.kind === 'cmyk' ? 4 : 1;
  const raw = img.filters.length ? decodeStream(img.stream, comps, img.bpc, img.w) : img.stream.contents;
  const { w, h } = img, out = new Uint8ClampedArray(w * h * 4);
  const rowBytes = Math.ceil((w * comps * img.bpc) / 8);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = (y * w + x) * 4;
    let v;
    if (img.bpc === 1) { const byte = raw[y * rowBytes + (x >> 3)]; v = (byte >> (7 - (x & 7))) & 1 ? 255 : 0; if (img.isMask) v = 255 - v; }
    else v = raw[y * rowBytes + x * comps];
    if (cs.kind === 'rgb') { const i = y * rowBytes + x * 3; out[o] = raw[i]; out[o + 1] = raw[i + 1]; out[o + 2] = raw[i + 2]; }
    else if (cs.kind === 'cmyk') { const i = y * rowBytes + x * 4, k = 255 - raw[i + 3]; out[o] = ((255 - raw[i]) * k) / 255; out[o + 1] = ((255 - raw[i + 1]) * k) / 255; out[o + 2] = ((255 - raw[i + 2]) * k) / 255; }
    else if (cs.kind === 'indexed') { const b = cs.base.kind === 'rgb' ? 3 : 1, j = v * b; out[o] = cs.lut[j]; out[o + 1] = cs.lut[j + (b > 1 ? 1 : 0)]; out[o + 2] = cs.lut[j + (b > 1 ? 2 : 0)]; }
    else { out[o] = out[o + 1] = out[o + 2] = v; }
    out[o + 3] = 255;
  }
  return { w, h, data: out };
}

/** Replace an image stream with new JPEG bytes of size w×h. */
export function replaceWithJpeg(doc, img, bytes, w, h, gray = false) {
  const d = img.dict.clone(doc.context);
  for (const k of ['Filter', 'DecodeParms', 'Decode', 'Length', 'ColorSpace']) d.delete(N(k));
  d.set(N('Filter'), N('DCTDecode'));
  d.set(N('Width'), PDFNumber.of(w)); d.set(N('Height'), PDFNumber.of(h));
  d.set(N('BitsPerComponent'), PDFNumber.of(8));
  d.set(N('ColorSpace'), N(gray ? 'DeviceGray' : 'DeviceRGB'));
  d.set(N('Length'), PDFNumber.of(bytes.length));
  doc.context.assign(img.ref, PDFRawStream.of(d, bytes));
}
