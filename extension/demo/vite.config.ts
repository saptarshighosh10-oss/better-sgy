import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Standalone single-file build of the real extension UI with mocked browser APIs
// + seeded demo data. Output: ../better-sgy-demo.html (open in any browser).
export default defineConfig({
  root: __dirname,
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: '..',
    emptyOutDir: false,
    rollupOptions: {
      input: `${__dirname}/index.html`,
    },
  },
});
