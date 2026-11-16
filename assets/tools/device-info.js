import { $, kv } from '../js/tk.js';

const n = navigator, s = screen, rows = () => [
  ['user agent', n.userAgent],
  ['platform', n.userAgentData?.platform || n.platform],
  ['languages', (n.languages || [n.language]).join(', ')],
  ['time zone', Intl.DateTimeFormat().resolvedOptions().timeZone],
  ['local time', new Date().toString()],
  ['screen', `${s.width} × ${s.height} (available ${s.availWidth} × ${s.availHeight})`],
  ['window (viewport)', `${innerWidth} × ${innerHeight}`],
  ['pixel ratio', String(devicePixelRatio)],
  ['colour depth', `${s.colorDepth} bit`],
  ['orientation', s.orientation?.type || ''],
  ['colour scheme', matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'],
  ['reduced motion', matchMedia('(prefers-reduced-motion: reduce)').matches ? 'yes' : 'no'],
  ['touch points', String(n.maxTouchPoints ?? 0)],
  ['pointer', matchMedia('(pointer: coarse)').matches ? 'coarse (touch)' : matchMedia('(pointer: fine)').matches ? 'fine (mouse)' : 'none'],
  ['CPU threads', String(n.hardwareConcurrency ?? '')],
  ['memory (rough)', n.deviceMemory ? `≥ ${n.deviceMemory} GB` : ''],
  ['connection', n.connection ? `${n.connection.effectiveType || ''} ${n.connection.downlink ? `~${n.connection.downlink} Mbit/s` : ''}`.trim() : ''],
  ['online', n.onLine ? 'yes' : 'no'],
  ['cookies enabled', n.cookieEnabled ? 'yes' : 'no'],
  ['do not track', n.doNotTrack === '1' ? 'on' : 'off'],
  ['global privacy control', n.globalPrivacyControl ? 'on' : 'off'],
  ['secure context', isSecureContext ? 'yes' : 'no'],
  ['WebGL renderer', (() => { try { const g = document.createElement('canvas').getContext('webgl'), d = g?.getExtension('WEBGL_debug_renderer_info'); return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : g ? g.getParameter(g.RENDERER) : 'none'; } catch { return ''; } })()],
].filter((r) => r[1] !== '');
const draw = () => kv($('#out'), rows());
draw(); addEventListener('resize', draw);
