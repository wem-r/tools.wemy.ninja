// File type identification from magic bytes. Pure.

// [offset, hex signature (?? = any byte), name, extensions, mime]
const SIGS = [
  [0, '89504E470D0A1A0A', 'PNG image', 'png', 'image/png'],
  [0, 'FFD8FF', 'JPEG image', 'jpg jpeg jfif', 'image/jpeg'],
  [0, '474946383761', 'GIF image (87a)', 'gif', 'image/gif'],
  [0, '474946383961', 'GIF image (89a)', 'gif', 'image/gif'],
  [0, '424D', 'BMP image', 'bmp dib', 'image/bmp'],
  [0, '49492A00', 'TIFF image (little-endian)', 'tif tiff dng nef cr2 arw', 'image/tiff'],
  [0, '4D4D002A', 'TIFF image (big-endian)', 'tif tiff', 'image/tiff'],
  [0, '00000100', 'Windows icon', 'ico', 'image/x-icon'],
  [0, '00000200', 'Windows cursor', 'cur', 'image/x-icon'],
  [0, '38425053', 'Photoshop document', 'psd', 'image/vnd.adobe.photoshop'],
  [0, '0000000C6A5020200D0A870A', 'JPEG 2000', 'jp2', 'image/jp2'],
  [0, 'FF0A', 'JPEG XL (codestream)', 'jxl', 'image/jxl'],
  [0, '0000000C4A584C200D0A870A', 'JPEG XL', 'jxl', 'image/jxl'],
  [0, '25504446', 'PDF document', 'pdf', 'application/pdf'],
  [0, '7B5C727466', 'Rich Text Format', 'rtf', 'application/rtf'],
  [0, 'D0CF11E0A1B11AE1', 'OLE2 compound file (old Office doc/xls/ppt, msi, msg)', 'doc xls ppt msi msg', 'application/x-ole-storage'],
  [0, '504B0304', 'ZIP archive', 'zip', 'application/zip'],
  [0, '504B0506', 'ZIP archive (empty)', 'zip', 'application/zip'],
  [0, '504B0708', 'ZIP archive (spanned)', 'zip', 'application/zip'],
  [0, '526172211A0700', 'RAR archive (v4)', 'rar', 'application/vnd.rar'],
  [0, '526172211A070100', 'RAR archive (v5)', 'rar', 'application/vnd.rar'],
  [0, '377ABCAF271C', '7-Zip archive', '7z', 'application/x-7z-compressed'],
  [0, '1F8B', 'gzip', 'gz tgz', 'application/gzip'],
  [0, '425A68', 'bzip2', 'bz2', 'application/x-bzip2'],
  [0, 'FD377A585A00', 'xz', 'xz', 'application/x-xz'],
  [0, '28B52FFD', 'Zstandard', 'zst', 'application/zstd'],
  [0, '04224D18', 'LZ4 frame', 'lz4', 'application/x-lz4'],
  [257, '7573746172', 'tar archive', 'tar', 'application/x-tar'],
  [0, '213C617263683E0A', 'ar archive / Debian package', 'a deb', 'application/x-archive'],
  [0, 'EDABEEDB', 'RPM package', 'rpm', 'application/x-rpm'],
  [0, '4344303031', 'ISO 9660 image', 'iso', 'application/x-iso9660-image'],
  [32769, '4344303031', 'ISO 9660 image', 'iso', 'application/x-iso9660-image'],
  [0, '4D5A', 'Windows executable (PE / MZ)', 'exe dll sys scr ocx', 'application/vnd.microsoft.portable-executable'],
  [0, '7F454C46', 'ELF executable / library', 'elf so o', 'application/x-elf'],
  [0, 'FEEDFACE', 'Mach-O (32-bit)', '', 'application/x-mach-binary'],
  [0, 'FEEDFACF', 'Mach-O (64-bit)', '', 'application/x-mach-binary'],
  [0, 'CFFAEDFE', 'Mach-O (64-bit, LE)', '', 'application/x-mach-binary'],
  [0, 'CAFEBABE', 'Java class / Mach-O universal binary', 'class', 'application/java-vm'],
  [0, '0061736D', 'WebAssembly', 'wasm', 'application/wasm'],
  [0, '2321', 'script with shebang', 'sh py pl rb', 'text/x-script'],
  [0, '4C0000000114020000000000C000000000000046', 'Windows shortcut', 'lnk', 'application/x-ms-shortcut'],
  [0, '49443303', 'MP3 audio (ID3v2.3)', 'mp3', 'audio/mpeg'],
  [0, '49443304', 'MP3 audio (ID3v2.4)', 'mp3', 'audio/mpeg'],
  [0, '494433', 'MP3 audio (ID3)', 'mp3', 'audio/mpeg'],
  [0, 'FFFB', 'MP3 audio', 'mp3', 'audio/mpeg'],
  [0, 'FFF3', 'MP3 audio', 'mp3', 'audio/mpeg'],
  [0, 'FFF1', 'AAC audio (ADTS)', 'aac', 'audio/aac'],
  [0, '664C6143', 'FLAC audio', 'flac', 'audio/flac'],
  [0, '4F676753', 'Ogg (Vorbis / Opus / Theora)', 'ogg oga ogv opus', 'application/ogg'],
  [0, '4D546864', 'MIDI', 'mid midi', 'audio/midi'],
  [0, '1A45DFA3', 'Matroska / WebM', 'mkv webm', 'video/x-matroska'],
  [0, '464C5601', 'Flash video', 'flv', 'video/x-flv'],
  [0, '000001BA', 'MPEG program stream', 'mpg mpeg vob', 'video/mpeg'],
  [0, '000001B3', 'MPEG video', 'mpg mpeg', 'video/mpeg'],
  [0, '3026B2758E66CF11', 'ASF / WMV / WMA', 'asf wmv wma', 'video/x-ms-asf'],
  [0, '774F4646', 'WOFF font', 'woff', 'font/woff'],
  [0, '774F4632', 'WOFF2 font', 'woff2', 'font/woff2'],
  [0, '0001000000', 'TrueType font', 'ttf', 'font/ttf'],
  [0, '4F54544F', 'OpenType font', 'otf', 'font/otf'],
  [0, '53514C69746520666F726D6174203300', 'SQLite database', 'sqlite db sqlite3', 'application/vnd.sqlite3'],
  [0, '2D2D2D2D2D424547494E', 'PEM (key / certificate)', 'pem crt key csr', 'application/x-pem-file'],
  [0, '3082', 'DER (ASN.1: certificate / key)', 'der cer crt', 'application/pkix-cert'],
  [0, '6B6F6C79', 'Apple disk image (koly trailer at start?)', 'dmg', 'application/x-apple-diskimage'],
  [0, '4B444D', 'VMware disk (VMDK)', 'vmdk', 'application/x-vmdk'],
  [0, '636F6E6563746978', 'VHD disk image', 'vhd', 'application/x-vhd'],
  [0, '7668647866696C65', 'VHDX disk image', 'vhdx', 'application/x-vhdx'],
  [0, '514649FB', 'QEMU QCOW image', 'qcow2', 'application/x-qemu-disk'],
  [0, 'D4C3B2A1', 'pcap capture', 'pcap', 'application/vnd.tcpdump.pcap'],
  [0, 'A1B2C3D4', 'pcap capture (big-endian)', 'pcap', 'application/vnd.tcpdump.pcap'],
  [0, '0A0D0D0A', 'pcapng capture', 'pcapng', 'application/x-pcapng'],
  [0, '456C6646696C6500', 'Windows event log (EVTX)', 'evtx', 'application/x-evtx'],
  [0, '72656766', 'Windows registry hive', 'dat hiv', 'application/x-registry-hive'],
  [0, '4D444D5093A7', 'Windows minidump', 'dmp', 'application/x-dmp'],
  [0, '4D534346', 'Microsoft cabinet', 'cab', 'application/vnd.ms-cab-compressed'],
  [0, '49545346', 'Compiled HTML help', 'chm', 'application/vnd.ms-htmlhelp'],
  [0, '1A0000', 'Lotus / misc', '', ''],
  [0, '3C3F786D6C20', 'XML document', 'xml svg', 'application/xml'],
  [0, '3C21444F43545950452068746D6C', 'HTML document', 'html htm', 'text/html'],
  [0, '3C68746D6C', 'HTML document', 'html htm', 'text/html'],
  [0, '3C737667', 'SVG image', 'svg', 'image/svg+xml'],
  [0, '7B0A', 'JSON (probably)', 'json', 'application/json'],
  [0, '1B4C7561', 'Lua bytecode', 'luac', ''],
  [0, '2E736E64', 'Sun audio', 'au snd', 'audio/basic'],
  [0, '4B57414A', 'KeePass 1 database', 'kdb', ''],
  [0, '03D9A29A67FB4BB5', 'KeePass 2 database', 'kdbx', 'application/x-keepass2'],
  [0, '7573746172', 'tar (at 0?)', 'tar', ''],
].map(([o, h, n, e, m]) => [o, h.match(/../g).map((x) => (x === '??' ? -1 : parseInt(x, 16))), n, e, m]);

const ascii = (b, o, n) => String.fromCharCode(...b.subarray(o, o + n));
const at = (b, o, sig) => sig.every((x, i) => x < 0 || b[o + i] === x);

/** ZIP-based formats: look at the first local file names. */
function zipKind(b) {
  const names = [];
  for (let o = 0; o < Math.min(b.length - 30, 1 << 20) && names.length < 40;) {
    if (!(b[o] === 0x50 && b[o + 1] === 0x4b && b[o + 2] === 3 && b[o + 3] === 4)) break;
    const csize = b[o + 18] | (b[o + 19] << 8) | (b[o + 20] << 16) | (b[o + 21] << 24);
    const nlen = b[o + 26] | (b[o + 27] << 8), xlen = b[o + 28] | (b[o + 29] << 8);
    const name = ascii(b, o + 30, nlen);
    names.push(name);
    if (name === 'mimetype') return ['zip: ' + ascii(b, o + 30 + nlen + xlen, Math.min(csize, 80)), 'odt epub ods odp', ascii(b, o + 30 + nlen + xlen, Math.min(csize, 80))];
    if ((b[o + 6] & 8) || csize <= 0) break; // data descriptor: sizes unknown here
    o += 30 + nlen + xlen + csize;
  }
  const has = (p) => names.some((n) => n.startsWith(p));
  if (has('word/')) return ['Word document (DOCX)', 'docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (has('xl/')) return ['Excel workbook (XLSX)', 'xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
  if (has('ppt/')) return ['PowerPoint (PPTX)', 'pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
  if (has('AndroidManifest.xml') || has('classes.dex')) return ['Android package (APK)', 'apk', 'application/vnd.android.package-archive'];
  if (has('META-INF/MANIFEST.MF')) return ['Java archive (JAR)', 'jar war ear', 'application/java-archive'];
  if (has('[Content_Types].xml')) return ['Office Open XML package', 'docx xlsx pptx vsdx', ''];
  if (has('Payload/')) return ['iOS app (IPA)', 'ipa', ''];
  return null;
}

/** Text guess for files without a signature. */
export function textKind(b) {
  if (b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) return 'UTF-8 text (with BOM)';
  if (b[0] === 0xff && b[1] === 0xfe) return 'UTF-16 LE text (with BOM)';
  if (b[0] === 0xfe && b[1] === 0xff) return 'UTF-16 BE text (with BOM)';
  const s = b.subarray(0, 4096);
  if (s.some((x) => x === 0)) return null;
  try { new TextDecoder('utf-8', { fatal: true }).decode(s.length < b.length ? s.subarray(0, s.length - 4) : s); }
  catch { return 'binary or 8-bit text (not valid UTF-8)'; }
  return s.every((x) => x < 128) ? 'ASCII text' : 'UTF-8 text';
}

/** All matching types for the bytes: [{ name, ext, mime, offset }] most specific first. */
export function identify(b) {
  const out = [];
  for (const [o, sig, name, ext, mime] of SIGS) if (b.length >= o + sig.length && at(b, o, sig)) out.push({ name, ext, mime, offset: o, len: sig.length });
  // container sub-types
  if (b.length >= 12 && ascii(b, 0, 4) === 'RIFF') {
    const t = ascii(b, 8, 4);
    const k = { WEBP: ['WebP image', 'webp', 'image/webp'], WAVE: ['WAV audio', 'wav', 'audio/wav'], 'AVI ': ['AVI video', 'avi', 'video/x-msvideo'], ACON: ['animated cursor', 'ani', ''] }[t];
    out.unshift({ name: k ? k[0] : `RIFF container (${t})`, ext: k ? k[1] : '', mime: k ? k[2] : '', offset: 0, len: 12 });
  }
  if (b.length >= 12 && ascii(b, 4, 4) === 'ftyp') {
    const brand = ascii(b, 8, 4).trim();
    const k = /^(heic|heix|hevc|heim|heis|mif1|msf1)$/.test(brand) ? ['HEIF / HEIC image', 'heic heif', 'image/heic']
      : /^avi[fs]$/.test(brand) ? ['AVIF image', 'avif', 'image/avif']
      : /^qt$/.test(brand) ? ['QuickTime video', 'mov', 'video/quicktime']
      : /^M4A|^M4B/.test(brand) ? ['MPEG-4 audio', 'm4a m4b', 'audio/mp4']
      : /^3g/.test(brand) ? ['3GPP video', '3gp 3g2', 'video/3gpp']
      : /^crx/.test(brand) ? ['Canon raw (CR3)', 'cr3', 'image/x-canon-cr3']
      : ['MPEG-4 video', 'mp4 m4v', 'video/mp4'];
    out.unshift({ name: `${k[0]} (brand ${brand})`, ext: k[1], mime: k[2], offset: 4, len: 8 });
  }
  if (out.some((x) => x.mime === 'application/zip' && x.offset === 0)) {
    const z = zipKind(b);
    if (z) out.unshift({ name: z[0], ext: z[1], mime: z[2], offset: 0, len: 4 });
  }
  if (out.some((x) => x.name.startsWith('Windows executable')) && b.length > 0x40) {
    const pe = b[0x3c] | (b[0x3d] << 8) | (b[0x3e] << 16);
    if (pe + 24 < b.length && ascii(b, pe, 4) === 'PE\0\0') {
      const machine = b[pe + 4] | (b[pe + 5] << 8), chars = b[pe + 22] | (b[pe + 23] << 8), magic = b[pe + 24] | (b[pe + 25] << 8);
      const arch = { 0x14c: 'x86', 0x8664: 'x64', 0xaa64: 'ARM64', 0x1c0: 'ARM', 0x1c4: 'ARMv7' }[machine] || `machine 0x${machine.toString(16)}`;
      out.unshift({ name: `${chars & 0x2000 ? 'Windows DLL' : 'Windows executable'} (PE${magic === 0x20b ? '32+' : '32'}, ${arch})`, ext: chars & 0x2000 ? 'dll' : 'exe', mime: 'application/vnd.microsoft.portable-executable', offset: pe, len: 4 });
    }
  }
  const seen = new Set();
  const uniq = out.filter((x) => x.name !== 'Lotus / misc' && x.name !== 'tar (at 0?)' && !seen.has(x.name) && seen.add(x.name));
  if (!uniq.length) { const t = textKind(b); if (t) uniq.push({ name: t, ext: 'txt', mime: 'text/plain', offset: 0, len: 0 }); }
  return uniq;
}

/** Does the file name's extension agree with the detected type? null = can't tell. */
export function extMatches(filename, matches) {
  const ext = (String(filename).match(/\.([a-z0-9]+)$/i) || [])[1]?.toLowerCase();
  if (!ext || !matches.length) return null;
  return matches.some((m) => m.ext.split(' ').includes(ext) || (m.mime.startsWith('text/') && /^(txt|md|csv|log|ini|conf|cfg|json|yml|yaml|toml|xml|html?|css|js|ts|py|sh|go|rs|java|c|h|cpp|sql|svg)$/.test(ext)));
}
