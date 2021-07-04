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
      screens: {
        'sm': '640px',
        // => @media (min-width: 640px) { ... }
  
        'md': '768px',
        // => @media (min-width: 768px) { ... }
  
        'lg': '1024px',
        // => @media (min-width: 1024px) { ... }
  
        'xl': '1280px',
        // => @media (min-width: 1280px) { ... }
  
        '2xl': '1536px',
        // => @media (min-width: 1536px) { ... }
      },
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
    },
  },
  darkMode: 'class',
  plugins: [require('@tailwindcss/forms')],
};
