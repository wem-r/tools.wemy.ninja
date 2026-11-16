// Node test helper: some npm packages (js-cvss) ship ESM with extension-less relative imports,
// which bundlers accept but Node does not. Retry those with ".js".
import { register } from 'node:module';
register('data:text/javascript,' + encodeURIComponent(`
export async function resolve(spec, ctx, next) {
  try { return await next(spec, ctx); }
  catch (e) { if (e.code === 'ERR_MODULE_NOT_FOUND' && /^\\.\\.?\\//.test(spec) && !/\\.[cm]?js$/.test(spec)) return next(spec + '.js', ctx); throw e; }
}`));
