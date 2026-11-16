import { $, el, live, copyBtn } from '../js/tk.js';

function decode(s) {
  let u; try { u = new URL(s.trim()); } catch { return { kind: 'not a URL', url: '' }; }
  if (/safelinks\.protection\.outlook\.com$/.test(u.hostname)) {
    const d = u.searchParams.get('data') || '', mail = (decodeURIComponent(d).match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/) || [])[0];
    return { kind: 'Microsoft Safe Links', url: u.searchParams.get('url') || '', note: mail ? `data contains ${mail}` : '' };
  }
  if (/urldefense\.com$/.test(u.hostname)) {
    const m = s.match(/\/v3\/__(.+?)__;/);
    if (m) return { kind: 'Proofpoint v3', url: m[1].replace(/\*(\*)?/g, '') };
    const p = u.searchParams.get('u'); if (p) return { kind: 'Proofpoint v2', url: decodeURIComponent(p.replace(/-/g, '%').replace(/_/g, '/')) };
  }
  if (/urldefense\.proofpoint\.com$/.test(u.hostname) && u.searchParams.get('u')) return { kind: 'Proofpoint v2', url: decodeURIComponent(u.searchParams.get('u').replace(/-/g, '%').replace(/_/g, '/')) };
  if (/(^|\.)google\.[a-z.]+$/.test(u.hostname) && u.pathname === '/url') return { kind: 'Google redirect', url: u.searchParams.get('q') || u.searchParams.get('url') || '' };
  if (/l\.facebook\.com|lm\.facebook\.com/.test(u.hostname)) return { kind: 'Facebook redirect', url: u.searchParams.get('u') || '' };
  if (/linkprotect\.cudasvc\.com$/.test(u.hostname)) return { kind: 'Barracuda Link Protect', url: u.searchParams.get('a') || '' };
  return { kind: 'not a known wrapper', url: s.trim() };
}
live($('#in'), () => {
  $('#out').replaceChildren(el('tr', {}, ...['wrapper', 'real destination', ''].map((h) => el('th', { text: h }))),
    ...$('#in').value.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const r = decode(l); let host = ''; try { host = new URL(r.url).hostname; } catch { /* */ } return el('tr', {}, el('td', { class: 'dim', text: r.kind }), el('td', {}, el('code', { text: r.url }), host ? el('div', { class: 'dim', text: `domain: ${host}${r.note ? ` · ${r.note}` : ''}` }) : null), el('td', {}, r.url ? copyBtn(() => r.url) : null)); }));
});
