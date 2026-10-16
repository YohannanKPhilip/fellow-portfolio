/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// The site is served from the root of its address: https://<user>.github.io/ (a repo named
// <user>.github.io) or a custom domain, so a fellow's page is at /<fellow>. A normal project
// repo is served under /<repo>/ instead, and VITE_BASE would then need that prefix.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: env.VITE_BASE || '/',
    plugins: [react()],
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  };
});
