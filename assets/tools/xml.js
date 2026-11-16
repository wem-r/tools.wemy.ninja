import { $, $$, live, msg, pick } from '../js/tk.js';

const inp = $('#in'), out = $('#out');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = (s) => esc(s).replace(/"/g, '&quot;');

function ser(node, ind, depth) {
  const pad = ind == null ? '' : ind.repeat(depth), nl = ind == null ? '' : '\n';
  switch (node.nodeType) {
    case 1: {
      const a = [...node.attributes].map((x) => ` ${x.name}="${attr(x.value)}"`).join('');
      const kids = [...node.childNodes].filter((c) => !(c.nodeType === 3 && !c.nodeValue.trim()));
      if (!kids.length) return `${pad}<${node.nodeName}${a}/>${nl}`;
      if (kids.length === 1 && kids[0].nodeType === 3) return `${pad}<${node.nodeName}${a}>${esc(kids[0].nodeValue.trim())}</${node.nodeName}>${nl}`;
      return `${pad}<${node.nodeName}${a}>${nl}${kids.map((c) => ser(c, ind, depth + 1)).join('')}${pad}</${node.nodeName}>${nl}`;
    }
    case 3: return `${pad}${esc(node.nodeValue.trim())}${nl}`;
    case 4: return `${pad}<![CDATA[${node.nodeValue}]]>${nl}`;
    case 7: return `${pad}<?${node.target} ${node.data}?>${nl}`;
    case 8: return `${pad}<!--${node.nodeValue}-->${nl}`;
    case 10: return `<!DOCTYPE ${node.name}${node.publicId ? ` PUBLIC "${node.publicId}" "${node.systemId}"` : node.systemId ? ` SYSTEM "${node.systemId}"` : ''}>${nl}`;
    default: return '';
  }
}

live([inp, ...$$('input[name="op"]')], () => {
  const t = inp.value.trim();
  if (!t) { out.value = ''; msg($('#msg'), ''); return; }
  const doc = new DOMParser().parseFromString(t, 'application/xml');
  const err = doc.querySelector('parsererror');
  if (err) { msg($('#msg'), err.textContent.replace(/\s+/g, ' ').replace(/Below is a rendering.*$/i, '').replace(/^This page contains the following errors:\s*/i, '').trim().slice(0, 300)); out.value = ''; return; }
  const op = pick('op');
  const ind = op === 'min' ? null : ' '.repeat(+op);
  const decl = t.match(/^<\?xml[^?]*\?>/);
  out.value = (decl ? decl[0] + (ind == null ? '' : '\n') : '') + [...doc.childNodes].map((c) => ser(c, ind, 0)).join('').trimEnd();
  msg($('#msg'), `well-formed · root <${doc.documentElement.nodeName}> · ${doc.getElementsByTagName('*').length} elements`, 'ok');
});
