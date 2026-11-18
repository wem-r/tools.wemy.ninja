// IOC extractor + defang/refang. Pull indicators out of a blob of text (logs, e-mails,
// reports) and make them safe to paste around. All local.

export function refang(s) {
  return s
    .replace(/\[\.\]|\(\.\)|\{\.\}|\s\.\s|\[dot\]|\(dot\)/gi, '.')
    .replace(/\[:\]|\[:/g, ':')
    .replace(/\[@\]|\(@\)|\[at\]|\(at\)/gi, '@')
    .replace(/h[xX]{2}p(s?)/g, 'http$1')
    .replace(/\[\/\]/g, '/')
    .replace(/meow|fxp/gi, (m) => m); // leave unknown schemes alone
}
export function defang(s) {
  return s
    .replace(/https?/gi, (m) => m.replace(/t/gi, 'x').replace(/T/g, 'X'))
    .replace(/\./g, '[.]')
    .replace(/@/g, '[@]');
}

const RE = {
  url: /\b(?:https?|ftp):\/\/[^\s"'<>)\]}]+/gi,
  ipv4: /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g,
  ipv6: /\b(?:[0-9a-f]{1,4}:){2,7}[0-9a-f]{0,4}\b/gi,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  sha256: /\b[0-9a-f]{64}\b/gi,
  sha1: /\b[0-9a-f]{40}\b/gi,
  md5: /\b[0-9a-f]{32}\b/gi,
  cve: /\bCVE-\d{4}-\d{4,7}\b/gi,
  domain: /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}\b/gi,
};
const TLD_OK = /\.(com|net|org|io|ru|cn|co|info|biz|gov|edu|mil|uk|de|fr|nl|br|in|us|xyz|top|club|online|site|tk|ml|ga|cf|pw|cc|su|me|app|dev|ly|to|sh|pro|live|link|zip|mov|exe)$/i;

export function extract(text) {
  const t = refang(text);
  const grab = (re) => [...new Set((t.match(re) || []))];
  const urls = grab(RE.url);
  const emails = grab(RE.email);
  const sha256 = grab(RE.sha256);
  const sha1 = grab(RE.sha1).filter((h) => !sha256.includes(h));
  const md5 = grab(RE.md5).filter((h) => !sha256.includes(h) && !sha1.includes(h));
  const ipv4 = grab(RE.ipv4);
  const inEmailOrUrl = (d) => emails.some((e) => e.endsWith('@' + d) || e.endsWith('.' + d)) || urls.some((u) => u.includes('//' + d) || u.includes('.' + d.split('.')[0]));
  const domains = grab(RE.domain).filter((d) => !/^\d+\.\d+\.\d+\.\d+$/.test(d)).filter((d) => TLD_OK.test(d) || d.split('.').length >= 2);
  return {
    url: urls, 'ipv4': ipv4, ipv6: grab(RE.ipv6).filter((x) => x.includes('::') || x.split(':').length >= 4),
    domain: domains, email: emails, md5, sha1, sha256, cve: grab(RE.cve).map((c) => c.toUpperCase()),
  };
}

export const LABELS = { url: 'URLs', ipv4: 'IPv4', ipv6: 'IPv6', domain: 'Domains', email: 'E-mails', md5: 'MD5', sha1: 'SHA-1', sha256: 'SHA-256', cve: 'CVEs' };
