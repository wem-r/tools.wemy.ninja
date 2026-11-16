import { $, $$, el, live } from '../js/tk.js';
import { scan, clean, U } from './lib/unicode.js';

const inp = $('#in');
if (!inp.value) inp.value = 'Please log in at pаypal.com​ to confirm.\nInvoice: report‮fdp.exe\nPrice: 1 000 €';
const KIND = { invisible: 'invisible', bidi: 'direction override', tag: 'tag', variation: 'variation selector', space: 'unusual space', confusable: 'look-alike', control: 'control', private: 'private use' };

live([inp, ...$$('input[data-k]')], () => {
  const t = inp.value, hits = scan(t);
  $('#cnt').textContent = hits.length ? `${hits.length} suspicious character${hits.length === 1 ? '' : 's'}` : 'nothing hidden';
  const parts = []; let at = 0;
  for (const h of hits) {
    parts.push(t.slice(at, h.index));
    parts.push(el('mark', { class: h.kind === 'confusable' || h.kind === 'space' ? 'alt' : '', title: `${U(h.cp)} ${h.name}`, text: h.kind === 'confusable' ? h.char : `⟨${U(h.cp).slice(2)}⟩` }));
    at = h.index + h.char.length;
  }
  parts.push(t.slice(at));
  $('#vis').replaceChildren(...parts);
  const lineOf = (i) => t.slice(0, i).split('\n').length;
  $('#list').replaceChildren(...(hits.length ? [el('tr', {}, ...['line', 'code', 'name', 'kind'].map((x) => el('th', { text: x }))),
    ...hits.slice(0, 500).map((h) => el('tr', {}, el('td', { class: 'dim', text: lineOf(h.index) }), el('td', {}, el('code', { text: U(h.cp) })), el('td', { text: h.name }), el('td', { class: h.kind === 'bidi' ? 'bad' : 'dim', text: KIND[h.kind] })))] : []));
  $('#clean').value = clean(t, new Set($$('input[data-k]:checked').map((c) => c.dataset.k)));
});
