// Small RFC 4180 CSV parser (quotes, escaped quotes, newlines in fields). Pure.
export function parseCSV(text, sep) {
  const s = String(text).replace(/^﻿/, '');
  if (!sep) {
    const head = s.slice(0, s.indexOf('\n') >>> 0 || 2000);
    sep = [',', ';', '\t', '|'].sort((a, b) => head.split(b).length - head.split(a).length)[0];
  }
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"') { if (s[i + 1] === '"') { f += '"'; i++; } else q = false; }
      else f += c;
    } else if (c === '"' && f === '') q = true;
    else if (c === sep) { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(f); f = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else f += c;
  }
  if (f !== '' || row.length) { row.push(f); rows.push(row); }
  return { rows, sep };
}
