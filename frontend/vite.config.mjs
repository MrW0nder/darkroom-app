import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.', // Root at project folder
  publicDir: 'public', // Static assets
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: 'public/index.html'
    }
  }
});