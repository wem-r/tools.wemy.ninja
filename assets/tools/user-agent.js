import UAParser from 'ua-parser-js';
import { $, kv, live } from '../js/tk.js';

const v = (...x) => x.filter(Boolean).join(' ') || '—';
live($('#in'), () => {
  const r = new UAParser($('#in').value.trim()).getResult();
  kv($('#out'), [
    ['browser', v(r.browser.name, r.browser.version)], ['engine', v(r.engine.name, r.engine.version)], ['OS', v(r.os.name, r.os.version)],
    ['device', v(r.device.vendor, r.device.model, r.device.type ? `(${r.device.type})` : r.ua ? '(desktop or unknown)' : '')], ['CPU', v(r.cpu.architecture)],
    /bot|crawl|spider|slurp|curl|wget|python|go-http|java\//i.test(r.ua) && ['note', 'looks like a bot, script or command-line client'],
  ]);
});
$('#mine').addEventListener('click', () => { $('#in').value = navigator.userAgent; $('#in').dispatchEvent(new Event('input')); });
