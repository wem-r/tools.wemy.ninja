import yaml from 'js-yaml';
import { parse as tomlParse, stringify as tomlStringify } from 'smol-toml';
import { $, $$, live, msg, pick } from '../js/tk.js';

function xmlToObj(text) {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  const err = doc.querySelector('parsererror'); if (err) throw new Error(`XML: ${err.textContent.replace(/\s+/g, ' ').slice(0, 160)}`);
  const conv = (n) => {
    const kids = [...n.children], attrs = [...n.attributes], txt = [...n.childNodes].filter((c) => c.nodeType === 3 || c.nodeType === 4).map((c) => c.nodeValue).join('').trim();
    if (!kids.length && !attrs.length) return txt === '' ? null : scalar(txt);
    const o = {};
    for (const a of attrs) o[`@${a.name}`] = scalar(a.value);
    for (const k of kids) { const v = conv(k); if (k.tagName in o) { if (!Array.isArray(o[k.tagName])) o[k.tagName] = [o[k.tagName]]; o[k.tagName].push(v); } else o[k.tagName] = v; }
    if (txt) o['#text'] = scalar(txt);
    return o;
  };
  return { [doc.documentElement.tagName]: conv(doc.documentElement) };
}
const scalar = (s) => (/^-?\d+(\.\d+)?$/.test(s) && !/^0\d/.test(s) ? Number(s) : s === 'true' ? true : s === 'false' ? false : s);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function objToXml(o, ind) {
  const pad = (d) => (ind ? '\n' + ' '.repeat(ind * d) : '');
  const tag = (name) => String(name).replace(/[^A-Za-z0-9_.-]/g, '_').replace(/^(\d)/, '_$1');
  const el = (name, v, d) => {
    if (Array.isArray(v)) return v.map((x) => el(name, x, d)).join('');
    const n = tag(name);
    if (v === null || v === undefined) return `${pad(d)}<${n}/>`;
    if (typeof v !== 'object') return `${pad(d)}<${n}>${esc(v)}</${n}>`;
    const attrs = Object.entries(v).filter(([k]) => k.startsWith('@')).map(([k, x]) => ` ${tag(k.slice(1))}="${esc(x).replace(/"/g, '&quot;')}"`).join('');
    const body = Object.entries(v).filter(([k]) => !k.startsWith('@') && k !== '#text').map(([k, x]) => el(k, x, d + 1)).join('');
    const text = v['#text'] != null ? esc(v['#text']) : '';
    return body ? `${pad(d)}<${n}${attrs}>${text}${body}${pad(d)}</${n}>` : `${pad(d)}<${n}${attrs}>${text}</${n}>`;
  };
  const keys = o && typeof o === 'object' && !Array.isArray(o) ? Object.keys(o) : [];
  const root = keys.length === 1 && !Array.isArray(o[keys[0]]) ? el(keys[0], o[keys[0]], 0) : el('root', o, 0);
  return `<?xml version="1.0" encoding="UTF-8"?>${root.startsWith('\n') ? root : (ind ? '\n' : '') + root}`;
}
function detect(t) {
  const s = t.trim();
  if (/^[{[]/.test(s)) return 'json';
  if (/^</.test(s)) return 'xml';
  if (/^\s*\[[^\]]+\]\s*$/m.test(s) && /^\s*[\w."-]+\s*=/m.test(s)) return 'toml';
  if (/^\s*[\w."-]+\s*=\s*\S/m.test(s) && !/^\s*[\w-]+\s*:/m.test(s)) return 'toml';
  return 'yaml';
}
const PARSE = { json: (t) => JSON.parse(t), yaml: (t) => yaml.load(t), toml: (t) => tomlParse(t), xml: xmlToObj };
const clean = (v) => JSON.parse(JSON.stringify(v, (k, x) => (x instanceof Date ? x.toISOString() : typeof x === 'bigint' ? Number(x) : x)));
live([$('#in'), $('#from'), $('#ind'), ...$$('input[name="to"]')], () => {
  const t = $('#in').value; if (!t.trim()) { $('#out').value = ''; msg($('#msg'), ''); return; }
  const from = $('#from').value === 'auto' ? detect(t) : $('#from').value, to = pick('to'), ind = Math.max(0, +$('#ind').value || 0);
  try {
    const v = PARSE[from](t);
    let out;
    if (to === 'json') out = JSON.stringify(clean(v), null, ind);
    else if (to === 'yaml') out = yaml.dump(clean(v), { indent: Math.max(1, ind || 2), lineWidth: 120, noRefs: true });
    else if (to === 'toml') { if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('TOML needs an object at the top level'); out = tomlStringify(JSON.parse(JSON.stringify(v, (k, x) => (x === null ? undefined : x)))); }
    else out = objToXml(clean(v), ind);
    $('#out').value = out;
    msg($('#msg'), `${from.toUpperCase()} → ${to.toUpperCase()}`, 'ok');
  } catch (e) { $('#out').value = ''; msg($('#msg'), `${from.toUpperCase()}: ${e.message.split('\n')[0]}`); }
});
