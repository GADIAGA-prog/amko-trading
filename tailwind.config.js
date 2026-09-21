/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Petroleum Products Trading — matte gold, midnight navy and ivory.
        slate: { 50: '#FAF9F6', 100: '#F3F1EC', 200: '#E4E4E0', 300: '#CAD0D2', 400: '#96A4AD', 500: '#667985', 600: '#4C626F', 700: '#344C5B', 800: '#203847', 900: '#102332', 950: '#091720' },
        brand: {
          50:  '#FAF7EF',
          100: '#F2EBD8',
          200: '#E6D8B6',
          300: '#D5BE87',
          400: '#C5A765',
          500: '#B99A55',
          600: '#987936',
          700: '#806328',
          800: '#685022',
          900: '#55421E',
          950: '#302510',
        },
      },
    },
  },
  plugins: [],
};
