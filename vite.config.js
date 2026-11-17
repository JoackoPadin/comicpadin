import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// base relativa: funciona igual en GitHub Pages (/comicpadin/) que en local
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
});
