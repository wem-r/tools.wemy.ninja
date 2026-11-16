import { $, $$, live, pick } from '../js/tk.js';

const W = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum curabitur pretium tincidunt lacus nunc vel risus commodo viverra maecenas accumsan lacus vel facilisis volutpat porta nibh venenatis cras pulvinar mattis blandit ultrices vitae auctor eu augue neque gravida fermentum faucibus pellentesque habitant morbi tristique senectus netus malesuada fames ac turpis egestas integer feugiat scelerisque varius'.split(' ');
const R = (n) => crypto.getRandomValues(new Uint32Array(1))[0] % n;
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const sentence = () => { const n = 6 + R(10), w = Array.from({ length: n }, () => W[R(W.length)]); if (n > 9) w[3 + R(n - 6)] += ','; return cap(w.join(' ')) + '.'; };
const para = () => Array.from({ length: 3 + R(4) }, sentence).join(' ');
const gen = () => {
  const n = Math.max(1, Math.min(200, +$('#n').value || 1)), u = pick('u');
  let parts = u === 'p' ? Array.from({ length: n }, para) : u === 's' ? [Array.from({ length: n }, sentence).join(' ')] : [Array.from({ length: n }, () => W[R(W.length)]).join(' ')];
  if ($('#classic').checked) { const c = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'; parts[0] = u === 'w' ? `lorem ipsum ${parts[0].split(' ').slice(2).join(' ')}`.trim() : c + parts[0].replace(/^[^.]*\./, ''); }
  const txt = $('#html').checked && u !== 'w' ? parts.map((p) => `<p>${p}</p>`).join('\n') : parts.join('\n\n');
  $('#out').value = txt; $('#cnt').textContent = `${txt.split(/\s+/).filter(Boolean).length} words · ${txt.length} chars`;
};
$('#go').addEventListener('click', gen); live([$('#n'), $('#classic'), $('#html'), ...$$('input[name="u"]')], gen);
