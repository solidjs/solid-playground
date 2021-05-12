import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig((env) => ({
  plugins: [solidPlugin()],
  define: {
    'process.env.BABEL_TYPES_8_BREAKING': 'true',
    'process.env.NODE_DEBUG': 'false',
    ...(env.command == 'build' ? {} : { global: 'globalThis' }),
  },
  build: {
    target: 'es2019',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {},
      },
    },
  },
}));
