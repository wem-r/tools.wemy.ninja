import { parsePhoneNumberFromString, getCountries, getCountryCallingCode } from 'libphonenumber-js/max';
import { $, el, live } from '../js/tk.js';

const names = new Intl.DisplayNames([navigator.language || 'en'], { type: 'region' });
const cs = getCountries().map((c) => [c, names.of(c) || c]).sort((a, b) => a[1].localeCompare(b[1]));
$('#cc').append(...cs.map(([c, n]) => el('option', { value: c, text: `${n} (+${getCountryCallingCode(c)})`, selected: c === 'FR' })));
const TYPE = { MOBILE: 'mobile', FIXED_LINE: 'landline', FIXED_LINE_OR_MOBILE: 'landline or mobile', TOLL_FREE: 'toll-free', PREMIUM_RATE: 'premium rate', SHARED_COST: 'shared cost', VOIP: 'VoIP', PERSONAL_NUMBER: 'personal', PAGER: 'pager', UAN: 'UAN', VOICEMAIL: 'voicemail' };
live([$('#in'), $('#cc')], () => {
  $('#out').replaceChildren(el('tr', {}, ...['input', 'valid', 'country', 'type', 'E.164', 'international', 'national'].map((h) => el('th', { text: h }))),
    ...$('#in').value.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
      const p = parsePhoneNumberFromString(l, $('#cc').value);
      if (!p) return el('tr', {}, el('td', {}, el('code', { text: l })), el('td', { class: 'bad', text: '✗ not a phone number' }));
      const ok = p.isValid();
      return el('tr', {}, el('td', {}, el('code', { text: l })), el('td', { class: ok ? 'ok' : p.isPossible() ? 'warn' : 'bad', text: ok ? '✓' : p.isPossible() ? 'possible' : '✗' }),
        el('td', { text: p.country ? `${names.of(p.country) || p.country}` : `+${p.countryCallingCode}` }), el('td', { class: 'dim', text: TYPE[p.getType()] || '' }),
        el('td', {}, el('code', { text: p.number })), el('td', { text: p.formatInternational() }), el('td', { text: p.formatNational() }));
    }));
});
