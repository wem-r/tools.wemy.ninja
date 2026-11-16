// Search-engine query ("dork") builder. Pure: it only builds strings and URLs.

export const ENGINES = {
  google: { name: 'Google', url: 'https://www.google.com/search?q=', ops: ['site', 'inurl', 'intitle', 'intext', 'filetype', 'ext', 'before', 'after', 'cache', 'related', 'allinurl', 'allintitle'] },
  bing: { name: 'Bing', url: 'https://www.bing.com/search?q=', ops: ['site', 'inurl', 'intitle', 'inbody', 'filetype', 'ip', 'contains', 'instreamset'] },
  ddg: { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=', ops: ['site', 'inurl', 'intitle', 'filetype'] },
};

const quote = (v) => (/\s|["]/.test(v) && !/^".*"$/.test(v) ? `"${v.replace(/"/g, '')}"` : v);

/**
 * Build a query from parts: { terms, exact, any: [], exclude: [], site, notSite: [], inurl, intitle, intext, filetype: [] , after, before }
 * Unsupported operators for the engine are mapped or dropped (listed in `dropped`).
 */
export function build(p, engine = 'google') {
  const E = ENGINES[engine], q = [], dropped = [];
  const op = (name, v, alt) => {
    if (!v) return;
    if (E.ops.includes(name)) q.push(`${name}:${quote(v)}`);
    else if (alt && E.ops.includes(alt)) q.push(`${alt}:${quote(v)}`);
    else if (name === 'intext') q.push(quote(v));
    else dropped.push(name);
  };
  if (p.terms) q.push(p.terms.trim());
  if (p.exact) q.push(`"${p.exact.replace(/"/g, '')}"`);
  const any = (p.any || []).filter(Boolean);
  if (any.length) q.push(any.length > 1 ? `(${any.map(quote).join(' OR ')})` : quote(any[0]));
  op('site', p.site);
  for (const s of p.notSite || []) if (s) q.push(`-site:${s}`);
  op('inurl', p.inurl);
  op('intitle', p.intitle);
  op('intext', p.intext, 'inbody');
  const ft = (p.filetype || []).filter(Boolean);
  if (ft.length) {
    const name = E.ops.includes('filetype') ? 'filetype' : 'ext';
    q.push(ft.length > 1 ? `(${ft.map((f) => `${name}:${f}`).join(' OR ')})` : `${name}:${ft[0]}`);
  }
  if (p.after) { if (E.ops.includes('after')) q.push(`after:${p.after}`); else dropped.push('after'); }
  if (p.before) { if (E.ops.includes('before')) q.push(`before:${p.before}`); else dropped.push('before'); }
  for (const x of p.exclude || []) if (x) q.push(`-${quote(x)}`);
  const query = q.join(' ').replace(/\s+/g, ' ').trim();
  return { query, url: E.url + encodeURIComponent(query), dropped };
}

/** Ready-made recon queries for a target domain ({d} is replaced). */
export const PRESETS = [
  ['Exposed documents', 'site:{d} (filetype:pdf OR filetype:doc OR filetype:docx OR filetype:xls OR filetype:xlsx OR filetype:ppt OR filetype:pptx)'],
  ['Config & env files', 'site:{d} (ext:env OR ext:ini OR ext:conf OR ext:cfg OR ext:yml OR ext:yaml OR ext:toml OR ext:properties)'],
  ['Database & backups', 'site:{d} (ext:sql OR ext:db OR ext:sqlite OR ext:bak OR ext:backup OR ext:old OR ext:dump OR ext:tar OR ext:gz OR ext:zip)'],
  ['Log files', 'site:{d} (ext:log OR ext:txt) (intext:error OR intext:exception OR intext:password)'],
  ['Open directories', 'site:{d} intitle:"index of" ("parent directory" OR "last modified")'],
  ['Login & admin pages', 'site:{d} (inurl:login OR inurl:signin OR inurl:admin OR inurl:portal OR intitle:"login" OR intitle:"admin")'],
  ['Subdomains (minus www)', 'site:*.{d} -site:www.{d}'],
  ['Error & debug pages', 'site:{d} ("Warning: mysql" OR "Fatal error" OR "stack trace" OR "Traceback (most recent call last)" OR "Whoops!")'],
  ['phpinfo & server status', 'site:{d} (inurl:phpinfo OR intitle:"phpinfo()" OR inurl:server-status OR inurl:server-info)'],
  ['Exposed .git / .svn', 'site:{d} (inurl:.git OR inurl:.svn OR intitle:"index of" ".git")'],
  ['API endpoints & docs', 'site:{d} (inurl:api OR inurl:swagger OR inurl:graphql OR inurl:openapi OR intitle:"swagger ui")'],
  ['Credentials in text', 'site:{d} (intext:"password" OR intext:"passwd" OR intext:"api_key" OR intext:"secret") (ext:txt OR ext:log OR ext:env OR ext:json)'],
  ['WordPress', 'site:{d} (inurl:wp-content OR inurl:wp-admin OR inurl:wp-includes OR inurl:xmlrpc.php)'],
  ['Pastebins mentioning the domain', '"{d}" (site:pastebin.com OR site:ghostbin.site OR site:paste.ee OR site:justpaste.it OR site:rentry.co)'],
  ['Code hosting mentions', '"{d}" (site:github.com OR site:gitlab.com OR site:bitbucket.org)'],
  ['Cloud storage buckets', '"{d}" (site:s3.amazonaws.com OR site:blob.core.windows.net OR site:storage.googleapis.com OR site:digitaloceanspaces.com)'],
  ['Employees on LinkedIn', 'site:linkedin.com/in "{d}"'],
  ['Email addresses', '"@{d}" -site:{d}'],
];
export const preset = (tpl, domain) => tpl.replace(/\{d\}/g, String(domain || 'example.com').trim().replace(/^https?:\/\//, '').replace(/\/.*$/, ''));

/** Open-directory query: intitle:"index of" + file types / keywords, optionally limited to a site. */
export function openDir({ types = [], keyword = '', site = '', exclude = true } = {}) {
  const parts = ['intitle:"index of"'];
  if (site) parts.push(`site:${site}`);
  const ft = types.filter(Boolean);
  if (ft.length) parts.push(`(${ft.map((t) => (/\s/.test(t) ? `"${t}"` : t)).join(' | ')})`);
  if (keyword) parts.push(/\s/.test(keyword) ? `"${keyword}"` : keyword);
  if (exclude) parts.push('-inurl:(jsp|pl|php|html|aspx|htm|cf|shtml) -inurl:(listen77|mp3raid|mp3toss|mp3drug|index_of|index-of|wallywashis|downloadmana)');
  return parts.join(' ');
}
export const OPEN_DIR_TYPES = {
  video: ['mkv', 'mp4', 'avi', 'mov', 'mpg', 'wmv', 'webm'],
  audio: ['mp3', 'flac', 'wav', 'ogg', 'm4a', 'aac', 'wma'],
  ebook: ['pdf', 'epub', 'mobi', 'azw3', 'djvu', 'cbz', 'cbr'],
  images: ['jpg', 'png', 'gif', 'bmp', 'webp', 'tif', 'psd'],
  software: ['exe', 'iso', 'dmg', 'msi', 'apk', 'deb', 'rpm', 'tar.gz', 'zip', '7z', 'rar'],
  documents: ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'csv', 'txt'],
  data: ['sql', 'db', 'sqlite', 'bak', 'json', 'xml', 'log', 'env', 'yml'],
};
