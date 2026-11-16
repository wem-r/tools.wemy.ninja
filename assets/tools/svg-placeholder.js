import { $, live, download } from '../js/tk.js';

let svg = '';
const x = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
live([$('#w'), $('#h'), $('#bg'), $('#fg'), $('#fs'), $('#txt')], () => {
  const w = Math.max(1, +$('#w').value || 1), h = Math.max(1, +$('#h').value || 1), t = $('#txt').value || `${w} × ${h}`;
  const fs = +$('#fs').value || Math.max(8, Math.round(Math.min(w / Math.max(4, t.length) * 1.4, h / 3)));
  svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="${$('#bg').value}"/><text x="50%" y="50%" fill="${$('#fg').value}" font-family="sans-serif" font-size="${fs}" text-anchor="middle" dominant-baseline="central">${x(t)}</text></svg>`;
  $('#svg').value = svg; $('#uri').value = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  $('#pv').innerHTML = `<img alt="preview" src="${$('#uri').value}" style="max-width:100%;max-height:360px;border-radius:4px">`;
});
$('#dl').addEventListener('click', () => download(`placeholder-${$('#w').value}x${$('#h').value}.svg`, svg, 'image/svg+xml'));
$('#dlpng').addEventListener('click', () => {
  const img = new Image(); img.onload = () => {
    const c = Object.assign(document.createElement('canvas'), { width: +$('#w').value, height: +$('#h').value });
    c.getContext('2d').drawImage(img, 0, 0); c.toBlob((b) => download(`placeholder-${c.width}x${c.height}.png`, b, 'image/png'));
  }; img.src = $('#uri').value;
});
