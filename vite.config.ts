import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solidPlugin()],
  define: {
    'process.env.BABEL_TYPES_8_BREAKING': 'true',
    'process.env.NODE_DEBUG': 'false',
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {},
      },
    },
  },
});
