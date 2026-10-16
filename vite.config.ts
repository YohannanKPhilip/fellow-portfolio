/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// The site is served from https://<user>.github.io/<repo>/ on GitHub Pages,
// so every asset URL needs the repo name as a prefix. VITE_BASE overrides it
// (use "/" for a custom domain or a <user>.github.io repo).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: env.VITE_BASE || '/fellow-portfolio/',
    plugins: [react()],
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  };
});
