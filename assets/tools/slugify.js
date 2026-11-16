import { $, kv, live } from '../js/tk.js';
import { slugify, removeAccents } from './lib/text.js';

live([$('#in'), $('#sep'), $('#lower'), $('#max'), $('#bulk')], () => {
  const o = { sep: $('#sep').value, lower: $('#lower').checked, max: +$('#max').value || 0 };
  const s = slugify($('#in').value, o);
  kv($('#out'), [['slug', s], ['path', `/${s}/`], ['file name', `${s}.md`], ['without accents', removeAccents($('#in').value)]]);
  $('#bulkout').value = $('#bulk').value.split('\n').map((l) => slugify(l, o)).join('\n');
});
