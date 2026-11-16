import { $, el, msg, download } from '../js/tk.js';

let stream = null, rec = null, chunks = [], t0 = 0, timer = 0;
const stamp = () => new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
const addShot = (blob, name, isVideo) => {
  const url = URL.createObjectURL(blob);
  const media = isVideo ? el('video', { src: url, controls: true, style: 'max-width:100%' }) : el('img', { src: url, alt: name });
  $('#shots').prepend(el('div', { class: 'tk-page' }, media, el('div', { class: 'tk-row' }, el('span', { class: 'dim', text: name }), el('button', { type: 'button', class: 'tk-btn', text: 'save', onclick: () => download(name, blob, blob.type) }))));
};
async function listDevices() {
  const devs = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput'), cur = $('#dev').value;
  $('#dev').replaceChildren(...devs.map((d, i) => el('option', { value: d.deviceId, text: d.label || `camera ${i + 1}` })));
  if (cur) $('#dev').value = cur;
}
async function start() {
  stop();
  try {
    const id = $('#dev').value;
    stream = await navigator.mediaDevices.getUserMedia({ video: id ? { deviceId: { exact: id } } : true, audio: $('#audio').checked });
    $('#v').srcObject = stream; $('#v').hidden = false; await $('#v').play();
    $('#photo').disabled = $('#rec').disabled = false; msg($('#msg'), ''); listDevices();
  } catch (e) { msg($('#msg'), `camera not available: ${e.message}`); }
}
function stop() {
  if (rec && rec.state !== 'inactive') rec.stop();
  stream?.getTracks().forEach((t) => t.stop()); stream = null;
  $('#v').hidden = true; $('#photo').disabled = $('#rec').disabled = true;
}
$('#start').addEventListener('click', start);
$('#dev').addEventListener('change', () => stream && start());
$('#stop').addEventListener('click', stop);
$('#photo').addEventListener('click', () => {
  const v = $('#v'), c = Object.assign(document.createElement('canvas'), { width: v.videoWidth, height: v.videoHeight });
  c.getContext('2d').drawImage(v, 0, 0); c.toBlob((b) => addShot(b, `photo-${stamp()}.png`, false), 'image/png');
});
$('#rec').addEventListener('click', () => {
  if (rec && rec.state === 'recording') { rec.stop(); return; }
  if (typeof MediaRecorder === 'undefined') { msg($('#msg'), 'recording is not supported in this browser'); return; }
  chunks = []; rec = new MediaRecorder(stream);
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.onstop = () => {
    clearInterval(timer); $('#time').textContent = ''; $('#rec').textContent = '⏺ record';
    const type = rec.mimeType || 'video/webm', ext = type.includes('mp4') ? 'mp4' : 'webm';
    if (chunks.length) addShot(new Blob(chunks, { type }), `video-${stamp()}.${ext}`, true);
  };
  rec.start(500); t0 = Date.now(); $('#rec').textContent = '⏹ stop recording';
  timer = setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000); $('#time').textContent = `● ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }, 250);
});
if (!navigator.mediaDevices?.getUserMedia) { msg($('#msg'), 'this browser has no camera access (it needs HTTPS)'); $('#start').disabled = true; }
else listDevices().catch(() => {});
