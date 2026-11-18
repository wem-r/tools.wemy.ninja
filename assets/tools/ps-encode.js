import { $, $$, live, pick, msg } from '../js/tk.js';

const b64utf16 = (s) => { let bin = ''; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); bin += String.fromCharCode(c & 255, (c >> 8) & 255); } return btoa(bin); };
const fromUtf16 = (b64) => { const bin = atob(b64.replace(/\s+/g, '')); let s = ''; for (let i = 0; i + 1 < bin.length; i += 2) s += String.fromCharCode(bin.charCodeAt(i) | (bin.charCodeAt(i + 1) << 8)); return s; };

function render() {
  const dir = pick('dir'), t = $('#in').value;
  $('#inl').textContent = dir === 'enc' ? 'PowerShell command' : '-EncodedCommand blob (or full command line)';
  $('#outl').textContent = dir === 'enc' ? '-EncodedCommand' : 'decoded command';
  $('#wrapl').style.display = dir === 'enc' ? '' : 'none';
  msg($('#msg'), '');
  if (dir === 'enc') {
    const blob = b64utf16(t);
    $('#out').value = $('#wrap').checked ? `powershell -nop -w hidden -enc ${blob}` : blob;
  } else {
    const m = t.match(/[A-Za-z0-9+/]{16,}={0,2}/);
    if (!m) { $('#out').value = ''; return msg($('#msg'), 'paste a Base64 -enc blob (or a full powershell -enc … line)', 'warn'); }
    try { $('#out').value = fromUtf16(m[0]); } catch (e) { msg($('#msg'), 'not valid Base64', 'err'); }
  }
}
live([$('#in'), $('#wrap'), ...$$('#dir input')], render);
