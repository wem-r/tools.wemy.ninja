import { $, $$, kv, live, msg, pick, toB64 } from '../js/tk.js';
import { source } from './lib/source.js';

let getBytes = null, job = 0;
const attr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const run = async () => {
  if (!getBytes) return;
  const id = ++job;
  try {
    const data = await getBytes();
    const alg = pick('alg');
    const h = `${alg.replace('-', '').toLowerCase()}-${toB64(await crypto.subtle.digest(alg, data))}`;
    if (id !== job) return;
    const url = attr($('#url').value.trim() || 'URL');
    const tag = pick('tag') === 'script'
      ? `<script src="${url}" integrity="${h}" crossorigin="anonymous"></script>`
      : `<link rel="stylesheet" href="${url}" integrity="${h}" crossorigin="anonymous">`;
    msg($('#msg'), `${data.length.toLocaleString()} bytes`, 'ok');
    kv($('#out'), [['integrity', h], ['tag', tag], ['shell check', `openssl dgst -${alg.replace('-', '').toLowerCase()} -binary FILE | openssl base64 -A`]]);
  } catch (e) { msg($('#msg'), e.message); $('#out').replaceChildren(); }
};
source((g) => { getBytes = g; return run(); });
live([$('#url'), ...$$('input[name="alg"]'), ...$$('input[name="tag"]')], run);
