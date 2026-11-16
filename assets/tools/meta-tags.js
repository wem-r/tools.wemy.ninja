import { $, $$, live } from '../js/tk.js';

const a = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
live($$('#tk input, #tk textarea, #tk select').filter((e) => e.id !== 'out'), () => {
  const v = (id) => $('#' + id).value.trim(), d = v('desc');
  $('#dlen').textContent = `${d.length} chars${d.length > 160 ? ' — search engines cut around 155–160' : ''}`;
  const L = [
    '<meta charset="utf-8">', '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${a(v('title'))}</title>`, d && `<meta name="description" content="${a(d)}">`, v('url') && `<link rel="canonical" href="${a(v('url'))}">`,
    $('#noindex').checked && '<meta name="robots" content="noindex, nofollow">', `<meta name="theme-color" content="${v('col')}">`, '',
    '<!-- Open Graph -->', `<meta property="og:type" content="${v('type')}">`, `<meta property="og:title" content="${a(v('title'))}">`, d && `<meta property="og:description" content="${a(d)}">`,
    v('url') && `<meta property="og:url" content="${a(v('url'))}">`, v('img') && `<meta property="og:image" content="${a(v('img'))}">`, v('site') && `<meta property="og:site_name" content="${a(v('site'))}">`, v('loc') && `<meta property="og:locale" content="${a(v('loc'))}">`, '',
    '<!-- Twitter / X -->', `<meta name="twitter:card" content="${$('#large').checked ? 'summary_large_image' : 'summary'}">`, `<meta name="twitter:title" content="${a(v('title'))}">`, d && `<meta name="twitter:description" content="${a(d)}">`,
    v('img') && `<meta name="twitter:image" content="${a(v('img'))}">`, v('tw') && `<meta name="twitter:site" content="${a(v('tw').startsWith('@') ? v('tw') : '@' + v('tw'))}">`,
  ];
  $('#out').value = L.filter((x) => x !== false && x !== null && x !== undefined).join('\n');
});
