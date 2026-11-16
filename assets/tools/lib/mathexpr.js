// Safe expression evaluator for the math tool: tokenizer + precedence climbing, no eval.
const FN = {
  sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs, exp: Math.exp, ln: Math.log, log: Math.log10, log2: Math.log2, log10: Math.log10,
  sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan, atan2: Math.atan2,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, floor: Math.floor, ceil: Math.ceil,
  round: (x, n = 0) => { const f = 10 ** n; return Math.round(x * f) / f; }, min: Math.min, max: Math.max, hypot: Math.hypot,
  deg: (x) => (x * 180) / Math.PI, rad: (x) => (x * Math.PI) / 180,
};
export const CONST = { pi: Math.PI, e: Math.E, tau: 2 * Math.PI, phi: (1 + Math.sqrt(5)) / 2 };
const fact = (n) => { if (n < 0 || !Number.isInteger(n)) throw new Error('n! needs a whole number ≥ 0'); if (n > 170) return Infinity; let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };

function tokens(s) {
  const t = [], re = /\s*(?:(\d+\.?\d*(?:e[+-]?\d+)?|\.\d+(?:e[+-]?\d+)?)|([A-Za-z_]\w*)|(\*\*|[-+*/^%!(),×÷−]))/gy;
  let m;
  while (re.lastIndex < s.length) {
    const at = re.lastIndex; m = re.exec(s);
    if (!m) { if (/^\s*$/.test(s.slice(at))) break; throw new Error(`unexpected "${s.slice(at).trim()[0]}"`); }
    if (m[1] !== undefined) t.push({ n: parseFloat(m[1]) });
    else if (m[2]) t.push({ id: m[2] });
    else t.push({ op: ({ '**': '^', '×': '*', '÷': '/', '−': '-' })[m[3]] || m[3] });
  }
  return t;
}
export function evaluate(src, vars = {}) {
  const t = tokens(src); let i = 0;
  const peek = () => t[i], isOp = (o) => t[i]?.op === o, eat = (o) => { if (!isOp(o)) throw new Error(`expected "${o}"`); i++; };
  const BIN = { '+': [1, (a, b) => a + b], '-': [1, (a, b) => a - b], '*': [2, (a, b) => a * b], '/': [2, (a, b) => a / b], '%': [2, (a, b) => a % b], '^': [4, (a, b) => a ** b] };
  function primary() {
    const k = peek(); if (!k) throw new Error('unexpected end');
    let v;
    if (k.n !== undefined) { i++; v = k.n; }
    else if (k.op === '(') { i++; v = expr(0); eat(')'); }
    else if (k.op === '-' || k.op === '+') { i++; const x = expr(3); v = k.op === '-' ? -x : x; return v; }
    else if (k.id) {
      i++; const name = k.id.toLowerCase();
      if (isOp('(')) {
        if (!Object.hasOwn(FN, name)) throw new Error(`unknown function ${k.id}`);
        i++; const args = []; if (!isOp(')')) { args.push(expr(0)); while (isOp(',')) { i++; args.push(expr(0)); } } eat(')');
        v = FN[name](...args);
      } else if (Object.hasOwn(vars, k.id)) v = vars[k.id];
      else if (Object.hasOwn(CONST, name)) v = CONST[name];
      else throw new Error(`unknown name ${k.id}`);
    } else throw new Error(`unexpected "${k.op}"`);
    while (isOp('!')) { i++; v = fact(v); }
    // implicit multiplication: 2pi, 3(4), 2 sqrt(2)
    if (peek() && (peek().id || peek().op === '(' || peek().n !== undefined) && !(peek().n !== undefined && k.n !== undefined)) return v * expr(3);
    return v;
  }
  function expr(min) {
    let a = primary();
    for (;;) {
      const o = peek()?.op; if (!o || !BIN[o]) break;
      const [p, f] = BIN[o]; if (p < min) break;
      i++; const b = expr(o === '^' ? p : p + 1); a = f(a, b);
    }
    return a;
  }
  const v = expr(0); if (i < t.length) throw new Error(`unexpected "${t[i].op ?? t[i].id ?? t[i].n}"`);
  return v;
}
/** Run a block of lines: "x = expr" assigns, "ans" is the previous result. Returns [{src, name, value, error}] */
export function runLines(text) {
  const vars = {}, out = [];
  for (const raw of text.split('\n')) {
    const line = raw.replace(/#.*$/, '').trim(); if (!line) continue;
    const m = line.match(/^([A-Za-z_]\w*)\s*=(?!=)\s*(.+)$/);
    try {
      const v = evaluate(m ? m[2] : line, vars);
      if (m) vars[m[1]] = v; vars.ans = v;
      out.push({ src: line, name: m?.[1], value: v });
    } catch (e) { out.push({ src: line, error: e.message }); }
  }
  return out;
}
