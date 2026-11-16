// One-page viewer on a .tk-stage: render page n to fit the width, convert pointer → page points.
import { $ } from '../../js/tk.js';
import { render } from './pdf.js';

export function viewer(js, { stage = $('#stage'), canvas = $('#cv'), label = $('#pn'), onShow = () => {} } = {}) {
  const v = { n: 1, scale: 1, w: 0, h: 0 };
  v.show = async (n = v.n) => {
    v.n = Math.max(1, Math.min(js.numPages, n));
    const page = await js.getPage(v.n), vp = page.getViewport({ scale: 1 });
    v.w = vp.width; v.h = vp.height;
    v.scale = Math.min(1.3, (stage.parentElement.clientWidth - 4) / v.w);
    const dpr = window.devicePixelRatio || 1;
    await render(page, v.scale * dpr, { canvas });
    canvas.style.width = `${v.w * v.scale}px`;
    if (label) label.textContent = ` page ${v.n} / ${js.numPages} `;
    onShow(v);
  };
  /** Pointer event → [x, y] in page points, origin top-left of the displayed page. */
  v.pt = (e) => { const r = canvas.getBoundingClientRect(); return [Math.max(0, Math.min(v.w, (e.clientX - r.left) / v.scale)), Math.max(0, Math.min(v.h, (e.clientY - r.top) / v.scale))]; };
  $('#prev')?.addEventListener('click', () => v.show(v.n - 1));
  $('#next')?.addEventListener('click', () => v.show(v.n + 1));
  window.addEventListener('resize', () => v.show());
  return v;
}

/** Make an absolutely positioned element on the stage draggable; onMove(dx, dy) in page points. */
export function draggable(elm, v, onMove) {
  let s = null;
  elm.addEventListener('pointerdown', (e) => { if (e.target.classList.contains('x')) return; e.stopPropagation(); elm.setPointerCapture(e.pointerId); s = [e.clientX, e.clientY]; });
  elm.addEventListener('pointermove', (e) => { if (!s) return; onMove((e.clientX - s[0]) / v.scale, (e.clientY - s[1]) / v.scale); s = [e.clientX, e.clientY]; });
  elm.addEventListener('pointerup', () => { s = null; });
}
