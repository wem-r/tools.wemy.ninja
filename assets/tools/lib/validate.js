// Email and domain-name syntax checks. Pure; returns { ok, notes[] }.
import { toASCII, toUnicode } from './punycode.js';

export function checkDomain(d, { allowSingle = false } = {}) {
  const notes = [];
  let ascii;
  try { ascii = toASCII(d.replace(/\.$/, '')); } catch { return { ok: false, notes: ['cannot be converted to punycode'] }; }
  if (ascii !== d.replace(/\.$/, '').toLowerCase() && /[^\x00-\x7f]/.test(d)) notes.push(`IDN → ${ascii}`);
  if (/xn--/i.test(d)) { try { notes.push(`punycode → ${toUnicode(d.toLowerCase())}`); } catch { return { ok: false, notes: ['invalid punycode label'] }; } }
  if (ascii.length > 253) return { ok: false, notes: [...notes, `${ascii.length} characters (max 253)`] };
  const labels = ascii.split('.');
  if (labels.length < 2 && !allowSingle) return { ok: false, notes: [...notes, 'needs at least two labels (name.tld)'] };
  for (const l of labels) {
    if (!l) return { ok: false, notes: [...notes, 'empty label (two dots in a row?)'] };
    if (l.length > 63) return { ok: false, notes: [...notes, `label "${l.slice(0, 20)}…" is ${l.length} characters (max 63)`] };
    if (!/^[a-z0-9-_]+$/i.test(l)) return { ok: false, notes: [...notes, `label "${l}" has characters outside a-z 0-9 -`] };
    if (/^-|-$/.test(l)) return { ok: false, notes: [...notes, `label "${l}" starts or ends with a hyphen`] };
    if (l.includes('_')) notes.push(`"${l}": underscores are fine in DNS records (SRV, DKIM) but not in hostnames`);
    if (/^..--/.test(l) && !/^xn--/i.test(l)) notes.push(`"${l}": "--" in positions 3–4 is reserved`);
  }
  if (/^\d+$/.test(labels.at(-1))) return { ok: false, notes: [...notes, 'top-level label is all digits'] };
  return { ok: true, notes };
}

export function checkEmail(e) {
  const at = e.lastIndexOf('@');
  if (at < 1) return { ok: false, notes: ['needs local-part@domain'] };
  const local = e.slice(0, at), domain = e.slice(at + 1), notes = [];
  if (local.length > 64) return { ok: false, notes: [`local part is ${local.length} characters (max 64)`] };
  if (/^".*"$/.test(local)) {
    if (/[^\\]"|\\$/.test(local.slice(1, -1))) return { ok: false, notes: ['bad quoting in the local part'] };
    notes.push('quoted local part: valid, but many systems reject it');
  } else {
    if (/^\.|\.$|\.\./.test(local)) return { ok: false, notes: ['dot at the start / end or two dots in a row'] };
    if (!/^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.\u0080-￿-]+$/.test(local)) return { ok: false, notes: ['local part has characters that need quoting'] };
    if (/[\u0080-￿]/.test(local)) notes.push('non-ASCII local part needs SMTPUTF8 (RFC 6531)');
    if (local.includes('+')) notes.push(`sub-address: ${local.split('+')[0]} + tag`);
  }
  if (/^\[.*\]$/.test(domain)) {
    const ip = domain.slice(1, -1);
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(ip) && ip.split('.').every((o) => +o < 256)) return { ok: true, notes: [...notes, 'IP-literal domain: valid but rarely accepted'] };
    if (/^IPv6:[0-9a-f:.]+$/i.test(ip)) return { ok: true, notes: [...notes, 'IPv6 literal: valid but rarely accepted'] };
    return { ok: false, notes: ['bad address literal'] };
  }
  const d = checkDomain(domain);
  if ((local.length + 1 + domain.length) > 254) return { ok: false, notes: ['longer than 254 characters'] };
  return { ok: d.ok, notes: [...notes, ...d.notes] };
}
