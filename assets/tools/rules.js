import { $, $$, live, pick } from '../js/tk.js';
import { sigma, yara } from './lib/rules.js';

function render() {
  const type = pick('type');
  $('#sigma-f').hidden = type !== 'sigma'; $('#yara-f').hidden = type === 'sigma';
  $('#outl').textContent = type === 'sigma' ? 'Sigma rule (YAML)' : 'YARA rule';
  if (type === 'sigma') {
    $('#out').value = sigma({ title: $('#s-title').value, mitre: $('#s-mitre').value, level: $('#s-level').value, logsource: $('#s-ls').value, product: $('#s-prod').value, fields: $('#s-fields').value,
      tactic: 'execution' });
  } else {
    $('#out').value = yara({ name: $('#y-name').value, desc: $('#y-desc').value, strings: $('#y-strings').value, hashes: $('#y-hashes').value });
  }
}
live([$('#s-title'), $('#s-mitre'), $('#s-level'), $('#s-ls'), $('#s-prod'), $('#s-fields'), $('#y-name'), $('#y-desc'), $('#y-strings'), $('#y-hashes'), ...$$('#type input')], render);
