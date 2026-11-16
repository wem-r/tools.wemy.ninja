// Preview the first selected page of a modified pdf-lib document on a canvas.
import { openJs, render } from './pdf.js';

export async function preview(doc, canvas, pageIndex = 0, width = 520) {
  const bytes = await doc.save();
  const js = await openJs(bytes);
  const page = await js.getPage(Math.min(js.numPages, pageIndex + 1));
  const vp = page.getViewport({ scale: 1 });
  await render(page, Math.min(1.5, width / vp.width) * (window.devicePixelRatio || 1), { canvas });
  canvas.style.width = `${Math.min(width, vp.width * 1.5)}px`;
  await js.close();
}
