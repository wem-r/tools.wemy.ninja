// hashcat / John command helper: a searchable mode table and a command builder.

// [hashcat -m, name, hashcat example, john --format]  (common subset)
export const MODES = [
  [0, 'MD5', '8743b52063cd84097a65d1633f5c74f5', 'raw-md5'],
  [100, 'SHA1', 'b89eaac7e61417341b710b727768294d0e6a277b', 'raw-sha1'],
  [1300, 'SHA2-224', '', 'raw-sha224'],
  [1400, 'SHA2-256', '127e6fbfe24a750e72930c220a8e138275656b8e5d8f48a98c3c92df2caba935', 'raw-sha256'],
  [10800, 'SHA2-384', '', 'raw-sha384'],
  [1700, 'SHA2-512', '82a9dda829eb7f8ffe9fbe49e45d47d2dad9664fbb7adf72492e3c81ebd3e29134d9bc12212bf83c6840f10e8246b9db54a4859b7ccd0123d86e5872c1e5082f', 'raw-sha512'],
  [17600, 'SHA3-512', '', 'raw-sha3'],
  [900, 'MD4', '', 'raw-md4'],
  [1000, 'NTLM', 'b4b9b02e6f09a9bd760f388b67351e2b', 'nt'],
  [3000, 'LM', '299bd128c1101fd6', 'lm'],
  [5500, 'NetNTLMv1', '', 'netntlm'],
  [5600, 'NetNTLMv2', '', 'netntlmv2'],
  [1100, 'Domain Cached Credentials (DCC, MS Cache)', '', 'mscash'],
  [2100, 'Domain Cached Credentials 2 (DCC2, MS Cache 2)', '', 'mscash2'],
  [13100, 'Kerberos 5 TGS-REP etype 23 (Kerberoast)', '', 'krb5tgs'],
  [18200, 'Kerberos 5 AS-REP etype 23 (AS-REP roast)', '', 'krb5asrep'],
  [19600, 'Kerberos 5 TGS-REP etype 17 (AES128)', '', 'krb5tgs'],
  [19700, 'Kerberos 5 TGS-REP etype 18 (AES256)', '', 'krb5tgs'],
  [500, 'md5crypt, MD5 (Unix) $1$', '$1$28772684$iEwNOgGugqO9.bIz5sk8k/', 'md5crypt'],
  [400, "phpass (WordPress, Joomla, phpBB3)", '$P$984478476IagS59wHZvyQMArzfx58u.', 'phpass'],
  [1800, 'sha512crypt $6$ (Unix)', '$6$52450745$k5ka2p8bFuSmoVT1tzOyyuaREkkKBcCNqoDKzYiJL9RaE8yMnPgh2XzzF0NDrUhgrcLwg78xs1w5pJiypEdFX/', 'sha512crypt'],
  [7400, 'sha256crypt $5$ (Unix)', '', 'sha256crypt'],
  [3200, 'bcrypt $2*$ (Blowfish)', '$2a$05$LhayLxezLhK1LhWvKxCyLOj0j1u.Kj0jZ0pEmm134uzrQlFvQJLF6', 'bcrypt'],
  [1600, 'Apache $apr1$ MD5, md5apr1', '$apr1$71850310$gh9m4xcAn3MGxogwX/ztb.', 'md5crypt'],
  [160, 'HMAC-SHA1 (key = $salt)', '', 'hmac-sha1'],
  [1450, 'HMAC-SHA256 (key = $salt)', '', 'hmac-sha256'],
  [10, 'md5($pass.$salt)', '', 'dynamic_1'],
  [20, 'md5($salt.$pass)', '', 'dynamic_4'],
  [110, 'sha1($pass.$salt)', '', 'dynamic_24'],
  [1410, 'sha256($pass.$salt)', '', ''],
  [1710, 'sha512($pass.$salt)', '', ''],
  [22000, 'WPA-PBKDF2-PMKID+EAPOL', '', 'wpapsk'],
  [16800, 'WPA-PMKID-PBKDF2', '', 'wpapsk-pmk'],
  [11300, 'Bitcoin / Litecoin wallet.dat', '', 'bitcoin'],
  [13400, 'KeePass 1/2 (AES/Twofish)', '', 'keepass'],
  [9400, 'MS Office 2007', '', 'office'],
  [9500, 'MS Office 2010', '', 'office'],
  [9600, 'MS Office 2013', '', 'office2013'],
  [10400, 'PDF 1.1–1.3 (Acrobat 2–4)', '', 'pdf'],
  [10500, 'PDF 1.4–1.6 (Acrobat 5–8)', '', 'pdf'],
  [10700, 'PDF 1.7 L8 (Acrobat 10–11)', '', 'pdf'],
  [13000, 'RAR5', '', 'rar5'],
  [12500, 'RAR3-hp', '', 'rar'],
  [17200, '7-Zip', '', '7z'],
  [13600, 'WinZip', '', 'zip'],
  [6211, 'TrueCrypt', '', 'truecrypt'],
  [29600, 'Terraform tfstate', '', ''],
  [12, 'PostgreSQL', '', 'postgres'],
  [131, 'MSSQL 2000', '', 'mssql'],
  [132, 'MSSQL 2005', '', 'mssql05'],
  [1731, 'MSSQL 2012/2014', '', 'mssql12'],
  [300, 'MySQL4.1/MySQL5', '', 'mysql-sha1'],
  [200, 'MySQL323', '', 'mysql'],
  [112, 'Oracle S: Type (Oracle 11+)', '', 'oracle11'],
  [3100, 'Oracle H: Type (Oracle 7+)', '', 'oracle'],
  [141, 'Episerver 6.x < .NET 4', '', ''],
  [2611, 'vBulletin < 3.8.5', '', ''],
  [21, 'Joomla < 2.5.18', '', ''],
  [124, 'Django (SHA-1)', '', 'django'],
  [10000, 'Django (PBKDF2-SHA256)', '', 'django'],
  [7900, 'Drupal7', '', 'drupal7'],
  [101, 'nsldap, SHA-1(Base64), Netscape LDAP SHA', '', 'nsldap'],
  [111, 'nsldaps, SSHA-1(Base64), Netscape LDAP SSHA', '', 'nsldaps'],
  [1711, 'SSHA-512(Base64), LDAP {SSHA512}', '', 'ssha512'],
];

export const ATTACKS = [
  [0, 'Straight — wordlist', 'word'],
  [1, 'Combinator — two wordlists', 'combo'],
  [3, 'Brute-force — mask', 'mask'],
  [6, 'Hybrid — wordlist + mask', 'hybrid1'],
  [7, 'Hybrid — mask + wordlist', 'hybrid2'],
];

export const MASKS = [
  ['?l', 'abcdefghijklmnopqrstuvwxyz'],
  ['?u', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'],
  ['?d', '0123456789'],
  ['?s', '«space»!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~'],
  ['?a', '?l?u?d?s (all printable ASCII)'],
  ['?b', '0x00–0xff (all bytes)'],
  ['?h', '0123456789abcdef'],
  ['?H', '0123456789ABCDEF'],
];

export const RULES = ['', 'rockyou-30000.rule', 'best64.rule', 'd3ad0ne.rule', 'dive.rule', 'OneRuleToRuleThemAll.rule', 'toggles5.rule', 'leetspeak.rule'];

export function hashcat(o) {
  const p = ['hashcat', '-m', String(o.mode ?? 0), '-a', String(o.attack ?? 0), o.hashfile || 'hashes.txt'];
  const a = +o.attack;
  if (a === 0) { p.push(o.dict || '/usr/share/wordlists/rockyou.txt'); if (o.rule) p.push('-r', 'rules/' + o.rule); }
  else if (a === 1) p.push(o.dict || 'words1.txt', o.dict2 || 'words2.txt');
  else if (a === 3) p.push(o.mask || '?a?a?a?a?a?a');
  else if (a === 6) p.push(o.dict || 'rockyou.txt', o.mask || '?d?d?d?d');
  else if (a === 7) p.push(o.mask || '?d?d?d?d', o.dict || 'rockyou.txt');
  if (o.optimized) p.push('-O');
  if (o.workload) p.push('-w', String(o.workload));
  if (o.user) p.push('--username');
  if (o.pot) p.push('--potfile-path', o.pot);
  if (o.show) p.push('--show');
  return p.join(' ');
}

export function john(o) {
  const m = MODES.find((x) => x[0] === +o.mode);
  const p = ['john'];
  if (m && m[3]) p.push(`--format=${m[3]}`);
  const a = +o.attack;
  if (a === 3) p.push('--mask=' + (o.mask || '?a?a?a?a?a?a'));
  else { p.push('--wordlist=' + (o.dict || '/usr/share/wordlists/rockyou.txt')); if (o.rule) p.push('--rules=Jumbo'); }
  if (o.user === false) p.push('');
  p.push(o.hashfile || 'hashes.txt');
  return p.filter(Boolean).join(' ');
}
