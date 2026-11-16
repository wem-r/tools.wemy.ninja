// Email header analysis (RFC 5322 / 5321 / 8601). Pure.

/** Unfold and split the header block (stops at the first empty line = start of the body). */
export function parseHeaders(text) {
  const lines = String(text).replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  for (const l of lines) {
    if (l === '' && out.length) break;
    if (/^[ \t]/.test(l) && out.length) { out[out.length - 1].value += ' ' + l.trim(); continue; }
    const m = l.match(/^([!-9;-~]+):[ \t]?(.*)$/);
    if (m) out.push({ name: m[1], value: m[2].trim() });
  }
  return out;
}

export const get = (hs, name) => hs.filter((h) => h.name.toLowerCase() === name.toLowerCase()).map((h) => h.value);
export const first = (hs, name) => get(hs, name)[0];

/** Decode RFC 2047 encoded-words (=?utf-8?B?…?= / =?iso-8859-1?Q?…?=). */
export function decodeWords(s) {
  if (!s) return s;
  return s.replace(/=\?([^?]+)\?([bqBQ])\?([^?]*)\?=(\s+(?==\?))?/g, (all, cs, enc, data) => {
    try {
      let bytes;
      if (enc.toUpperCase() === 'B') bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
      else {
        const t = data.replace(/_/g, ' ');
        const a = [];
        for (let i = 0; i < t.length; i++) {
          if (t[i] === '=' && /^[0-9a-f]{2}$/i.test(t.slice(i + 1, i + 3))) { a.push(parseInt(t.slice(i + 1, i + 3), 16)); i += 2; }
          else a.push(t.charCodeAt(i));
        }
        bytes = Uint8Array.from(a);
      }
      return new TextDecoder(cs.toLowerCase()).decode(bytes);
    } catch { return all; }
  });
}

/** One Received header → { from, by, with, id, for, date (Date|null), ip }. */
export function parseReceived(v) {
  const semi = v.lastIndexOf(';');
  const body = semi >= 0 ? v.slice(0, semi) : v;
  const dateStr = semi >= 0 ? v.slice(semi + 1).trim() : '';
  const part = (kw) => {
    const m = body.match(new RegExp(`(?:^|\\s)${kw}\\s+(.+?)(?=\\s+(?:from|by|via|with|id|for)\\s|$)`, 'i'));
    return m ? m[1].trim() : '';
  };
  const from = part('from');
  // the connecting address is the one the receiver saw, inside parentheses; [x] before it is only the HELO name
  const ip = (from.match(/\([^)]*\[(?:IPv6:)?([0-9a-f.:]+)\]/i) || from.match(/\(([0-9]{1,3}(?:\.[0-9]{1,3}){3})\)/) || from.match(/\[(?:IPv6:)?([0-9a-f.:]+)\]/i) || [])[1] || '';
  const d = dateStr ? new Date(dateStr.replace(/\s*\([^)]*\)\s*$/, '')) : null;
  return { from, by: part('by'), with: part('with'), id: part('id'), for: part('for'), date: d && !isNaN(d) ? d : null, ip };
}

/** Hops oldest first, with the delay from the previous hop in seconds. */
export function hops(hs) {
  const r = get(hs, 'Received').map(parseReceived).reverse();
  let prev = null;
  return r.map((h, i) => {
    const delay = h.date && prev ? Math.round((h.date - prev) / 1000) : null;
    if (h.date) prev = h.date;
    return { n: i + 1, ...h, delay };
  });
}

/** SPF / DKIM / DMARC / ARC verdicts from Authentication-Results, ARC-Authentication-Results and Received-SPF. */
export function authResults(hs) {
  const res = [];
  for (const [hname, arc] of [['Authentication-Results', false], ['ARC-Authentication-Results', true]]) {
    for (const v of get(hs, hname)) {
      const server = v.split(';')[0].replace(/^i=\d+;\s*/, '').trim();
      for (const m of v.matchAll(/\b(spf|dkim|dmarc|arc|compauth|bimi)=([a-z]+)([^;]*)/gi)) {
        const details = m[3].trim();
        const kv = Object.fromEntries([...details.matchAll(/([\w.]+)=("[^"]*"|[^\s;]+)/g)].map((x) => [x[1].toLowerCase(), x[2].replace(/"/g, '')]));
        res.push({ method: m[1].toLowerCase(), result: m[2].toLowerCase(), server, arc, details, domain: kv['header.d'] || kv['header.from'] || kv['smtp.mailfrom'] || kv['header.i'] || '' });
      }
    }
  }
  for (const v of get(hs, 'Received-SPF')) {
    const m = v.match(/^(\w+)/);
    if (m) res.push({ method: 'spf', result: m[1].toLowerCase(), server: 'Received-SPF', arc: false, details: v, domain: (v.match(/envelope-from=([^\s;]+)/) || [])[1] || '' });
  }
  return res;
}

export function dkimSignatures(hs) {
  return get(hs, 'DKIM-Signature').map((v) => {
    const kv = Object.fromEntries(v.split(';').map((p) => p.trim().split(/=(.*)/s)).filter((p) => p[0]).map(([k, x]) => [k.trim(), (x || '').replace(/\s+/g, '')]));
    return { domain: kv.d || '', selector: kv.s || '', algo: kv.a || '', headers: (kv.h || '').split(':').filter(Boolean), time: kv.t ? new Date(+kv.t * 1000) : null };
  });
}

const addr = (s) => (String(s || '').match(/<([^>]+)>/) || [, String(s || '').trim()])[1].toLowerCase();
const domainOf = (s) => (addr(s).split('@')[1] || '').replace(/>$/, '');

/** Notable things a reader should look at. */
export function findings(hs) {
  const f = [];
  const from = first(hs, 'From'), ret = first(hs, 'Return-Path'), reply = first(hs, 'Reply-To');
  const auth = authResults(hs).filter((a) => !a.arc);
  const verdict = (m) => auth.find((a) => a.method === m)?.result;
  for (const m of ['spf', 'dkim', 'dmarc']) {
    const v = verdict(m);
    if (!v) f.push(['warn', `no ${m.toUpperCase()} result in the headers`]);
    else if (v !== 'pass' && v !== 'bestguesspass') f.push(['bad', `${m.toUpperCase()} ${v}`]);
  }
  if (from && ret && domainOf(from) && domainOf(ret) && domainOf(from) !== domainOf(ret)) f.push(['warn', `From domain (${domainOf(from)}) differs from Return-Path (${domainOf(ret)}) — normal for mailing services, suspicious otherwise`]);
  if (from && reply && addr(reply) !== addr(from)) f.push(['warn', `Reply-To (${addr(reply)}) differs from From (${addr(from)})`]);
  const h = hops(hs);
  const slow = h.filter((x) => x.delay != null && x.delay > 300);
  if (slow.length) f.push(['warn', `${slow.length} hop(s) took longer than 5 minutes`]);
  if (h.some((x) => x.delay != null && x.delay < -120)) f.push(['warn', 'a hop is dated before the previous one (clock skew or forged Received line)']);
  return f;
}

export function fmtDelay(s) {
  if (s == null) return '';
  const a = Math.abs(s);
  const t = a < 60 ? `${a} s` : a < 3600 ? `${Math.floor(a / 60)} min ${a % 60} s` : `${Math.floor(a / 3600)} h ${Math.floor((a % 3600) / 60)} min`;
  return s < 0 ? `−${t}` : t;
}
