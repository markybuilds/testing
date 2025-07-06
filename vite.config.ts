import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: './src/renderer',
  base: './',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve('src/renderer/index.html')
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve('./src'),
      '@renderer': path.resolve('./src/renderer'),
      '@shared': path.resolve('./src/shared')
    }
  },
  server: {
    port: 3000
  }
});
