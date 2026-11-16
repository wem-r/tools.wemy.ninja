// Invisible / confusable characters and zero-width steganography. Pure.

export const INVISIBLE = {
  0x00ad: 'SOFT HYPHEN', 0x034f: 'COMBINING GRAPHEME JOINER', 0x061c: 'ARABIC LETTER MARK', 0x115f: 'HANGUL CHOSEONG FILLER', 0x1160: 'HANGUL JUNGSEONG FILLER',
  0x17b4: 'KHMER VOWEL INHERENT AQ', 0x17b5: 'KHMER VOWEL INHERENT AA', 0x180e: 'MONGOLIAN VOWEL SEPARATOR',
  0x200b: 'ZERO WIDTH SPACE', 0x200c: 'ZERO WIDTH NON-JOINER', 0x200d: 'ZERO WIDTH JOINER', 0x200e: 'LEFT-TO-RIGHT MARK', 0x200f: 'RIGHT-TO-LEFT MARK',
  0x202a: 'LEFT-TO-RIGHT EMBEDDING', 0x202b: 'RIGHT-TO-LEFT EMBEDDING', 0x202c: 'POP DIRECTIONAL FORMATTING', 0x202d: 'LEFT-TO-RIGHT OVERRIDE', 0x202e: 'RIGHT-TO-LEFT OVERRIDE',
  0x2060: 'WORD JOINER', 0x2061: 'FUNCTION APPLICATION', 0x2062: 'INVISIBLE TIMES', 0x2063: 'INVISIBLE SEPARATOR', 0x2064: 'INVISIBLE PLUS',
  0x2066: 'LEFT-TO-RIGHT ISOLATE', 0x2067: 'RIGHT-TO-LEFT ISOLATE', 0x2068: 'FIRST STRONG ISOLATE', 0x2069: 'POP DIRECTIONAL ISOLATE',
  0x206a: 'INHIBIT SYMMETRIC SWAPPING', 0x206b: 'ACTIVATE SYMMETRIC SWAPPING', 0x206c: 'INHIBIT ARABIC FORM SHAPING', 0x206d: 'ACTIVATE ARABIC FORM SHAPING',
  0x206e: 'NATIONAL DIGIT SHAPES', 0x206f: 'NOMINAL DIGIT SHAPES', 0x3164: 'HANGUL FILLER', 0xfeff: 'ZERO WIDTH NO-BREAK SPACE / BOM', 0xffa0: 'HALFWIDTH HANGUL FILLER',
  0xfff9: 'INTERLINEAR ANNOTATION ANCHOR', 0xfffa: 'INTERLINEAR ANNOTATION SEPARATOR', 0xfffb: 'INTERLINEAR ANNOTATION TERMINATOR', 0x1d159: 'MUSICAL SYMBOL NULL NOTEHEAD',
};
export const SPACES = {
  0x00a0: 'NO-BREAK SPACE', 0x1680: 'OGHAM SPACE MARK', 0x2000: 'EN QUAD', 0x2001: 'EM QUAD', 0x2002: 'EN SPACE', 0x2003: 'EM SPACE', 0x2004: 'THREE-PER-EM SPACE',
  0x2005: 'FOUR-PER-EM SPACE', 0x2006: 'SIX-PER-EM SPACE', 0x2007: 'FIGURE SPACE', 0x2008: 'PUNCTUATION SPACE', 0x2009: 'THIN SPACE', 0x200a: 'HAIR SPACE',
  0x2028: 'LINE SEPARATOR', 0x2029: 'PARAGRAPH SEPARATOR', 0x202f: 'NARROW NO-BREAK SPACE', 0x205f: 'MEDIUM MATHEMATICAL SPACE', 0x3000: 'IDEOGRAPHIC SPACE',
};
// Common Latin look-alikes (Cyrillic / Greek / fullwidth) → the letter they imitate
export const CONFUSABLE = {
  'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'у': 'y', 'х': 'x', 'і': 'i', 'ј': 'j', 'ѕ': 's', 'ԁ': 'd', 'ɡ': 'g', 'һ': 'h', 'ӏ': 'l', 'ԛ': 'q', 'ԝ': 'w',
  'А': 'A', 'В': 'B', 'Е': 'E', 'К': 'K', 'М': 'M', 'Н': 'H', 'О': 'O', 'Р': 'P', 'С': 'C', 'Т': 'T', 'Х': 'X', 'І': 'I', 'Ј': 'J', 'Ѕ': 'S',
  'α': 'a', 'ο': 'o', 'ν': 'v', 'ρ': 'p', 'τ': 't', 'Α': 'A', 'Β': 'B', 'Ε': 'E', 'Ζ': 'Z', 'Η': 'H', 'Ι': 'I', 'Κ': 'K', 'Μ': 'M', 'Ν': 'N', 'Ο': 'O', 'Ρ': 'P', 'Τ': 'T', 'Υ': 'Y', 'Χ': 'X',
  'ı': 'i', 'ℓ': 'l', '０': '0', '１': '1', 'ｏ': 'o', 'ａ': 'a', 'ｅ': 'e',
};

/** Every suspicious character: [{ index, cp, char, kind, name }] */
export function scan(text) {
  const out = [];
  let i = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    let kind = '', name = '';
    if (INVISIBLE[cp]) { kind = cp >= 0x202a && cp <= 0x202e || cp >= 0x2066 && cp <= 0x2069 || cp === 0x200e || cp === 0x200f || cp === 0x061c ? 'bidi' : 'invisible'; name = INVISIBLE[cp]; }
    else if (cp >= 0xe0000 && cp <= 0xe007f) { kind = 'tag'; name = cp === 0xe007f ? 'CANCEL TAG' : `TAG ${String.fromCharCode(cp - 0xe0000)}`; }
    else if (cp >= 0xfe00 && cp <= 0xfe0f) { kind = 'variation'; name = `VARIATION SELECTOR-${cp - 0xfe00 + 1}`; }
    else if (cp >= 0xe0100 && cp <= 0xe01ef) { kind = 'variation'; name = `VARIATION SELECTOR-${cp - 0xe0100 + 17}`; }
    else if (SPACES[cp]) { kind = 'space'; name = SPACES[cp]; }
    else if (CONFUSABLE[ch]) { kind = 'confusable'; name = `looks like "${CONFUSABLE[ch]}"`; }
    else if ((cp < 0x20 && cp !== 9 && cp !== 10 && cp !== 13) || (cp >= 0x7f && cp < 0xa0)) { kind = 'control'; name = `CONTROL 0x${cp.toString(16).padStart(2, '0')}`; }
    else if (cp >= 0xe000 && cp <= 0xf8ff) { kind = 'private'; name = 'PRIVATE USE'; }
    if (kind) out.push({ index: i, cp, char: ch, kind, name });
    i += ch.length;
  }
  return out;
}

/** Remove / normalise the found characters. kinds: Set of kinds to act on. */
export function clean(text, kinds) {
  let out = '';
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    const hit = scan(ch)[0];
    if (!hit || !kinds.has(hit.kind)) { out += ch; continue; }
    if (hit.kind === 'space') out += cp === 0x2028 || cp === 0x2029 ? '\n' : ' ';
    else if (hit.kind === 'confusable') out += CONFUSABLE[ch];
    // every other kind (invisible, bidi, tag, variation, control, private) is dropped
  }
  return out;
}

export const U = (cp) => 'U+' + cp.toString(16).toUpperCase().padStart(4, '0');

// ---------- zero-width steganography ----------
// Message → UTF-8 bytes → bits: U+200B = 0, U+200C = 1, framed by U+200D on both sides,
// inserted after the first visible character of the cover text.
const Z0 = '​', Z1 = '‌', ZF = '‍';

export function hide(cover, secret) {
  const bits = [...new TextEncoder().encode(secret)].map((b) => b.toString(2).padStart(8, '0')).join('');
  const payload = ZF + [...bits].map((x) => (x === '0' ? Z0 : Z1)).join('') + ZF;
  const chars = [...cover];
  if (!chars.length) return payload;
  return chars[0] + payload + chars.slice(1).join('');
}

/** Extract hidden bytes. Reads framed payloads first, else any run of U+200B / U+200C. */
export function reveal(text) {
  let m = text.match(/‍([​‌]+)‍/);
  let bits = m ? m[1] : [...text].filter((c) => c === Z0 || c === Z1).join('');
  if (!bits.length) return null;
  bits = [...bits].map((c) => (c === Z0 ? '0' : '1')).join('');
  const bytes = Uint8Array.from(bits.match(/.{8}/g) || [], (x) => parseInt(x, 2));
  let textOut;
  try { textOut = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { textOut = null; }
  return { bits: bits.length, bytes, text: textOut };
}

export const stripZeroWidth = (t) => t.replace(/[​-‍⁠﻿]/g, '');
