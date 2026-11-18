// Lightweight password-strength estimate (a compact, zxcvbn-flavoured heuristic). Pure.
import { human } from './cracktime.js';

const COMMON = new Set(['password', 'password1', '123456', '12345678', '123456789', 'qwerty', 'azerty', 'letmein', 'welcome', 'admin', 'root', 'iloveyou', 'monkey', 'dragon', 'football', 'abc123', 'passw0rd', 'p@ssw0rd', 'changeme', 'secret', 'summer', 'winter', 'master', 'superman', 'trustno1', 'hello', 'login']);
const KEYBOARD = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm', 'azertyuiop', 'qwerty', '1234567890', 'qwertz'];

function pools(pw) {
  let n = 0;
  if (/[a-z]/.test(pw)) n += 26;
  if (/[A-Z]/.test(pw)) n += 26;
  if (/[0-9]/.test(pw)) n += 10;
  if (/[^a-zA-Z0-9]/.test(pw)) n += 33;
  return n || 1;
}
function hasSequence(pw) {
  const l = pw.toLowerCase();
  for (const row of KEYBOARD) for (let i = 0; i + 3 <= row.length; i++) if (l.includes(row.slice(i, i + 4))) return true;
  for (let i = 0; i + 3 <= l.length; i++) {
    const a = l.charCodeAt(i), b = l.charCodeAt(i + 1), c = l.charCodeAt(i + 2), d = l.charCodeAt(i + 3);
    if (b - a === 1 && c - b === 1 && d - c === 1) return true;
    if (a - b === 1 && b - c === 1 && c - d === 1) return true;
  }
  return false;
}
const base = (pw) => pw.toLowerCase().replace(/[0-9!@#$%^&*._-]+$/,'').replace(/[4@]/g,'a').replace(/[3]/g,'e').replace(/[1!]/g,'i').replace(/[0]/g,'o').replace(/[$5]/g,'s');

export function strength(pw) {
  if (!pw) return { score: 0, bits: 0, guesses: 0, crack: '—', feedback: ['type a password'] };
  const fb = [];
  let bits = pw.length * Math.log2(pools(pw));
  const lower = pw.toLowerCase();
  if (COMMON.has(lower) || COMMON.has(base(pw))) { bits = Math.min(bits, 8); fb.push('this is a very common password / a trivial variation of one'); }
  if (/^(.)\1+$/.test(pw)) { bits = Math.min(bits, 6); fb.push('all one repeated character'); }
  if (/^\d+$/.test(pw)) { bits = Math.min(bits, pw.length * 3.3); fb.push('digits only — tries all numbers fast'); }
  if (hasSequence(pw)) { bits -= 12; fb.push('contains a keyboard or alphabet/number sequence'); }
  if (/(.{2,})\1/.test(pw)) { bits -= 8; fb.push('contains a repeated block'); }
  if (/(19|20)\d\d/.test(pw)) { bits -= 6; fb.push('contains a year'); }
  bits = Math.max(1, bits);
  const guesses = Math.pow(2, bits);
  const score = bits < 28 ? 0 : bits < 40 ? 1 : bits < 60 ? 2 : bits < 80 ? 3 : 4;
  if (score >= 3 && !fb.length) fb.push('looks strong — longer is always better');
  if (pw.length < 12) fb.push('aim for at least 12–16 characters');
  if (!/[^a-zA-Z0-9]/.test(pw)) fb.push('add a symbol to widen the character set');
  return { score, bits: Math.round(bits), guesses, crack: human(guesses / 2 / 1e11), feedback: [...new Set(fb)] };
}
export const LABELS = ['very weak', 'weak', 'fair', 'strong', 'very strong'];
