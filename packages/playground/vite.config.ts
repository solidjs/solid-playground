import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import UnoCSS from 'unocss/vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig((env) => ({
  plugins: [UnoCSS(), solidPlugin({ hot: false, dev: false }), nodePolyfills()],
  define: {
    'process.env.BABEL_TYPES_8_BREAKING': 'true',
    'process.env.NODE_DEBUG': 'false',
    'process.version': '"20"',
    'process.versions': '{}',
    ...(env.command == 'build' ? {} : { global: 'globalThis' }),
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {},
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`,
      },
    },
  },
  worker: {
    rollupOptions: {
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
