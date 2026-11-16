import { $, $$, el, live, pick } from '../js/tk.js';
import { openDir, OPEN_DIR_TYPES, ENGINES } from './lib/dorks.js';

$('#cats').append(...Object.keys(OPEN_DIR_TYPES).map((k, i) => el('label', {}, el('input', { type: 'radio', name: 'cat', value: k, checked: i === 0 }), el('span', { text: k }))));
const setTypes = () => { $('#types').value = OPEN_DIR_TYPES[pick('cat')].join(', '); };
setTypes();
const run = live([$('#types'), $('#kw'), $('#site'), $('#ex')], () => {
  const q = openDir({ types: $('#types').value.split(',').map((x) => x.trim()), keyword: $('#kw').value.trim(), site: $('#site').value.trim(), exclude: $('#ex').checked });
  $('#q').textContent = q;
  $('#g').href = ENGINES.google.url + encodeURIComponent(q);
  $('#b').href = ENGINES.bing.url + encodeURIComponent(q.replace(/ \| /g, ' OR '));
  $('#d').href = ENGINES.ddg.url + encodeURIComponent(q.replace(/ \| /g, ' OR ').replace(/-inurl:\([^)]*\)/g, '').trim());
});
for (const r of $$('input[name="cat"]')) r.addEventListener('change', () => { setTypes(); run(); });
