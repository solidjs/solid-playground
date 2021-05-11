const colors = require('tailwindcss/colors');

module.exports = {
  mode: 'jit',
  purge: [
    "./src/**/*.{tsx,ts,css}",
    "./index.html"
  ],
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
        other: '#1e1e1e'
      },
      fontFamily: {
        // This font doesn't render properly, it seems it has a line-height issue
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
  darkMode: 'class',
  plugins: [require('@tailwindcss/forms')],
};
