// Proposed upstream fix, applied to the installed dist so the repro can be re-run against it:
// the lazy local-fallback template exports the live `exportModule` binding as __moduleExports
// (as #1343 did for import: false wrappers) and assigns it on every cache write.
import { readFileSync, writeFileSync } from 'node:fs';

const file = new URL('./node_modules/@module-federation/vite/lib/index.js', import.meta.url);
let code = readFileSync(file, 'utf8');
const start = code.indexOf('function generateLazyWorkspaceSingletonExports(');
const end = code.indexOf('const WORKSPACE_SINGLETON_SSR_LOCAL_SHARE', start);
if (start === -1 || end === -1) throw new Error('lazy template not found');
let lazy = code.slice(start, end);
const before = lazy;
lazy = lazy
  .replace('export { __mf_default as default };${namedExportLine}${mutableExportLine}`;', 'export { __mf_default as default, exportModule as __moduleExports };${namedExportLine}${mutableExportLine}`;')
  .replace('const __mfApplyLazyShareExports = (mod) => {\n      ${assignments}', 'const __mfApplyLazyShareExports = (mod) => {\n      exportModule = mod;\n      ${assignments}');
if (lazy === before) { console.log('already applied'); process.exit(0); }
if (!lazy.includes('exportModule as __moduleExports') || !lazy.includes('exportModule = mod;')) throw new Error('replacement failed');
code = code.slice(0, start) + lazy + code.slice(end);
writeFileSync(file, code);
console.log('patched node_modules/@module-federation/vite/lib/index.js (lazy local-fallback template); run `npm run build && npm run verify`');
