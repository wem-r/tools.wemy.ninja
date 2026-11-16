import jsQR from 'jsqr';
import { $, kv, msg } from '../js/tk.js';
import { dropzone, loadImage } from './lib/files.js';

function describe(t) {
  const rows = [['length', `${t.length} characters`]];
  let m;
  if (/^https?:\/\//i.test(t)) {
    try { const u = new URL(t); rows.push(['type', 'web link — check the domain before opening it'], ['domain', u.hostname], u.hostname.startsWith('xn--') || /xn--/.test(u.hostname) ? ['warning', 'internationalised domain (punycode): may imitate another site'] : null); }
    catch { rows.push(['type', 'malformed link']); }
  } else if ((m = t.match(/^WIFI:(.*)/i))) {
    const kvp = Object.fromEntries([...m[1].matchAll(/([TSPH]):((?:\\.|[^;])*);/g)].map((x) => [x[1], x[2].replace(/\\(.)/g, '$1')]));
    rows.push(['type', 'Wi-Fi network'], ['SSID', kvp.S || ''], ['security', kvp.T || 'none'], ['password', kvp.P || ''], kvp.H === 'true' ? ['hidden', 'yes'] : null);
  } else if (/^otpauth:\/\//i.test(t)) {
    const u = new URL(t);
    rows.push(['type', `2FA secret (${u.host.toUpperCase()}) — treat it like a password`], ['account', decodeURIComponent(u.pathname.slice(1))], ['issuer', u.searchParams.get('issuer') || ''], ['algorithm', u.searchParams.get('algorithm') || 'SHA1'], ['digits', u.searchParams.get('digits') || '6']);
  } else if (/^BEGIN:VCARD/i.test(t)) rows.push(['type', 'contact card (vCard)']);
  else if (/^BEGIN:VEVENT|^BEGIN:VCALENDAR/i.test(t)) rows.push(['type', 'calendar event']);
  else if (/^(mailto|tel|sms|smsto|geo|bitcoin|ethereum|upi|matmsg):/i.test(t)) rows.push(['type', `${t.split(':')[0].toLowerCase()} link`]);
  else rows.push(['type', 'text']);
  return rows;
}

function decode(data, w, h) {
  const r = jsQR(data, w, h, { inversionAttempts: 'attemptBoth' });
  if (!r) return false;
  $('#res').hidden = false;
  $('#out').textContent = r.data;
  kv($('#kv'), describe(r.data));
  msg($('#msg'), 'decoded', 'ok');
  return true;
}

dropzone($('#drop'), async ([f]) => {
  try {
    const { ctx, w, h } = await loadImage(f, 2000);
    if (!decode(ctx.getImageData(0, 0, w, h).data, w, h)) { $('#res').hidden = true; msg($('#msg'), 'no QR code found — try a sharper or tighter crop'); }
  } catch (e) { msg($('#msg'), `cannot read this image: ${e.message}`); }
}, { paste: true });

let stream = null;
$('#cam').addEventListener('click', async () => {
  const v = $('#video');
  if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; v.hidden = true; $('#cam').textContent = 'use the camera'; return; }
  try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); }
  catch (e) { msg($('#msg'), `camera not available: ${e.message}`); return; }
  v.srcObject = stream; v.hidden = false; await v.play(); $('#cam').textContent = 'stop the camera';
  msg($('#msg'), 'point the camera at a QR code — the video stays on this device', 'warn');
  const c = document.createElement('canvas'), ctx = c.getContext('2d', { willReadFrequently: true });
  const tick = () => {
    if (!stream) return;
    if (v.videoWidth) {
      c.width = v.videoWidth; c.height = v.videoHeight; ctx.drawImage(v, 0, 0);
      if (decode(ctx.getImageData(0, 0, c.width, c.height).data, c.width, c.height)) { $('#cam').click(); return; }
    }
    requestAnimationFrame(tick);
  };
  tick();
});
