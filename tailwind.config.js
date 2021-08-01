const colors = require('tailwindcss/colors');
const theme = require('tailwindcss/defaultTheme');

module.exports = {
  mode: 'jit',
  purge: [
    "./src/**/*.{tsx,ts,css}",
    "./playground/**/*.{tsx,ts,css}",
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
        sans: ['Gordita', ...theme.fontFamily.sans],
      },
      fontSize: {
        '0.5sm': ['0.84375rem', '1.25rem'],
      },
      cursor: {
        'col-resize': 'col-resize',
        'row-resize': 'row-resize'
      }
    },
  },
  darkMode: 'class',
  plugins: [require('@tailwindcss/forms')],
};
