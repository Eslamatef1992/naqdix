import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  root: path.resolve(import.meta.dirname),
  plugins: [react(), tailwindcss()],
  build: { outDir: path.resolve(import.meta.dirname, '../dist'), emptyOutDir: true },
  server: { port: 5300, proxy: { '/api': 'http://127.0.0.1:4200' } },
});
