// GitHub Pages has no server-side routing. Serving index.html as 404.html lets
// deep links such as /yohannan/r/... load the app, which then
// reads the URL and shows the right page.
import { copyFileSync, existsSync } from 'node:fs';

const src = 'dist/index.html';
if (!existsSync(src)) {
  console.error('spa-fallback: dist/index.html not found. Run vite build first.');
  process.exit(1);
}
copyFileSync(src, 'dist/404.html');
console.log('spa-fallback: wrote dist/404.html');
