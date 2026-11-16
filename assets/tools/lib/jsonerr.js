// Find where JSON text first goes wrong (browsers' JSON.parse messages don't all give a position). Pure.
/** Returns { pos, line, col, msg } for the first error, or null if the text is valid JSON. */
export function jsonError(t) {
  let i = 0;
  const fail = (msg) => { throw { pos: i, msg }; };
  const ws = () => { while (/[ \t\n\r]/.test(t[i] ?? '')) i++; };
  const lit = (w) => { if (t.startsWith(w, i)) i += w.length; else fail(`unexpected ${t[i] ? `"${t[i]}"` : 'end of input'}`); };
  const str = () => {
    i++;
    for (;;) {
      const c = t[i];
      if (c === undefined) fail('unterminated string');
      if (c === '"') { i++; return; }
      if (c < ' ') fail('control character in a string (escape it, e.g. \\n)');
      if (c === '\\') {
        const e = t[i + 1];
        if (e === 'u') { if (!/^[0-9a-fA-F]{4}$/.test(t.slice(i + 2, i + 6))) { i++; fail('bad \\u escape'); } i += 6; continue; }
        if (!'"\\/bfnrt'.includes(e ?? '')) { i++; fail(`bad escape \\${e ?? ''}`); }
        i += 2; continue;
      }
      i++;
    }
  };
  const num = () => {
    const m = t.slice(i).match(/^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/);
    if (!m) fail('bad number');
    i += m[0].length;
  };
  const val = () => {
    ws();
    const c = t[i];
    if (c === '{') {
      i++; ws();
      if (t[i] === '}') { i++; return; }
      for (;;) {
        ws(); if (t[i] !== '"') fail(t[i] === '}' ? 'trailing comma before }' : t[i] === "'" ? 'keys need double quotes' : 'expected a "key"');
        str(); ws(); if (t[i] !== ':') fail('expected ":" after the key'); i++;
        val(); ws();
        if (t[i] === ',') { i++; continue; }
        if (t[i] === '}') { i++; return; }
        fail('expected "," or "}"');
      }
    }
    if (c === '[') {
      i++; ws();
      if (t[i] === ']') { i++; return; }
      for (;;) {
        ws(); if (t[i] === ']') fail('trailing comma before ]');
        val(); ws();
        if (t[i] === ',') { i++; continue; }
        if (t[i] === ']') { i++; return; }
        fail('expected "," or "]"');
      }
    }
    if (c === '"') return str();
    if (c === "'") fail('strings need double quotes');
    if (c === '-' || (c >= '0' && c <= '9')) return num();
    if (c === 't') return lit('true');
    if (c === 'f') return lit('false');
    if (c === 'n') return lit('null');
    fail(c === undefined ? 'unexpected end of input' : `unexpected "${c}"`);
  };
  try {
    val(); ws();
    if (i < t.length) fail(`unexpected "${t[i]}" after the end of the value`);
    return null;
  } catch (e) {
    if (!('pos' in e)) throw e;
    const before = t.slice(0, e.pos).split('\n');
    return { pos: e.pos, line: before.length, col: before.at(-1).length + 1, msg: e.msg };
  }
}
