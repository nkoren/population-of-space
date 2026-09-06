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
  // allowedHosts lets a localtunnel / cloudflared URL reach the dev server for phone testing.
  server: { port: 5173, allowedHosts: ['.loca.lt', '.trycloudflare.com'] },
});
