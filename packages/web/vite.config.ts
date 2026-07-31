import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Vite 8 bundles with Rolldown (Rust). Two things worth knowing:
//   - `build.rollupOptions` is now `build.rolldownOptions`; the old key is ignored.
//   - @vitejs/plugin-react v6 transforms JSX with oxc and no longer takes a
//     `babel` option.
//
// The React Compiler transform is deliberately not enabled. Re-adding it would
// mean pulling @babel/core and @rolldown/plugin-babel back into a pipeline that
// was just freed of Babel, in order to auto-memoise a two-page app that has no
// measured render problem. The React Compiler *lint rules* are still active via
// eslint-plugin-react-hooks v7, so the correctness benefit is kept at no cost.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Resolved to source, not a build artefact, so there is no build ordering
      // between workspaces and no stale dist/ to debug.
      '@news/contracts': fileURLToPath(new URL('../contracts/src/index.ts', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // Proxying /api in dev means the browser only ever talks to one origin, so
    // there is no CORS preflight in development and no absolute URL baked into
    // the client code.
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
