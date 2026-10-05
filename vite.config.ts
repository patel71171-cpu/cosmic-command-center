import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import tsConfigPaths from 'vite-tsconfig-paths';
import { BACKEND_PORT } from './dev-ports.mjs';

export default defineConfig({
  plugins: [
    // Devtools first, dev-only.
    tsConfigPaths({ projects: ['./tsconfig.json'] }),
    tanstackStart({
      // Redirect TanStack Start's bundled server entry to src/server.ts,
      // which wraps SSR failures with a readable error page.
      server: { entry: 'server' },
    }),
    viteReact(),
    tailwindcss(),
  ],
  server: {
    // Pinned rather than left to Vite's default so the documented frontend URL
    // (http://localhost:3002) keeps working without a --port flag.
    port: 3002,
    strictPort: true,
    proxy: {
      '/api': {
        // Read from dev-ports.mjs so the backend port is defined in one place
        // and cannot drift out of sync with the startup scripts.
        target: `http://localhost:${BACKEND_PORT}`,
        changeOrigin: true,
      },
    },
  },
});