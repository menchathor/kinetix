/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './js/**/*.js'
  ],
  theme: {
    extend: {
      screens: {
        // Móviles modernos (iPhone SE 2+, Android habituales).
        xs: '360px'
      },
      fontFamily: {
        // Barlow se autoaloja en assets/fonts (funciona offline).
        sans: ['Barlow', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        display: ['Barlow Condensed', 'Barlow', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif']
      },
      minHeight: {
        11: '2.75rem'
      },
      minWidth: {
        11: '2.75rem'
      }
    }
  },
  plugins: []
};
