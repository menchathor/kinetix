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
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif']
      }
    }
  },
  plugins: []
};
