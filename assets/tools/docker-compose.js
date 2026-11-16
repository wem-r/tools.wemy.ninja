import yaml from 'js-yaml';
import { $, live, msg } from '../js/tk.js';

function words(s) {
  const out = []; let cur = '', q = null, has = false;
  s = s.replace(/\\\r?\n/g, ' ');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === q) q = null; else if (c === '\\' && q === '"' && i + 1 < s.length) cur += s[++i]; else cur += c; continue; }
    if (c === '"' || c === "'") { q = c; has = true; continue; }
    if (c === '\\' && i + 1 < s.length) { cur += s[++i]; has = true; continue; }
    if (/\s/.test(c)) { if (cur || has) out.push(cur); cur = ''; has = false; continue; }
    cur += c; has = true;
  }
  if (cur || has) out.push(cur);
  return out;
}
const FLAGS = new Set(['-d', '--detach', '-i', '-t', '-it', '-ti', '--interactive', '--tty', '--rm', '--privileged', '--read-only', '--init', '-P', '--publish-all', '--no-healthcheck']);
const ALIAS = { '-p': '--publish', '-v': '--volume', '-e': '--env', '-l': '--label', '-m': '--memory', '-h': '--hostname', '-u': '--user', '-w': '--workdir', '--net': '--network' };
function convert(cmd, top) {
  const w = words(cmd.replace(/^\s*(sudo\s+)?docker\s+(container\s+)?run\s+/, ''));
  const s = {}, list = (k, v) => (s[k] ||= []).push(v);
  let i = 0;
  for (; i < w.length; i++) {
    let a = w[i];
    if (!a.startsWith('-')) break;
    let v = null;
    if (a.includes('=') && a.startsWith('--')) [a, v] = [a.slice(0, a.indexOf('=')), a.slice(a.indexOf('=') + 1)];
    a = ALIAS[a] || a;
    if (FLAGS.has(a)) {
      if (/^-(it|ti|i)$|--interactive/.test(a)) s.stdin_open = true;
      if (/^-(it|ti|t)$|--tty/.test(a)) s.tty = true;
      if (a === '--privileged') s.privileged = true; if (a === '--read-only') s.read_only = true; if (a === '--init') s.init = true;
      continue;
    }
    if (v === null) v = w[++i];
    switch (a) {
      case '--name': s.container_name = v; break;
      case '--restart': s.restart = v; break;
      case '--publish': list('ports', v); break;
      case '--expose': list('expose', v); break;
      case '--volume': { list('volumes', v); const src = v.split(':')[0]; if (src && !/^[./~]|^\$/.test(src)) top.volumes[src] = {}; break; }
      case '--mount': list('volumes', Object.fromEntries(v.split(',').map((kv) => { const [k, x = true] = kv.split('='); return [k === 'src' || k === 'source' ? 'source' : k === 'dst' || k === 'destination' ? 'target' : k, x]; }))); break;
      case '--env': list('environment', v); break;
      case '--env-file': list('env_file', v); break;
      case '--network': if (!['host', 'none', 'bridge'].includes(v)) { list('networks', v); top.networks[v] = { external: true }; } else s.network_mode = v; break;
      case '--label': list('labels', v); break;
      case '--memory': s.mem_limit = v; break;
      case '--cpus': s.cpus = Number(v); break;
      case '--hostname': s.hostname = v; break;
      case '--user': s.user = v; break;
      case '--workdir': s.working_dir = v; break;
      case '--entrypoint': s.entrypoint = v; break;
      case '--cap-add': list('cap_add', v); break;
      case '--cap-drop': list('cap_drop', v); break;
      case '--device': list('devices', v); break;
      case '--dns': list('dns', v); break;
      case '--add-host': list('extra_hosts', v); break;
      case '--tmpfs': list('tmpfs', v); break;
      case '--sysctl': (s.sysctls ||= {})[v.split('=')[0]] = v.split('=')[1]; break;
      case '--security-opt': list('security_opt', v); break;
      case '--ulimit': { const [k, x] = v.split('='); const [soft, hard] = x.split(':'); (s.ulimits ||= {})[k] = hard ? { soft: +soft, hard: +hard } : +soft; break; }
      case '--shm-size': s.shm_size = v; break;
      case '--log-driver': (s.logging ||= {}).driver = v; break;
      case '--log-opt': ((s.logging ||= {}).options ||= {})[v.split('=')[0]] = v.split('=')[1]; break;
      case '--health-cmd': (s.healthcheck ||= {}).test = ['CMD-SHELL', v]; break;
      case '--health-interval': (s.healthcheck ||= {}).interval = v; break;
      case '--health-timeout': (s.healthcheck ||= {}).timeout = v; break;
      case '--health-retries': (s.healthcheck ||= {}).retries = +v; break;
      case '--stop-signal': s.stop_signal = v; break;
      case '--stop-timeout': s.stop_grace_period = `${v}s`; break;
      case '--platform': s.platform = v; break;
      case '--pull': s.pull_policy = v; break;
      case '--pid': s.pid = v; break;
      case '--ipc': s.ipc = v; break;
      case '--gpus': s.deploy = { resources: { reservations: { devices: [{ driver: 'nvidia', count: v === 'all' ? 'all' : +v || 1, capabilities: ['gpu'] }] } } }; break;
      default: (s['x-unconverted'] ||= []).push(`${a} ${v ?? ''}`.trim());
    }
  }
  if (i >= w.length) throw new Error('no image name found');
  s.image = w[i];
  if (w.length > i + 1) s.command = w.slice(i + 1);
  const name = (s.container_name || s.image.split('/').pop().split(':')[0]).replace(/[^a-z0-9_-]/gi, '-');
  return [name, { image: s.image, ...Object.fromEntries(Object.entries(s).filter(([k]) => k !== 'image')) }];
}
live($('#in'), () => {
  const cmds = $('#in').value.replace(/\\\r?\n/g, ' ').split('\n').map((l) => l.trim()).filter((l) => /docker\s+(container\s+)?run/.test(l));
  if (!cmds.length) { msg($('#msg'), 'paste a "docker run …" command'); $('#out').value = ''; return; }
  try {
    const top = { volumes: {}, networks: {} }, services = {};
    for (const c of cmds) { const [n, svc] = convert(c, top); let k = n, j = 2; while (services[k]) k = `${n}-${j++}`; services[k] = svc; }
    const doc = { services };
    if (Object.keys(top.volumes).length) doc.volumes = top.volumes;
    if (Object.keys(top.networks).length) doc.networks = top.networks;
    $('#out').value = yaml.dump(doc, { lineWidth: 200, noRefs: true, quotingType: '"' }).replace(/: \{\}$/gm, ':');
    const un = Object.values(services).flatMap((s) => s['x-unconverted'] || []);
    msg($('#msg'), un.length ? `converted — check "x-unconverted": ${un.join(', ')}` : `${cmds.length} service(s)`, un.length ? 'warn' : 'ok');
  } catch (e) { msg($('#msg'), e.message); $('#out').value = ''; }
});
