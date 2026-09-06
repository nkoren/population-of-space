import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'node:path';

export default defineConfig({
  plugins: [svelte()],
  resolve: { alias: { $lib: path.resolve(import.meta.dirname, 'src/lib') } },
  build: {
    target: 'es2022',
    sourcemap: false,
  },
  server: { port: 5173 },
});
