// Byte inspector for exploit-dev PoCs: parse bytes from any common representation and
// analyse them — length, null bytes, a bad-character report, which byte values are present,
// a hexdump and a base64 view. Analysis only; it does not run or stage anything.

export function parseBytes(str, fmt = 'auto') {
  str = (str || '').trim();
  if (!str) return new Uint8Array();
  const asHex = () => {
    const only = str.replace(/0x|\\x|%|&#x|[\s,;:"'`(){}\[\]=]|unsigned|char|byte|new|const|let|var/gi, '');
    const pairs = /^[0-9a-fA-F]+$/.test(only) && only.length >= 2 ? only.match(/[0-9a-fA-F]{2}/g) : null;
    return pairs ? Uint8Array.from(pairs.map((h) => parseInt(h, 16))) : null;
  };
  const asB64 = () => { try { return Uint8Array.from(atob(str.replace(/\s+/g, '')), (c) => c.charCodeAt(0)); } catch { return null; } };
  const asDec = () => { const dec = str.match(/\d{1,3}/g) || []; return dec.length && dec.every((n) => +n <= 255) ? Uint8Array.from(dec.map(Number)) : null; };

  if (fmt === 'hex') return asHex() || new Uint8Array();
  if (fmt === 'base64') return asB64() || new Uint8Array();
  if (fmt === 'decimal') return asDec() || new Uint8Array();
  // auto: explicit hex markers, then pure-hex (preferred over base64 for a byte tool), then base64, then decimal
  const stripped = str.replace(/\s+/g, '');
  if (/\\x|0x/.test(str)) return asHex() || new Uint8Array();
  if (/^[0-9a-fA-F]+$/.test(stripped) && stripped.length % 2 === 0 && !/[+/=]/.test(stripped)) return asHex() || new Uint8Array();
  if (looksB64(str)) return asB64() || asHex() || new Uint8Array();
  if (/^[\s,]*\d{1,3}(\s*,\s*\d{1,3})+[\s,]*$/.test(str)) return asDec() || new Uint8Array();
  return asHex() || new Uint8Array();
}
function looksB64(s) {
  const t = s.replace(/\s+/g, '');
  return /^[A-Za-z0-9+/]+={0,2}$/.test(t) && t.length % 4 === 0 && !/\\x|0x/.test(s);
}

// parse a bad-char set from "00 0a 0d", "\x00\x0a", "0x00,0x0d" …
export function parseBadchars(str) {
  const set = new Set();
  for (const h of (str.match(/[0-9a-fA-F]{2}/g) || [])) set.add(parseInt(h, 16));
  return set;
}

export function analyse(bytes, badSet = new Set()) {
  const present = new Array(256).fill(false);
  let nulls = 0, printable = 0;
  for (const b of bytes) { present[b] = true; if (b === 0) nulls++; if (b >= 0x20 && b <= 0x7e) printable++; }
  const badHits = [];
  for (const bad of [...badSet].sort((a, b) => a - b)) {
    const offsets = [];
    for (let i = 0; i < bytes.length; i++) if (bytes[i] === bad) { offsets.push(i); if (offsets.length > 64) break; }
    if (offsets.length) badHits.push({ byte: bad, offsets });
  }
  const absent = [];
  for (let i = 0; i < 256; i++) if (!present[i]) absent.push(i);
  return {
    length: bytes.length,
    nulls,
    unique: present.filter(Boolean).length,
    printableRatio: bytes.length ? printable / bytes.length : 0,
    present, absent, badHits,
    clean: badHits.length === 0,
  };
}

export function hexdump(bytes, width = 16) {
  const lines = [];
  for (let off = 0; off < bytes.length; off += width) {
    const slice = bytes.slice(off, off + width);
    const hex = [...slice].map((b) => b.toString(16).padStart(2, '0')).join(' ');
    const ascii = [...slice].map((b) => (b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : '.')).join('');
    lines.push(off.toString(16).padStart(8, '0') + '  ' + hex.padEnd(width * 3 - 1, ' ') + '  |' + ascii + '|');
  }
  return lines.join('\n') || '(no bytes)';
}

export const toBase64 = (bytes) => (bytes.length ? btoa(String.fromCharCode(...bytes)) : '');
export const toHex = (bytes, spaced = false) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join(spaced ? ' ' : '');
