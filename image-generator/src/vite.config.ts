import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages（elcommun.github.io/app/image-generator/）用。
// src/ でビルドし、1つ上（image-generator/）に index.html と assets/ を出力する。
// APIキーは埋め込まない（使う人が画面で入力し、その端末のブラウザにだけ保存）。
export default defineConfig({
  base: './',
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  build: {
    outDir: '..',
    emptyOutDir: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});
