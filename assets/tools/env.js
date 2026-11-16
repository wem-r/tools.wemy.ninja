import { $, $$, el, live, msg, pick } from '../js/tk.js';
import { parseEnv, SECRETISH } from './lib/env.js';

const sq = (s) => `'${s.replace(/'/g, `'\\''`)}'`;
live([$('#in'), $('#expand'), $('#mask'), ...$$('input[name="fmt"]')], () => {
  const { vars, errors, dupes } = parseEnv($('#in').value, { expand: $('#expand').checked });
  const final = new Map(vars.map((v) => [v.key, v.value]));
  const mask = $('#mask').checked;
  const show = (k, v) => (mask && SECRETISH.test(k) && v ? '•'.repeat(Math.min(12, v.length)) : v);
  const notes = [...errors.map((e) => `line ${e.line}: ${e.msg}`), ...[...dupes].map((d) => `${d} is set more than once — the last one wins`)];
  msg($('#msg'), notes.length ? notes.join(' · ') : `${final.size} variables`, errors.length ? 'err' : dupes.size ? 'warn' : 'ok');
  $('#out').replaceChildren(
    el('tr', {}, ...['line', 'key', 'value'].map((h) => el('th', { text: h }))),
    ...vars.map((v) => el('tr', {}, el('td', { class: 'dim', text: v.line }),
      el('td', { class: dupes.has(v.key) && final.get(v.key) !== v.value ? 'dim' : '', text: v.key }),
      el('td', {}, el('code', { text: show(v.key, v.value).replace(/\n/g, '⏎') })))),
  );
  const e = [...final];
  $('#exp').value = {
    json: () => JSON.stringify(Object.fromEntries(e), null, 2),
    sh: () => e.map(([k, v]) => `export ${k}=${sq(v)}`).join('\n'),
    docker: () => e.map(([k, v]) => `-e ${k}=${sq(v)}`).join(' \\\n'),
    yaml: () => 'environment:\n' + e.map(([k, v]) => `  ${k}: ${JSON.stringify(v)}`).join('\n'),
  }[pick('fmt')]();
});
