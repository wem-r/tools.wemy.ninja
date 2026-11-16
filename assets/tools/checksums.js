import { $, el, msg, copyBtn } from '../js/tk.js';
import { all } from './lib/checksum.js';
import { source } from './lib/source.js';

source(async (getBytes) => {
  try {
    const data = await getBytes();
    msg($('#msg'), `${data.length.toLocaleString()} bytes`, 'ok');
    $('#out').replaceChildren(...all(data).map(([n, v, w]) => {
      const hex = v.toString(16).padStart(w / 4, '0');
      return el('tr', {}, el('td', { text: n }), el('td', {}, el('code', { text: hex })), el('td', { class: 'dim', text: v }), el('td', {}, copyBtn(() => hex)));
    }));
  } catch (e) { msg($('#msg'), e.message); $('#out').replaceChildren(); }
});
