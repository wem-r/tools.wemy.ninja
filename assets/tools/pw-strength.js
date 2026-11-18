import { $, el, kv, live } from '../js/tk.js';
import { strength, LABELS } from './lib/pwstrength.js';

const COLORS = ['#c0392b', '#e67e22', '#b0820a', '#2d8a4e', '#0b7a63'];
function render() {
  const r = strength($('#pw').value);
  $('#bar').style.width = ((r.score + 1) / 5 * 100) + '%';
  $('#bar').style.background = COLORS[r.score];
  $('#verdict').textContent = $('#pw').value ? LABELS[r.score] : '—';
  $('#verdict').style.color = COLORS[r.score];
  kv($('#stats'), [['entropy', r.bits + ' bits'], ['combinations', r.guesses > 1e12 ? r.guesses.toExponential(2) : Math.round(r.guesses).toLocaleString('en-US')], ['crack time (1 GPU, fast hash)', r.crack]]);
  $('#fb').replaceChildren(...r.feedback.map((f) => el('li', { text: f })));
}
live([$('#pw')], render);
