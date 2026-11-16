// Hash identifier: which formats a string could be, with hashcat mode and John the Ripper format.
// Only formats that can be told apart by shape; plain hex of a given length lists every common candidate.

const H = (n) => new RegExp(`^[a-f0-9]{${n}}$`, 'i');
const RULES = [
  // [regex, name, hashcat mode, john format, note]
  [/^\$2[abxy]?\$\d{2}\$[./A-Za-z0-9]{53}$/, 'bcrypt', 3200, 'bcrypt'],
  [/^\$argon2(id|i|d)\$v=\d+\$m=\d+,t=\d+,p=\d+\$[A-Za-z0-9+/]+\$[A-Za-z0-9+/]+$/, 'Argon2', 34000, 'argon2'],
  [/^\$y\$[./A-Za-z0-9]+\$[./A-Za-z0-9]+\$[./A-Za-z0-9]{43}$/, 'yescrypt', null, 'crypt', 'default on recent Debian/Ubuntu/Fedora'],
  [/^\$6\$(rounds=\d+\$)?[./A-Za-z0-9]{1,16}\$[./A-Za-z0-9]{86}$/, 'sha512crypt (Unix $6$)', 1800, 'sha512crypt'],
  [/^\$5\$(rounds=\d+\$)?[./A-Za-z0-9]{1,16}\$[./A-Za-z0-9]{43}$/, 'sha256crypt (Unix $5$)', 7400, 'sha256crypt'],
  [/^\$1\$[./A-Za-z0-9]{0,8}\$[./A-Za-z0-9]{22}$/, 'md5crypt (Unix $1$)', 500, 'md5crypt'],
  [/^\$apr1\$[./A-Za-z0-9]{0,8}\$[./A-Za-z0-9]{22}$/, 'Apache apr1 MD5', 1600, 'md5crypt'],
  [/^\$P\$[./A-Za-z0-9]{31}$/, 'phpass (WordPress)', 400, 'phpass'],
  [/^\$H\$[./A-Za-z0-9]{31}$/, 'phpass (phpBB3)', 400, 'phpass'],
  [/^\$wp\$2y\$\d{2}\$[./A-Za-z0-9]{53}$/, 'WordPress ≥ 6.8 (bcrypt of HMAC-SHA384)', null, null],
  [/^pbkdf2_sha256\$\d+\$[^$]+\$[A-Za-z0-9+/=]{44}$/, 'Django PBKDF2-SHA256', 10000, 'django'],
  [/^\$pbkdf2-sha256\$\d+\$[./A-Za-z0-9]+\$[./A-Za-z0-9]{43}$/, 'Passlib PBKDF2-SHA256', 20300, 'pbkdf2-hmac-sha256'],
  [/^\$pbkdf2-sha512\$\d+\$[./A-Za-z0-9]+\$[./A-Za-z0-9]{86}$/, 'Passlib PBKDF2-SHA512', 20200, 'pbkdf2-hmac-sha512'],
  [/^sha1\$[^$]+\$[a-f0-9]{40}$/i, 'Django SHA-1 (legacy)', 124, null],
  [/^\{SSHA\}[A-Za-z0-9+/=]{28,}$/, 'LDAP {SSHA} salted SHA-1', 111, 'salted-sha1'],
  [/^\{SHA\}[A-Za-z0-9+/=]{28}$/, 'LDAP {SHA} SHA-1', 101, 'nsldap'],
  [/^\{SSHA512\}[A-Za-z0-9+/=]{88,}$/, 'LDAP {SSHA512}', 1711, 'ssha512'],
  [/^\*[A-F0-9]{40}$/i, 'MySQL 4.1+ (mysql_native_password)', 300, 'mysql-sha1'],
  [/^\$mysql\$A\$005\*/i, 'MySQL caching_sha2_password', 7401, null],
  [/^0x0100[a-f0-9]{48}$/i, 'MSSQL 2005', 132, 'mssql05'],
  [/^0x0200[a-f0-9]{136}$/i, 'MSSQL 2012+', 1731, 'mssql12'],
  [/^md5[a-f0-9]{32}$/i, 'PostgreSQL MD5', 12, 'postgres'],
  [/^SCRAM-SHA-256\$\d+:[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/, 'PostgreSQL SCRAM-SHA-256', 28600, null],
  [/^[^:]+::[^:]*:[a-f0-9]{16}:[a-f0-9]{32}:[a-f0-9]+$/i, 'NetNTLMv2', 5600, 'netntlmv2'],
  [/^[^:]+::[^:]*:[a-f0-9]{48}:[a-f0-9]{48}:[a-f0-9]{16}$/i, 'NetNTLMv1', 5500, 'netntlm'],
  [/^\$krb5tgs\$23\$/, 'Kerberos 5 TGS-REP etype 23 (Kerberoasting)', 13100, 'krb5tgs'],
  [/^\$krb5tgs\$(17|18)\$/, 'Kerberos 5 TGS-REP AES', '19600 / 19700', 'krb5tgs'],
  [/^\$krb5asrep\$23\$/, 'Kerberos 5 AS-REP etype 23 (AS-REP roasting)', 18200, 'krb5asrep'],
  [/^\$DCC2\$\d+#[^#]+#[a-f0-9]{32}$/i, 'Domain Cached Credentials 2 (mscash2)', 2100, 'mscash2'],
  [/^[a-f0-9]{32}:[a-f0-9]{32}$/i, 'LM:NT pair (pwdump)', '3000 / 1000', 'lm / nt'],
  [/^\$office\$\*20(07|10|13)\*/, 'MS Office 2007+ document', '9400 / 9500 / 9600', 'office'],
  [/^\$pdf\$/, 'PDF document', '10400–10700', 'pdf'],
  [/^\$zip2\$/, 'WinZip AES', 13600, 'zip'],
  [/^\$pkzip2?\$/, 'PKZIP', '17200–17230', 'pkzip'],
  [/^\$7z\$/, '7-Zip', 11600, '7z'],
  [/^\$rar5\$/, 'RAR5', 13000, 'rar5'],
  [/^\$keepass\$\*/, 'KeePass', 13400, 'keepass'],
  [/^\$bitlocker\$/, 'BitLocker', 22100, 'bitlocker'],
  [/^\$ethereum\$[ps]\*/, 'Ethereum wallet', '15600 / 15700', 'ethereum'],
  [/^\$bitcoin\$/, 'Bitcoin/Litecoin wallet.dat', 11300, 'bitcoin'],
  [/^\$ansible\$0\*0\*/, 'Ansible Vault', 16900, 'ansible'],
  [/^eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+$/, 'JWT (HS256/384/512 secret)', 16500, 'HMAC-SHA256'],
  [/^[A-Za-z0-9./]{13}$/, 'DES crypt (Unix, legacy)', 1500, 'descrypt', 'also matches many random strings'],
];
const HEX = [
  [8, [['CRC-32', 11500, 'crc32'], ['Adler-32', null, null], ['FNV-1a 32', null, null]]],
  [16, [['MySQL 3.23 (OLD_PASSWORD)', 200, 'mysql'], ['Half MD5', 5100, null], ['CRC-64', null, null]]],
  [32, [['MD5', 0, 'raw-md5'], ['NTLM', 1000, 'nt'], ['MD4', 900, 'raw-md4'], ['LM', 3000, 'lm'], ['RIPEMD-128', null, null]]],
  [40, [['SHA-1', 100, 'raw-sha1'], ['RIPEMD-160', 6000, 'ripemd-160'], ['MySQL 4.1 without leading *', 300, 'mysql-sha1']]],
  [56, [['SHA-224', 1300, 'raw-sha224'], ['SHA3-224', 17300, 'raw-sha3']]],
  [64, [['SHA-256', 1400, 'raw-sha256'], ['SHA3-256', 17400, 'raw-sha3'], ['Keccak-256', 17800, 'raw-keccak-256'], ['BLAKE2s-256', null, null], ['GOST R 34.11-2012 (256)', 11700, 'gost12-256']]],
  [96, [['SHA-384', 10800, 'raw-sha384'], ['SHA3-384', 17500, 'raw-sha3']]],
  [128, [['SHA-512', 1700, 'raw-sha512'], ['SHA3-512', 17600, 'raw-sha3'], ['BLAKE2b-512', 600, 'raw-blake2'], ['Whirlpool', 6100, 'whirlpool'], ['Keccak-512', 18000, 'raw-keccak']]],
];

/** [{ name, hashcat, john, note }] — most likely first. */
export function identify(input) {
  const s = String(input).trim();
  if (!s) return [];
  const out = [];
  for (const [re, name, hashcat, john, note] of RULES) if (re.test(s)) out.push({ name, hashcat, john, note });
  if (!out.length) {
    const hexLen = s.replace(/^0x/i, '');
    for (const [n, list] of HEX) if (H(n).test(hexLen)) for (const [name, hashcat, john] of list) out.push({ name, hashcat, john });
    if (/^[a-f0-9]+$/i.test(hexLen) && !out.length) out.push({ name: `unknown ${hexLen.length * 4}-bit hex value`, hashcat: null, john: null });
  }
  return out;
}
