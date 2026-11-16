import { format } from 'sql-formatter';
import { $, live, msg } from '../js/tk.js';

live([$('#in'), $('#lang'), $('#case'), $('#ind')], () => {
  try { $('#out').value = format($('#in').value, { language: $('#lang').value, keywordCase: $('#case').value, tabWidth: +$('#ind').value || 2 }); msg($('#msg'), ''); }
  catch (e) { msg($('#msg'), e.message.split('\n')[0]); }
});
