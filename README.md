# CommonJS `require()` of a lazily seeded share reads `undefined`

Minimal reproduction for `@module-federation/vite` 1.23.3 with Vite 7.3.6 (Rollup + `@rollup/plugin-commonjs`), Node 24.

A production build of a container with exposes gives every local-fallback share the lazy wrapper template (`generateLazyWorkspaceSingletonExports`). That template exports no `__moduleExports`, so the plugin's `load()` hook appends `export const __moduleExports = exportModule;`, and a CommonJS `require()` of the share resolves to that export through `<wrapper>?commonjs-proxy`. The const is a snapshot taken when the wrapper evaluates. On a cache miss `exportModule` is `undefined` and is only reassigned inside `initPromise.then(...)`, so CommonJS consumers keep `undefined` forever while ESM consumers read the live `__mf_default` binding and work. Same class as #1341, which #1343 fixed for the `import: false` template only.

The wrapper evaluates cold when another share in the same seed batch has a prebuild chunk that statically imports the merged `__loadShare__shared` chunk: here `packages/react-user` imports `react` without declaring it, so it seeds in batch 0 next to `lodash`, and its (tiny) prebuild chunk evaluates the merged chunk before lodash's prebuild has arrived.

## Steps

```sh
npm install
npm run build
npm run verify   # serves dist/ three ways and reads the page through an installed Chrome (playwright-core, channel "chrome")
```

`npm run verify` runs three scenarios: no delay, the lodash prebuild chunk held back 1500ms, and a control where the merged loadShare chunk is held back 1500ms instead (lodash is then cached before the wrapper evaluates). Without Google Chrome installed run `npx playwright install chromium` first. `npm run serve -- --delay prebuild__lodash__prebuild=1500` serves the same thing for a normal browser on http://127.0.0.1:4173/.

## Expected

`cjsRequireLodash` is `{"a":2,"b":4}` in every scenario, like `esmLodashDefault` is `"function"` in every scenario.

## Actual

```
## no delay
result: {"esmLodashDefault":"function","cjsRequireLodash":null,"error":"TypeError: Cannot read properties of undefined (reading 'transform')"}

## lodash prebuild +1500ms
result: {"esmLodashDefault":"function","cjsRequireLodash":null,"error":"TypeError: Cannot read properties of undefined (reading 'transform')"}

## control: merged loadShare chunk +1500ms
result: {"esmLodashDefault":"function","cjsRequireLodash":"{\"a\":2,\"b\":4}","error":null}
```

Generated wrapper in `dist/assets/*__loadShare__shared-*.js` (build has `minify: false`):

```js
__mfSubscribeSharedCache(__mfModuleCache$1.share, { "canonical": "default:lodash@4.17.21" }, __mfApplyLazyShareExports$1);
let exportModule$1 = __mfReadSharedCache(__mfModuleCache$1.share, { "canonical": "default:lodash@4.17.21", "aliases": ["lodash@4.17.21"] });
if (exportModule$1 === void 0) {
  {
    __mfTrackPendingShareLoad$1(initPromise$1.then(() => {
      exportModule$1 = __mfReadSharedCache(__mfModuleCache$1.share, { "canonical": "default:lodash@4.17.21", "aliases": ["lodash@4.17.21"] });
      ...
    }));
  }
} else {
  __mfApplyLazyShareExports$1(exportModule$1);
}
const __moduleExports = exportModule$1;
```

Consumer chunk `dist/assets/bootstrap-*.js`:

```js
import { d as __moduleExports, e as __mf_0, f as __mf_1, g as __mf_default } from "./_virtual_mf___mfe_internal__demo_remote__mf_owner__..._loadShare__shared-*.js";
...
var lodash_1 = __importDefault(__moduleExports);
```

## Proposed fix

`npm run fix` patches the installed `lib/index.js` the way #1343 patched the `import: false` template: `generateLazyWorkspaceSingletonExports` exports `exportModule as __moduleExports` (so `load()` no longer appends the const) and assigns `exportModule = mod;` at the top of `__mfApplyLazyShareExports` (so the cache write itself updates the binding, not only `initPromise.then`).

```sh
npm run fix && npm run build && npm run verify
```

```
## no delay
result: {"esmLodashDefault":"function","cjsRequireLodash":"{\"a\":2,\"b\":4}","error":null}

## lodash prebuild +1500ms
result: {"esmLodashDefault":"function","cjsRequireLodash":"{\"a\":2,\"b\":4}","error":null}

## control: merged loadShare chunk +1500ms
result: {"esmLodashDefault":"function","cjsRequireLodash":"{\"a\":2,\"b\":4}","error":null}
```

Reinstall (`rm -rf node_modules/@module-federation/vite && npm install`) to get the unpatched package back.

## Layout

- `vite.config.mjs`: `federation()` with one expose and four shares; `lodash` is non-singleton with a local copy.
- `packages/cjs-consumer/index.cjs`: the `__importDefault(require("lodash"))` shape tsc emits, then `lodash_1.default.transform(...)`.
- `packages/react-user/index.js`: a shared package that imports `react` without declaring it (seeds in batch 0).
- `src/bootstrap.jsx`: imports lodash as ESM and through the CommonJS consumer, writes both results to `window.__REPRO__`.
- `serve.mjs`: static server for `dist/` with `--delay <substring>=<ms>`.
- `verify.mjs`: the three scenarios above.
- `apply-fix.mjs`: the proposed fix, applied to `node_modules`.
