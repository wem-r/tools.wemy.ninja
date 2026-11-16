import { $, kv, live } from '../js/tk.js';
import { CASES } from './lib/text.js';

live($('#in'), () => {
  const t = $('#in').value;
  kv($('#out'), Object.values(CASES).map(([label, f]) => [label, f(t)]));
});
