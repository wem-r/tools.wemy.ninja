// CRC / Adler / Fletcher checksums. Pure functions; parameters from the CRC RevEng catalogue.

const reflect = (v, w) => { let r = 0; for (let i = 0; i < w; i++) { r = (r * 2) + (v & 1); v = Math.floor(v / 2); } return r; };

export function crc(bytes, { width, poly, init, refin, refout, xorout }) {
  const top = 2 ** (width - 1), mod = 2 ** width;
  let c = init;
  for (let b of bytes) {
    if (refin) b = reflect(b, 8);
    c = (c ^ (b * 2 ** (width - 8))) >>> 0;
    if (width < 32) c %= mod;
    for (let i = 0; i < 8; i++) {
      const hi = c >= top;
      c = (c * 2) % mod;
      if (hi) c = (c ^ poly) >>> 0;
      if (width < 32) c %= mod;
    }
  }
  if (refout) c = reflect(c, width);
  return ((c ^ xorout) >>> 0) % mod;
}

export const CRCS = {
  'CRC-8/SMBUS':        { width: 8,  poly: 0x07,       init: 0x00,       refin: false, refout: false, xorout: 0x00 },
  'CRC-8/MAXIM-DOW':    { width: 8,  poly: 0x31,       init: 0x00,       refin: true,  refout: true,  xorout: 0x00 },
  'CRC-16/ARC':         { width: 16, poly: 0x8005,     init: 0x0000,     refin: true,  refout: true,  xorout: 0x0000 },
  'CRC-16/CCITT-FALSE': { width: 16, poly: 0x1021,     init: 0xffff,     refin: false, refout: false, xorout: 0x0000 },
  'CRC-16/XMODEM':      { width: 16, poly: 0x1021,     init: 0x0000,     refin: false, refout: false, xorout: 0x0000 },
  'CRC-16/KERMIT':      { width: 16, poly: 0x1021,     init: 0x0000,     refin: true,  refout: true,  xorout: 0x0000 },
  'CRC-16/MODBUS':      { width: 16, poly: 0x8005,     init: 0xffff,     refin: true,  refout: true,  xorout: 0x0000 },
  'CRC-32':             { width: 32, poly: 0x04c11db7, init: 0xffffffff, refin: true,  refout: true,  xorout: 0xffffffff },
  'CRC-32C':            { width: 32, poly: 0x1edc6f41, init: 0xffffffff, refin: true,  refout: true,  xorout: 0xffffffff },
  'CRC-32/BZIP2':       { width: 32, poly: 0x04c11db7, init: 0xffffffff, refin: false, refout: false, xorout: 0xffffffff },
};

export function adler32(bytes) {
  let a = 1, b = 0;
  for (const x of bytes) { a = (a + x) % 65521; b = (b + a) % 65521; }
  return ((b * 65536) + a) >>> 0;
}
export function fletcher16(bytes) {
  let a = 0, b = 0;
  for (const x of bytes) { a = (a + x) % 255; b = (b + a) % 255; }
  return (b << 8) | a;
}

/** All checksums of `bytes`: [[name, value, widthBits], …] */
export function all(bytes) {
  return [
    ...Object.entries(CRCS).map(([n, p]) => [n, crc(bytes, p), p.width]),
    ['Adler-32', adler32(bytes), 32],
    ['Fletcher-16', fletcher16(bytes), 16],
  ];
}
