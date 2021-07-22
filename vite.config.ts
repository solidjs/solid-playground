import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import WindiCSS from 'vite-plugin-windicss';

export default defineConfig((env) => ({
  plugins: [solidPlugin(), WindiCSS()],
  define: {
    ...(env.command == 'build'
      ? { 'process.env.': '({}).', 'process.platform': '""' }
      : { global: 'globalThis', process: JSON.stringify({ env: {} }) }),
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {},
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
}));
