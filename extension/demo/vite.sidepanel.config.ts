import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  root: __dirname,
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: '..',
    emptyOutDir: false,
    rollupOptions: { input: `${__dirname}/sidepanel.html` },
  },
});
