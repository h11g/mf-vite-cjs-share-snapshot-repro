import { federation } from '@module-federation/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'demo_remote',
      filename: 'remoteEntry.js',
      // Any expose makes this a remote container, which selects the lazy local-fallback wrapper template.
      exposes: { './widget': './src/widget.jsx' },
      shared: {
        react: { singleton: true, requiredVersion: '^18.3.1' },
        'react-dom': { singleton: true, requiredVersion: '^18.3.1' },
        // Non-singleton share with a local copy, consumed through CommonJS require() by packages/cjs-consumer.
        lodash: { singleton: false, requiredVersion: '^4.17.21' },
        // A shared package that imports react but declares no dependency on it, so the seed puts it in
        // the same batch as lodash. Its prebuild chunk statically imports the merged loadShare chunk.
        'react-user': { singleton: true, requiredVersion: '*' },
      },
    }),
  ],
  build: {
    target: 'chrome89',
    minify: false,
    // The CJS consumer is linked from ./packages, outside node_modules.
    commonjsOptions: { include: [/node_modules/, /packages\/cjs-consumer/] },
  },
});
