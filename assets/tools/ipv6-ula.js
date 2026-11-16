import { $, kv } from '../js/tk.js';

$('#go').addEventListener('click', async () => {
  const r = crypto.getRandomValues(new Uint8Array(16)), mac = $('#mac').value.replace(/[^0-9a-f]/gi, '');
  const seed = new Uint8Array([...r, ...new TextEncoder().encode(mac + Date.now())]);
  const h = new Uint8Array(await crypto.subtle.digest('SHA-1', seed)).slice(-5); // 40-bit Global ID
  const hex = [...h].map((x) => x.toString(16).padStart(2, '0')).join('');
  const p = `fd${hex.slice(0, 2)}:${hex.slice(2, 6)}:${hex.slice(6, 10)}`;
  const sub = (n) => `${p}:${n.toString(16).padStart(4, '0')}::/64`;
  kv($('#out'), [['prefix', `${p}::/48`], ['Global ID', hex], ['first subnet', sub(0)], ['second subnet', sub(1)], ['last subnet', sub(0xffff)], ['example address', `${p}:1::1`], ['subnets available', '65 536 × /64']]);
});
$('#go').click();
