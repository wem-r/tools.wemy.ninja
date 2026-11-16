import { $, el, kv, live } from '../js/tk.js';
import { stats, frequency, wordList } from './lib/text.js';

const STOP = new Set(('a an and are as at be but by for from has have he her his i in is it its me my not of on or our she so that the their them they this to was we were what when which who will with you your ' +
  'le la les un une des du de et en est il elle ils elles je tu nous vous on au aux ce ces cette pour par pas plus que qui sur dans avec ne se sa son ses mais ou où').split(' '));
const fmt = (n, d = 0) => n.toLocaleString(undefined, { maximumFractionDigits: d });
const mins = (m) => (m < 1 ? `${Math.round(m * 60)} s` : `${Math.floor(m)} min ${Math.round((m % 1) * 60)} s`);
const list = (tbl, rows, total) => tbl.replaceChildren(...rows.map(([k, n]) => el('tr', {}, el('td', {}, el('code', { text: k === ' ' ? '␠' : k === '\n' ? '⏎' : k })), el('td', { class: 'dim', style: 'text-align:right', text: n }), el('td', { class: 'dim', style: 'text-align:right', text: `${((100 * n) / total).toFixed(1)} %` }))));

live([$('#in'), $('#stop'), $('#lettersOnly')], () => {
  const t = $('#in').value, s = stats(t);
  kv($('#out'), [
    ['characters', fmt(s.chars), `${fmt(s.noSpaces)} without spaces · ${fmt(s.codePoints)} code points · ${fmt(s.utf16)} UTF-16 units`],
    ['bytes (UTF-8)', fmt(s.bytes)],
    ['words', fmt(s.words), `${fmt(s.uniqueWords)} distinct · average ${s.avgWord.toFixed(1)} letters`],
    ['sentences / paragraphs / lines', `${fmt(s.sentences)} / ${fmt(s.paragraphs)} / ${fmt(s.lines)}`],
    ['letters', fmt(s.letters), `${fmt(s.vowels)} vowels · ${fmt(s.consonants)} consonants`],
    ['digits / whitespace', `${fmt(s.digits)} / ${fmt(s.spaces)}`],
    ['reading / speaking time', `${mins(s.readingMin)} / ${mins(s.speakingMin)}`, '230 / 140 words per minute'],
  ]);
  for (const c of $('#out').querySelectorAll('td.c')) c.replaceChildren();
  const ws = wordList(t).filter((w) => !$('#stop').checked || !STOP.has(w));
  list($('#w'), frequency(ws, 25), ws.length || 1);
  const cs = [...t.toLowerCase()].filter((c) => !$('#lettersOnly').checked || /[\p{L}\p{N}]/u.test(c));
  list($('#c'), frequency(cs, 25), cs.length || 1);
});
