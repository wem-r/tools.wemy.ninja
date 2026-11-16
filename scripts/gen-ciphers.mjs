// Generates content/en/ciphers/** from the registry. Run after adding a cipher: node --import ./tests/hooks.js scripts/gen-ciphers.mjs
import fs from 'node:fs';
import { CIPHERS, GROUPS } from '../assets/tools/lib/ciphers/index.js';

const root = 'content/en/ciphers';
const q = (s) => JSON.stringify(String(s));
fs.mkdirSync(root, { recursive: true });
fs.writeFileSync(`${root}/_index.md`, `---\ntitle: "Cipher Suite"\ndescription: "${CIPHERS.length} classical ciphers, encodings and analysis tools: encode, decode, and crack the weak ones."\nweight: 11\n---\n`);
const W = { classical: 1, encodings: 2, other: 3 }, D = { classical: 'Substitution, transposition, polygraphic and machine ciphers.', encodings: 'Number bases, codes and text encodings.', other: 'Frequency analysis, crackers, esoteric languages and other helpers.' };
for (const [g, title] of Object.entries(GROUPS)) {
  fs.mkdirSync(`${root}/${g}`, { recursive: true });
  for (const f of fs.readdirSync(`${root}/${g}`)) if (f !== '_index.md') fs.unlinkSync(`${root}/${g}/${f}`);
  fs.writeFileSync(`${root}/${g}/_index.md`, `---\ntitle: "${title}"\ndescription: "${D[g]}"\nweight: ${W[g]}\n---\n`);
}
CIPHERS.forEach((c, i) => {
  fs.writeFileSync(`${root}/${c.group}/${c.id}.md`, `---\ntitle: ${q(c.name)}\ndescription: ${q(c.desc)}\ntool: cipher\ncipher: ${c.id}\ndate: 2026-11-16\nweight: ${i + 1}\ntags: [cipher-suite, ${c.group}]\n---\n`);
});
console.log(`${CIPHERS.length} pages`);
