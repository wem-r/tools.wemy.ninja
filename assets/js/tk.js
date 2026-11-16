// tk.js — small helpers shared by every tool (imported by assets/tools/*.js).
// Everything runs locally: no request is ever made with what the user types.

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null) e.append(k.nodeType ? k : String(k));
  return e;
};

/** Run fn now and whenever any of the inputs change. */
export function live(inputs, fn, events = ['input', 'change']) {
  const run = () => { try { fn(); } catch (e) { console.error(e); } };
  for (const i of [].concat(inputs)) if (i) for (const ev of events) i.addEventListener(ev, run);
  run();
  return run;
}

/** Read the value of the checked radio / segmented button group named `name`. */
export const pick = (name, root = document) => ($(`input[name="${name}"]:checked`, root) || {}).value;

/** Key/value table: rows = [[label, value, note?], …]; values get a copy button. */
export function kv(target, rows) {
  target.replaceChildren(...rows.filter(Boolean).map(([k, v, note]) => el('tr', {},
    el('td', { text: k }),
    el('td', {}, el('code', { class: 'v', text: v ?? '' }), note ? el('span', { class: 'note', text: ' ' + note }) : null),
    el('td', { class: 'c' }, v != null && v !== '' ? copyBtn(() => String(v)) : null),
  )));
}

export function copyBtn(get, label = 'copy') {
  return el('button', {
    type: 'button', class: 'tk-copy', text: label,
    onclick: async (ev) => {
      const b = ev.currentTarget;
      try { await navigator.clipboard.writeText(get()); b.textContent = 'copied'; b.classList.add('ok'); }
      catch { b.textContent = 'failed'; }
      setTimeout(() => { b.textContent = label; b.classList.remove('ok'); }, 1200);
    },
  });
}

// Every <button data-copy="#id"> copies that element's value / text.
document.addEventListener('click', async (ev) => {
  const b = ev.target.closest('[data-copy]');
  if (!b) return;
  const t = $(b.dataset.copy);
  const text = t ? ('value' in t && t.tagName !== 'BUTTON' ? t.value : t.textContent) : '';
  try { await navigator.clipboard.writeText(text); b.textContent = 'copied'; b.classList.add('ok'); }
  catch { b.textContent = 'failed'; }
  setTimeout(() => { b.textContent = 'copy'; b.classList.remove('ok'); }, 1200);
});

/** Show an error (or clear it with ''). */
export function msg(target, text, kind = 'err') {
  target.textContent = text || '';
  target.className = 'tk-msg' + (text ? ' ' + kind : '');
}

// ---------- bytes ----------
export const enc = new TextEncoder();
export const dec = new TextDecoder();
export const toHex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
export const fromHex = (h) => {
  h = h.replace(/^0x/i, '').replace(/[\s:,-]/g, '');
  if (h.length % 2 || /[^0-9a-f]/i.test(h)) throw new Error('not valid hex');
  return Uint8Array.from(h.match(/../g) || [], (x) => parseInt(x, 16));
};
export const toB64 = (b) => btoa(String.fromCharCode(...new Uint8Array(b)));
export const fromB64 = (s) => {
  s = s.trim().replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '');
  s += '='.repeat((4 - (s.length % 4)) % 4);
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
};
export const toB64url = (b) => toB64(b).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** Decode text typed as utf-8 / hex / base64. */
export function bytesFrom(text, format = 'utf8') {
  if (format === 'hex') return fromHex(text);
  if (format === 'base64') return fromB64(text);
  return enc.encode(text);
}

/** Uniform random integer in [0, n) — rejection sampling, no modulo bias. */
export function randInt(n) {
  if (n <= 0) return 0;
  const max = Math.floor(0x100000000 / n) * n;
  const a = new Uint32Array(1);
  do crypto.getRandomValues(a); while (a[0] >= max);
  return a[0] % n;
}

export function download(name, data, type = 'text/plain') {
  const a = el('a', { href: URL.createObjectURL(new Blob([data], { type })), download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Read a dropped / chosen file as bytes. */
export const readFile = (f) => f.arrayBuffer().then((b) => new Uint8Array(b));

export const fmtInt = (n) => BigInt(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
