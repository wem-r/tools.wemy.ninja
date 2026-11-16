// qpdf compiled to WebAssembly (Apache-2.0, via @neslinesli93/qpdf-wasm). Loaded on first use (~1.3 MB).
import createModule from '@neslinesli93/qpdf-wasm';

let mod = null, sink = null;
async function load() {
  if (mod) return mod;
  // the module binds console.log / console.error once, when it is created: give it wrappers that can be redirected
  const { log: L, error: E } = console;
  console.log = (...a) => (sink ? sink.push(a.join(' ')) : L(...a));
  console.error = (...a) => (sink ? sink.push(a.join(' ')) : E(...a));
  try { mod = await createModule({ locateFile: () => '/vendor/qpdf/qpdf.wasm', noInitialRun: true }); }
  finally { console.log = L; console.error = E; }
  return mod;
}

/**
 * Run qpdf with `args` where "IN" and "OUT" stand for the input and output files.
 * Returns { code, out (Uint8Array|null), log (stdout + stderr lines) }.
 * Exit codes: 0 ok, 2 error, 3 ok with warnings.
 */
export async function qpdf(input, args) {
  const q = await load();
  const id = Math.random().toString(36).slice(2);
  const IN = `/in-${id}.pdf`, OUT = `/out-${id}.pdf`;
  q.FS.writeFile(IN, input);
  const log = [];
  sink = log;
  let code;
  try { code = q.callMain(args.map((a) => (a === 'IN' ? IN : a === 'OUT' ? OUT : a))); }
  catch (e) { code = typeof e?.status === 'number' ? e.status : 2; if (!/exit/i.test(String(e))) log.push(String(e)); }
  finally { sink = null; }
  let out = null;
  try { out = q.FS.readFile(OUT); q.FS.unlink(OUT); } catch { /* no output */ }
  try { q.FS.unlink(IN); } catch { /* ignore */ }
  return { code, out, log: log.map((l) => l.replace(/^this\.program: /, '').replace(/\/(in|out)-[a-z0-9]+\.pdf/g, 'file')).filter(Boolean) };
}
