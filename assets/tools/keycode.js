import { $, el, kv } from '../js/tk.js';

const pad = $('#pad'); pad.focus();
pad.addEventListener('keydown', (e) => {
  e.preventDefault();
  const mods = ['ctrl', 'alt', 'shift', 'meta'].filter((m) => e[m + 'Key']);
  $('#big').textContent = e.key === ' ' ? 'Space' : e.key;
  kv($('#out'), [['key', e.key === ' ' ? '" " (space)' : e.key], ['code', e.code], ['keyCode (legacy)', String(e.keyCode)], ['which (legacy)', String(e.which)],
    ['location', ['standard', 'left', 'right', 'numpad'][e.location] || String(e.location)], ['modifiers', mods.join(' + ') || 'none'], ['repeat', e.repeat ? 'yes' : 'no'],
    ['combo', [...mods.map((m) => m[0].toUpperCase() + m.slice(1)), ['Control', 'Alt', 'Shift', 'Meta'].includes(e.key) ? '' : e.code].filter(Boolean).join('+')]]);
  if (!e.repeat) {
    $('#hist').prepend(el('tr', {}, el('td', {}, el('code', { text: e.key === ' ' ? 'Space' : e.key })), el('td', { text: e.code }), el('td', { text: String(e.keyCode) }), el('td', { class: 'dim', text: mods.join('+') })));
    while ($('#hist').rows.length > 20) $('#hist').deleteRow(-1);
  }
});
