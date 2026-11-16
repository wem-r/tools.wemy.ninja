import { $, $$, kv, live, msg, pick, enc, dec, toB64, fromB64 } from '../js/tk.js';

live([$('#user'), $('#pass'), $('#token'), ...$$('input[name="kind"]')], () => {
  const k = pick('kind');
  $$('[data-kind]').forEach((d) => { d.hidden = d.dataset.kind !== k; });
  const value = k === 'basic' ? `Basic ${toB64(enc.encode(`${$('#user').value}:${$('#pass').value}`))}` : `Bearer ${$('#token').value.trim()}`;
  const notes = k === 'basic' && $('#user').value.includes(':') ? 'a user name cannot contain ":" (RFC 7617)' : '';
  kv($('#out'), [
    ['header', `Authorization: ${value}`, notes],
    ['value', value],
    ['curl', k === 'basic' ? `curl -u '${$('#user').value.replace(/'/g, `'\\''`)}:${$('#pass').value.replace(/'/g, `'\\''`)}' https://…` : `curl -H 'Authorization: ${value}' https://…`],
    k === 'basic' && ['URL form (avoid)', `https://${encodeURIComponent($('#user').value)}:${encodeURIComponent($('#pass').value)}@host/`],
  ]);
});

live($('#dec'), () => {
  const v = $('#dec').value.trim().replace(/^(proxy-)?authorization:\s*/i, '');
  if (!v) { msg($('#msg'), ''); $('#dout').replaceChildren(); return; }
  const [scheme, ...rest] = v.split(/\s+/);
  const cred = rest.join(' ');
  try {
    if (/^basic$/i.test(scheme)) {
      const s = dec.decode(fromB64(cred));
      const i = s.indexOf(':');
      if (i < 0) throw new Error('decoded value has no ":" between user and password');
      msg($('#msg'), 'Basic credentials', 'ok');
      kv($('#dout'), [['scheme', 'Basic'], ['user', s.slice(0, i)], ['password', s.slice(i + 1)]]);
    } else if (/^bearer$/i.test(scheme)) {
      const parts = cred.split('.');
      const rows = [['scheme', 'Bearer'], ['token', cred]];
      if (parts.length === 3) {
        try { rows.push(['JWT header', dec.decode(fromB64(parts[0]))], ['JWT payload', dec.decode(fromB64(parts[1]))]); } catch { /* not a JWT */ }
      }
      msg($('#msg'), parts.length === 3 ? 'Bearer token (looks like a JWT — open it in the JWT tool for details)' : 'Bearer token', 'ok');
      kv($('#dout'), rows);
    } else {
      msg($('#msg'), `scheme "${scheme}" — only Basic and Bearer are decoded here`, 'warn');
      kv($('#dout'), [['scheme', scheme], ['credentials', cred]]);
    }
  } catch (e) { msg($('#msg'), e.message); $('#dout').replaceChildren(); }
});
