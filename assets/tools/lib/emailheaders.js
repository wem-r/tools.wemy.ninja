// Parse raw e-mail headers: the Received hop chain with delays, authentication results,
// and the key fields. Pure — nothing leaves the browser.

function unfold(raw) {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const headers = [];
  for (const line of lines) {
    if (/^\s/.test(line) && headers.length) headers[headers.length - 1] += ' ' + line.trim();
    else if (line.trim() === '' && headers.length) break; // end of headers
    else headers.push(line);
  }
  return headers;
}
function get(headers, name) {
  const re = new RegExp('^' + name + ':\\s*', 'i');
  return headers.filter((h) => re.test(h)).map((h) => h.replace(re, '').trim());
}
const ip = (s) => (s.match(/\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/) || [])[0];
const priv = (i) => !i || /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1|169\.254\.)/.test(i);

export function parse(raw) {
  const headers = unfold(raw);
  const received = get(headers, 'Received').reverse(); // chronological (oldest first)
  const hops = received.map((r, i) => {
    const from = (r.match(/from\s+([^\s;]+)/i) || [])[1] || '';
    const by = (r.match(/\bby\s+([^\s;]+)/i) || [])[1] || '';
    const withp = (r.match(/\bwith\s+([^\s;]+)/i) || [])[1] || '';
    const dm = r.match(/;\s*(.+)$/);
    const date = dm ? new Date(dm[1].trim()) : null;
    return { i, from, by, with: withp, ip: ip(r.replace(/by\s+\S+/i, '')), date: date && !isNaN(date) ? date : null, raw: r };
  });
  // delays between consecutive hops
  for (let i = 1; i < hops.length; i++) {
    if (hops[i].date && hops[i - 1].date) hops[i].delay = Math.max(0, (hops[i].date - hops[i - 1].date) / 1000);
  }
  const originating = hops.find((h) => h.ip && !priv(h.ip));
  const auth = get(headers, 'Authentication-Results').join(' ; ');
  const res = (re) => (auth.match(re) || [])[1];
  return {
    from: get(headers, 'From')[0] || '', to: get(headers, 'To')[0] || '', subject: get(headers, 'Subject')[0] || '',
    date: get(headers, 'Date')[0] || '', messageId: get(headers, 'Message-ID')[0] || '', returnPath: get(headers, 'Return-Path')[0] || '',
    replyTo: get(headers, 'Reply-To')[0] || '', xMailer: get(headers, 'X-Mailer')[0] || get(headers, 'User-Agent')[0] || '',
    hops, hopCount: hops.length, originatingIP: originating ? originating.ip : '',
    totalDelay: hops.reduce((s, h) => s + (h.delay || 0), 0),
    spf: res(/spf=(\w+)/i), dkim: res(/dkim=(\w+)/i), dmarc: res(/dmarc=(\w+)/i),
    auth,
  };
}
