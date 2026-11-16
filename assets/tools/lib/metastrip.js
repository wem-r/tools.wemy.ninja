// Remove metadata from JPEG / PNG / WebP without re-encoding the image. Pure.
// Returns { bytes, removed: [description, …] }.

const u32 = (b, o) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
const le32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
const str = (b, o, n) => String.fromCharCode(...b.subarray(o, o + n));
const concat = (parts) => { const n = parts.reduce((a, p) => a + p.length, 0), out = new Uint8Array(n); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out; };

export function stripJpeg(b, { keepICC = true } = {}) {
  if (b[0] !== 0xff || b[1] !== 0xd8) throw new Error('not a JPEG');
  const parts = [b.subarray(0, 2)], removed = [];
  let o = 2;
  while (o < b.length) {
    if (b[o] !== 0xff) throw new Error(`bad marker at ${o}`);
    const m = b[o + 1];
    if (m === 0xd9) { parts.push(b.subarray(o)); break; }
    if (m === 0xda) { parts.push(b.subarray(o)); break; } // start of scan: the rest is image data
    if (m >= 0xd0 && m <= 0xd7) { parts.push(b.subarray(o, o + 2)); o += 2; continue; }
    const len = (b[o + 2] << 8) | b[o + 3];
    const seg = b.subarray(o, o + 2 + len);
    const id = str(b, o + 4, 14);
    let drop = false, what = '';
    if (m === 0xe1) { drop = true; what = id.startsWith('Exif') ? 'EXIF (APP1)' : id.startsWith('http://ns.adobe.com') ? 'XMP (APP1)' : 'APP1'; }
    else if (m === 0xe2) { if (id.startsWith('ICC_PROFILE') && keepICC) drop = false; else { drop = true; what = id.startsWith('ICC_PROFILE') ? 'ICC profile (APP2)' : 'APP2 (FlashPix / MPF)'; } }
    else if (m === 0xed) { drop = true; what = 'Photoshop / IPTC (APP13)'; }
    else if (m === 0xfe) { drop = true; what = 'comment (COM)'; }
    else if (m >= 0xe3 && m <= 0xef && m !== 0xee) { drop = true; what = `APP${m - 0xe0}`; }
    if (drop) removed.push(`${what} — ${len} bytes`); else parts.push(seg);
    o += 2 + len;
  }
  return { bytes: concat(parts), removed };
}

const PNG_DROP = { tEXt: 'text', zTXt: 'compressed text', iTXt: 'international text (often XMP)', eXIf: 'EXIF', tIME: 'modification time', iCCP: 'ICC profile', sPLT: 'suggested palette', dSIG: 'signature' };
export function stripPng(b, { keepICC = true } = {}) {
  if (u32(b, 0) !== 0x89504e47) throw new Error('not a PNG');
  const parts = [b.subarray(0, 8)], removed = [];
  let o = 8;
  while (o + 8 <= b.length) {
    const len = u32(b, o), type = str(b, o + 4, 4), end = o + 12 + len;
    if (PNG_DROP[type] && !(type === 'iCCP' && keepICC)) {
      let note = '';
      if (type === 'tEXt') { const z = b.indexOf(0, o + 8); note = `: ${str(b, o + 8, Math.min(z - o - 8, 40))}`; }
      removed.push(`${type} (${PNG_DROP[type]})${note} — ${len} bytes`);
    } else parts.push(b.subarray(o, end));
    o = end;
    if (type === 'IEND') break;
  }
  return { bytes: concat(parts), removed };
}

export function stripWebp(b) {
  if (str(b, 0, 4) !== 'RIFF' || str(b, 8, 4) !== 'WEBP') throw new Error('not a WebP');
  const parts = [], removed = [];
  let o = 12;
  while (o + 8 <= b.length) {
    const type = str(b, o, 4), len = le32(b, o + 4), end = o + 8 + len + (len & 1);
    if (type === 'EXIF' || type === 'XMP ') removed.push(`${type.trim()} — ${len} bytes`);
    else {
      const c = b.slice(o, end);
      if (type === 'VP8X') c[8] &= ~(0x08 | 0x04); // clear EXIF and XMP flags
      parts.push(c);
    }
    o = end;
  }
  const body = concat(parts);
  const head = new Uint8Array(12);
  head.set(b.subarray(0, 12));
  const size = body.length + 4;
  head[4] = size & 255; head[5] = (size >> 8) & 255; head[6] = (size >> 16) & 255; head[7] = (size >>> 24) & 255;
  return { bytes: concat([head, body]), removed };
}

export function strip(b, opts) {
  if (b[0] === 0xff && b[1] === 0xd8) return { type: 'jpeg', ...stripJpeg(b, opts) };
  if (b[0] === 0x89 && b[1] === 0x50) return { type: 'png', ...stripPng(b, opts) };
  if (str(b, 0, 4) === 'RIFF' && str(b, 8, 4) === 'WEBP') return { type: 'webp', ...stripWebp(b) };
  throw new Error('only JPEG, PNG and WebP can be cleaned here');
}
