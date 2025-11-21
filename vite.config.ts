import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Safely access process.cwd() by casting to any to avoid TS errors in some environments
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    base: './', // Critical for GitHub Pages sub-directory deployment
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './'),
      },
    },
    define: {
      // Define process.env as an empty object to prevent crashes in browser
      'process.env': {},
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
  };
});