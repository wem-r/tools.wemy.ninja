import { $, live } from '../js/tk.js';

function mask(s, a, b, m, keepSpaces, mail) {
  if (mail && /^[^@\s]+@[^@\s]+$/.test(s)) { const [l, d] = s.split('@'); return mask(l, Math.min(a, 2), 0, m, keepSpaces, false) + '@' + d; }
  const c = [...s];
  return c.map((x, i) => (i < a || i >= c.length - b || (keepSpaces && /\s/.test(x)) ? x : m)).join('');
}
live([$('#in'), $('#a'), $('#b'), $('#m'), $('#sp'), $('#mail')], () => {
  $('#out').value = $('#in').value.split('\n').map((l) => mask(l, +$('#a').value || 0, +$('#b').value || 0, $('#m').value || '*', $('#sp').checked, $('#mail').checked)).join('\n');
});
