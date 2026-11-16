import QRCode from 'qrcode';
import { $, $$, live, pick, download } from '../js/tk.js';

const esc = (s) => s.replace(/([\;,:"])/g, '\\$1');
const payload = () => {
  const sec = pick('sec'), h = $('#hidden').checked ? 'H:true;' : '';
  return `WIFI:T:${sec};S:${esc($('#ssid').value)};${sec === 'nopass' ? '' : `P:${esc($('#pw').value)};`}${h};`;
};
const draw = () => { const p = payload(); $('#payload').textContent = p; $('#pw').disabled = pick('sec') === 'nopass'; return QRCode.toCanvas($('#cv'), p, { width: 320, margin: 2, errorCorrectionLevel: 'M' }); };
live([$('#ssid'), $('#pw'), $('#hidden'), ...$$('input[name="sec"]')], draw);
$('#png').addEventListener('click', () => $('#cv').toBlob((b) => download(`wifi-${$('#ssid').value || 'network'}.png`, b, 'image/png')));
$('#print').addEventListener('click', () => {
  const w = window.open('', '_blank'); if (!w) return;
  const e = (s) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
  w.document.write(`<!doctype html><meta charset="utf-8"><title>Wi-Fi</title><body style="font-family:sans-serif;text-align:center;padding:40px">
<h2>Wi-Fi</h2><img src="${$('#cv').toDataURL()}" style="width:260px"><p style="font-size:18px"><b>${e($('#ssid').value)}</b></p>
${pick('sec') === 'nopass' ? '<p>open network</p>' : `<p>password: <code style="font-size:18px">${e($('#pw').value)}</code></p>`}<p style="color:#666">scan with your phone camera to join</p>
<script>onload=()=>print()<\/script>`);
  w.document.close();
});
