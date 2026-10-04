import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import tsConfigPaths from 'vite-tsconfig-paths';

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
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});