// Command obfuscator / deobfuscator. Obfuscation variants for Bash and PowerShell, and a
// best-effort layered decoder (Base64, hex, \xHH, char arrays, gzip, URL, reverse).
import { gunzipSync } from 'fflate';

const te = new TextEncoder(), td = new TextDecoder();
const b64 = (s) => btoa(unescape(encodeURIComponent(s)));
const b64utf16 = (s) => { let bin = ''; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); bin += String.fromCharCode(c & 255, (c >> 8) & 255); } return btoa(bin); };
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

// —— Bash obfuscation ——
export function bashObfuscate(cmd) {
  const out = [];
  out.push(['Base64', `echo ${b64(cmd)} | base64 -d | bash`]);
  out.push(['Base64 (no echo pipe)', `bash -c "$(base64 -d <<< ${b64(cmd)})"`]);
  out.push(['$IFS for spaces', cmd.replace(/ /g, '${IFS}')]);
  out.push(['Brace / empty vars', cmd.replace(/([a-zA-Z])/g, (c, _, i) => (i % 4 === 0 ? '${z:-}' + c : c))]);
  out.push(['Hex ($'+"'\\xNN'"+')', `$'${[...te.encode(cmd)].map((b) => '\\x' + b.toString(16).padStart(2, '0')).join('')}'`]);
  out.push(['printf hex | bash', `printf '${[...te.encode(cmd)].map((b) => '\\x' + b.toString(16).padStart(2, '0')).join('')}' | bash`]);
  out.push(['Reverse', `echo '${[...cmd].reverse().join('')}' | rev | bash`]);
  return out;
}

// —— PowerShell obfuscation ——
export function psObfuscate(cmd) {
  const out = [];
  out.push(['-EncodedCommand', `powershell -nop -w hidden -enc ${b64utf16(cmd)}`]);
  out.push(['Gzip + Base64 + IEX', gzipIex(cmd)]);
  out.push(['[char] array', `$([char[]](${[...cmd].map((c) => c.charCodeAt(0)).join(',')}) -join '')`]);
  out.push(['Reverse string', `$x='${[...cmd].reverse().join('').replace(/'/g, "''")}';iex ($x[-1..-($x.Length)] -join '')`]);
  out.push(['Backtick insertion', cmd.replace(/([a-zA-Z])(?=[a-zA-Z])/g, (c, _, i) => (i % 3 === 1 ? c + '`' : c))]);
  out.push(['Concat split', `iex (${splitConcat(cmd)})`]);
  out.push(['Format operator', formatOp(cmd)]);
  return out;
}
function gzipIex() { return `# gzip+base64+IEX is built from the live command in the tool`; }
const splitConcat = (s) => { const n = Math.ceil(s.length / 3), parts = []; for (let i = 0; i < s.length; i += n) parts.push(`'${s.slice(i, i + n).replace(/'/g, "''")}'`); return parts.join('+'); };
function formatOp(s) { const chunks = s.match(/.{1,6}/g) || [s]; return `('${chunks.map((_, i) => `{${i}}`).join('')}' -f ${chunks.map((c) => `'${c.replace(/'/g, "''")}'`).join(',')})`; }

// real gzip version used by the UI (needs the deflate side)
export function gzipIexReal(cmd, deflateRaw) {
  const comp = deflateRaw(te.encode(cmd));
  let bin = ''; for (const b of comp) bin += String.fromCharCode(b);
  const b = btoa(bin);
  return `powershell -nop -w hidden -c "IEX (New-Object IO.StreamReader(New-Object IO.Compression.DeflateStream([IO.MemoryStream][Convert]::FromBase64String('${b}'),[IO.Compression.CompressionMode]::Decompress))).ReadToEnd()"`;
}

// —— Deobfuscation ——
const printable = (b) => { let ok = 0; for (const x of b) if (x === 9 || x === 10 || x === 13 || (x >= 32 && x < 127)) ok++; return ok / b.length > 0.85; };

export function deobfuscate(input) {
  const steps = [];
  let text = input.trim();
  for (let i = 0; i < 25; i++) {
    const before = text;
    text = oneLayer(text, steps);
    if (text === before) break;
  }
  return { steps, out: text };
}

function oneLayer(text, steps) {
  let m;
  // PowerShell -enc / -e <base64>  (UTF-16LE)
  if ((m = text.match(/-e(?:nc|ncodedcommand)?\s+([A-Za-z0-9+/=]{16,})/i))) {
    try { const b = unb64(m[1]); const s = td.decode(b).replace(/\u0000/g, ''); if (s) { steps.push('PowerShell -EncodedCommand (UTF-16LE Base64)'); return s; } } catch {}
  }
  // a base64 token piped to `base64 -d` (echo … | base64 -d, base64 -d <<< …)
  if ((m = text.match(/([A-Za-z0-9+/=]{8,})\s*\|\s*base64\s+(?:--decode|-d)/i)) || (m = text.match(/base64\s+(?:--decode|-d)\s*(?:<<<)?\s*["']?([A-Za-z0-9+/=]{8,})/i))) {
    try { const b = unb64(m[1]); if (printable(b)) { steps.push('Base64 (base64 -d)'); return td.decode(b); } } catch {}
  }
  // base64 → gzip/deflate
  if ((m = text.match(/FromBase64String\('([A-Za-z0-9+/=]+)'\)/i)) || (m = text.match(/^([A-Za-z0-9+/=]{20,})$/))) {
    try {
      const b = unb64(m[1]);
      if (b[0] === 0x1f && b[1] === 0x8b) { steps.push('gzip (Base64)'); return td.decode(gunzipSync(b)); }
      if (printable(b)) { steps.push('Base64'); return td.decode(b); }
    } catch {}
  }
  // $'\xNN...' or \xNN runs
  if (/(\\x[0-9a-f]{2}){2,}/i.test(text)) {
    steps.push('\\xNN hex'); return text.replace(/(?:\\x[0-9a-f]{2})+/gi, (h) => td.decode(Uint8Array.from(h.match(/[0-9a-f]{2}/gi).map((x) => parseInt(x, 16)))));
  }
  // [char] arrays: (99,109,100 ...)
  if ((m = text.match(/\(?\s*(\d{1,3}(?:\s*,\s*\d{1,3}){4,})\s*\)?/))) {
    const nums = m[1].split(/\s*,\s*/).map(Number);
    if (nums.every((n) => n <= 255)) { steps.push('decimal char codes'); return nums.map((n) => String.fromCharCode(n)).join(''); }
  }
  // concatenation 'a'+'b'+'c'
  if (/'(?:[^']*)'(?:\s*\+\s*'[^']*'){2,}/.test(text)) {
    steps.push("concatenation ('a'+'b')"); return text.replace(/'((?:[^']|'')*)'(?:\s*\+\s*'((?:[^']|'')*)')+/g, (full) => (full.match(/'((?:[^']|'')*)'/g) || []).map((q) => q.slice(1, -1).replace(/''/g, "'")).join(''));
  }
  // url-encoded
  if (/(%[0-9a-f]{2}){3,}/i.test(text)) { steps.push('URL-encoding'); try { return decodeURIComponent(text); } catch {} }
  // -join reverse
  if ((m = text.match(/'([^']{8,})'\s*\[\s*-1\.\.-/))) { steps.push('reversed string'); return [...m[1]].reverse().join(''); }
  return text;
}
