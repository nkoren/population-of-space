import { defineConfig, type Plugin } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { spawn } from 'node:child_process';
import path from 'node:path';

const ROOT = import.meta.dirname;
const DATA_DIR = path.join(ROOT, 'data');

/**
 * Dev only: watch data/** and rerun scripts/build-data.ts on change, so YAML
 * edits show up in the browser without restarting `npm run dev`. Vite already
 * reloads the page when public/data/dataset.json is rewritten.
 */
function watchData(): Plugin {
  let running = false;
  let queued = false;
  const rebuild = (log: (msg: string) => void) => {
    if (running) {
      queued = true;
      return;
    }
    running = true;
    log('data changed, rebuilding dataset...');
    const child = spawn(process.execPath, ['--import', 'tsx', 'scripts/build-data.ts'], {
      cwd: ROOT,
      stdio: 'inherit',
    });
    child.on('exit', (code) => {
      running = false;
      log(code === 0 ? 'dataset rebuilt' : `dataset build failed (exit ${code}); old data kept`);
      if (queued) {
        queued = false;
        rebuild(log);
      }
    });
  };
  return {
    name: 'watch-data',
    apply: 'serve',
    configureServer(server) {
      server.watcher.add(DATA_DIR);
      const log = (msg: string) => server.config.logger.info(`[data] ${msg}`, { timestamp: true });
      server.watcher.on('all', (_event, file) => {
        if (file.startsWith(DATA_DIR)) rebuild(log);
      });
    },
  };
}

export default defineConfig({
  // GitHub Pages serves a project site under /<repo>/; set BASE_PATH in CI, leave unset elsewhere.
  base: process.env.BASE_PATH ?? '/',
  plugins: [svelte(), watchData()],
  resolve: { alias: { $lib: path.resolve(ROOT, 'src/lib') } },
  build: {
    target: 'es2022',
    sourcemap: false,
  },
  // allowedHosts lets a localtunnel / cloudflared URL reach the dev server for phone testing.
  server: { port: 5174, strictPort: true, allowedHosts: ['.loca.lt', '.trycloudflare.com'] },
});
