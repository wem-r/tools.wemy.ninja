import QRCode from 'qrcode';
import { $, live, msg, download } from '../js/tk.js';

const opts = () => ({ errorCorrectionLevel: $('#ec').value, width: Math.min(2000, Math.max(64, +$('#size').value || 320)), margin: Math.max(0, +$('#margin').value || 0), color: { dark: $('#fg').value, light: $('#bg').value } });
live([$('#in'), $('#ec'), $('#size'), $('#margin'), $('#fg'), $('#bg')], () => {
  const t = $('#in').value; if (!t) { msg($('#msg'), 'type something to encode', 'warn'); return; }
  QRCode.toCanvas($('#cv'), t, opts()).then(() => msg($('#msg'), `${new TextEncoder().encode(t).length} bytes`, 'ok')).catch((e) => msg($('#msg'), e.message));
});
$('#png').addEventListener('click', () => $('#cv').toBlob((b) => download('qr-code.png', b, 'image/png')));
$('#svg').addEventListener('click', async () => download('qr-code.svg', await QRCode.toString($('#in').value, { ...opts(), type: 'svg' }), 'image/svg+xml'));
