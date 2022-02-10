const theme = require('tailwindcss/defaultTheme');

module.exports = {
  mode: 'jit',
  content: ['./src/**/*.{tsx,ts,css}', './playground/**/*.{tsx,ts,css}', './index.html'],
  theme: {
    extend: {
      colors: {
        brand: {
          default: '#2c4f7c',
          dark: '#335d92',
          medium: '#446b9e',
          light: '#4f88c6',
        },
        solid: {
          default: '#2c4f7c',
          darkbg: '#3e3e3e',
          darkLighterBg: '#595959',
          darkdefault: '#b8d7ff', //'#87b1e6',
          darkgray: '#252525',
          gray: '#414042',
          mediumgray: '#9d9d9d',
          lightgray: '#f3f5f7',
          dark: '#07254A',
          medium: '#446b9e',
          light: '#4f88c6',
          accent: '#0cdc73',
          secondaccent: '#0dfc85',
        },
        other: '#1e1e1e',
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
        'row-resize': 'row-resize',
      },
    },
  },
  darkMode: 'class',
};
