import { defineConfig } from '@pandacss/dev';

export default defineConfig({
  preflight: true,
  jsxFramework: 'solid',
  outdir: 'styled-system',
  importMap: 'styled-system',
  include: ['./packages/playground/src/**/*.{ts,tsx}', './packages/solid-repl/src/**/*.{ts,tsx}'],
  exclude: [],
  conditions: {
    dark: '.dark &',
    light: '[data-theme=light] &',
    darkGroupHover: '.dark .group:is(:hover, [data-hover]) &',
  },
  theme: {
    extend: {
      tokens: {
        colors: {
          dark: { value: '#07254A' },
          medium: { value: '#446b9e' },
          solidc: { value: '#2c4f7c' },
        },
        fonts: {
          sans: {
            value:
              'Gordita, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
          },
          mono: { value: 'Menlo, Monaco, "Courier New", monospace' },
        },
      },
    },
  },
});
