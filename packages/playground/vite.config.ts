import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import { resolve } from 'node:path';
import { linterAliases, linterDefine } from 'solid-repl/linterBuild.ts';

const styledSystemPath = resolve(import.meta.dirname, '../../styled-system');

export default defineConfig((env) => ({
  plugins: [solidPlugin()],
  resolve: {
    alias: {
      'styled-system': styledSystemPath,
      ...linterAliases,
    },
  },
  define: {
    'process.env.NODE_DEBUG': 'false',
    ...linterDefine,
    ...(env.command == 'build' ? {} : { global: 'globalThis' }),
  },
  build: {
    target: 'esnext',
    rolldownOptions: {
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`,
      },
    },
  },
  worker: {
    // The compiler worker imports babel-preset-solid at runtime; iife workers can't do that.
    format: 'es',
    rolldownOptions: {
      output: {
        entryFileNames: `assets/[name].js`,
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
