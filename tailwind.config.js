const colors = require('tailwindcss/colors');
const isProd = process.env['npm_lifecycle_event'] === 'build';

module.exports = {
  theme: {
    extend: {
      colors: {
        ...colors,
        brand: {
          default: '#2c4f7c',
          dark: '#335d92',
          medium: '#446b9e',
          light: '#4f88c6',
        },
      },
      fontFamily: {
        // This font doesn't render properly, it has a lien-height issue it seems
        display: [
          'Gordita',
          ' ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'Noto Sans',
          'sans-serif',
          'Apple Color Emoji',
          'Segoe UI Emoji',
          'Segoe UI Symbol',
          'Noto Color Emoji',
        ],
        mono: ['Fira Code', 'monospace'],
      },
      fontSize: {
        '0.5sm': ['0.84375rem', '1.25rem'],
      },
    },
  },
  darkMode: false,
  purge: {
    enabled: isProd,
    mode: 'layers',
    layers: ['base', 'components', 'utilities'],
    content: ['src/**/*.html', 'src/**/*.tsx'],
  },
  plugins: [require('@tailwindcss/forms')],
};
