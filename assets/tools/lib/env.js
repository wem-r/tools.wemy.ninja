// .env parser (dotenv / docker compose rules, without command substitution). Pure.

/** Returns { vars: [{ key, value, line, quote }], errors: [{ line, msg }], dupes: Set } */
export function parseEnv(text, { expand = true } = {}) {
  const vars = [], errors = [], seen = new Map(), dupes = new Set();
  const lines = String(text).replace(/\r\n?/g, '\n').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const ln = i + 1;
    let s = lines[i];
    if (/^\s*(#|$)/.test(s)) continue;
    s = s.replace(/^\s*export\s+/, '');
    const m = s.match(/^\s*([A-Za-z_][A-Za-z0-9_.-]*)\s*=\s?(.*)$/);
    if (!m) { errors.push({ line: ln, msg: /=/.test(s) ? 'invalid variable name' : 'missing "="' }); continue; }
    const key = m[1];
    let raw = m[2].replace(/^\s+/, ''), value, quote = '';
    const q = raw[0];
    if (q === '"' || q === "'" || q === '`') {
      quote = q;
      let body = raw.slice(1), end = findClose(body, q);
      while (end < 0 && i + 1 < lines.length) { body += '\n' + lines[++i]; end = findClose(body, q); }
      if (end < 0) { errors.push({ line: ln, msg: `unclosed ${q}` }); continue; }
      value = body.slice(0, end);
      const rest = body.slice(end + 1).trim();
      if (rest && !rest.startsWith('#')) errors.push({ line: ln, msg: 'text after the closing quote' });
      if (q === '"') value = value.replace(/\\([nrt"\\$])/g, (_, c) => ({ n: '\n', r: '\r', t: '\t' }[c] ?? c));
    } else {
      value = raw.replace(/\s+#.*$/, '').trim();
    }
    if (expand && quote !== "'") value = value.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)(?::?-([^}]*))?\}|\$([A-Za-z_][A-Za-z0-9_]*)/g,
      (all, a, def, b) => { const k = a || b; return seen.has(k) ? seen.get(k) : def ?? ''; });
    if (seen.has(key)) dupes.add(key);
    seen.set(key, value);
    vars.push({ key, value, line: ln, quote });
  }
  return { vars, errors, dupes };
}
function findClose(s, q) {
  for (let i = 0; i < s.length; i++) { if (s[i] === '\\' && q === '"') { i++; continue; } if (s[i] === q) return i; }
  return -1;
}

export const SECRETISH = /(pass(word)?|secret|token|api[_-]?key|private|credential|auth|salt|dsn)/i;
