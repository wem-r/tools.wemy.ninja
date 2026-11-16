// Password strength estimate: character-pool entropy minus penalties for common patterns.
// Honest about what it is: a heuristic, not zxcvbn. Pure.

const COMMON = new Set(('password passw0rd p@ssw0rd 123456 1234567 12345678 123456789 1234567890 qwerty azerty ' +
  'qwertyuiop letmein welcome admin administrator root toor changeme default iloveyou monkey dragon master ' +
  'sunshine princess football baseball shadow superman trustno1 abc123 111111 000000 654321 secret login guest ' +
  'hello freedom whatever michael jennifer qazwsx 1q2w3e4r zaq12wsx starwars computer pokemon soleil bonjour').split(' '));
const KEYROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm', 'azertyuiop', 'qsdfghjklm', 'wxcvbn', '1234567890'];

export function pool(pw) {
  let n = 0;
  if (/[a-z]/.test(pw)) n += 26;
  if (/[A-Z]/.test(pw)) n += 26;
  if (/\d/.test(pw)) n += 10;
  if (/[^A-Za-z0-9]/.test(pw)) n += /[^\x20-\x7e]/.test(pw) ? 100 : 33;
  return n;
}

export function analyse(pw) {
  const chars = [...pw];
  const len = chars.length;
  const issues = [];
  if (!len) return { bits: 0, len: 0, pool: 0, issues, label: 'empty', score: 0 };
  const P = pool(pw);
  let bits = len * Math.log2(P || 1);
  const low = pw.toLowerCase();
  const unleet = (x) => x.replace(/[@4]/g, 'a').replace(/3/g, 'e').replace(/[1!|]/g, 'i').replace(/0/g, 'o').replace(/[$5]/g, 's').replace(/7/g, 't');
  const leet = unleet(low);
  const core = unleet(low.replace(/[\d!?.*_-]+$/, '').replace(/^\d+/, ''));
  if (COMMON.has(low) || COMMON.has(leet) || COMMON.has(core)) { bits = Math.min(bits, 10); issues.push('in the most-used password lists'); }
  if (/(.)\1{2,}/.test(pw)) { bits -= 6; issues.push('repeated characters'); }
  let seq = 0;
  for (let i = 2; i < len; i++) {
    const a = pw.charCodeAt(i - 2), b = pw.charCodeAt(i - 1), c = pw.charCodeAt(i);
    if (b - a === c - b && Math.abs(c - b) === 1) seq++;
  }
  if (seq) { bits -= seq * 3; issues.push('sequences like abc / 123'); }
  for (const row of KEYROWS) for (let i = 0; i + 4 <= row.length; i++) if (low.includes(row.slice(i, i + 4))) { bits -= 8; issues.push('keyboard walk'); i = row.length; }
  if (/(19|20)\d\d/.test(pw)) { bits -= 4; issues.push('looks like a year'); }
  if (/^[A-Z][a-z]+\d{1,4}[!?.]?$/.test(pw)) { bits -= 10; issues.push('Word + digits pattern'); }
  if (len < 8) issues.push('shorter than 8 characters');
  if (new Set(chars).size <= len / 3) { bits -= 5; issues.push('few distinct characters'); }
  bits = Math.max(0, Math.round(bits));
  const [label, score] = bits < 28 ? ['very weak', 1] : bits < 40 ? ['weak', 2] : bits < 60 ? ['fair', 3] : bits < 80 ? ['strong', 4] : ['very strong', 5];
  return { bits, len, pool: P, issues: [...new Set(issues)], label, score };
}

/** Rough time to exhaust half the keyspace at `rate` guesses/s, as text. */
export function crackTime(bits, rate) {
  let s = 2 ** bits / 2 / rate;
  const units = [['seconds', 60], ['minutes', 60], ['hours', 24], ['days', 365.25], ['years', 1000], ['thousand years', 1000], ['million years', 1000], ['billion years', Infinity]];
  if (s < 1) return 'instant';
  for (const [u, k] of units) { if (s < k) return `${s < 10 ? s.toFixed(1) : Math.round(s)} ${u}`; s /= k; }
  return 'longer than the universe';
}
