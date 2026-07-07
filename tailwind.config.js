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
        // Palette de marque AMKO — vert pomme du logo (#8DC63F),
        // l'orange flamme est couvert par la palette `amber` standard.
        brand: {
          50:  '#F5FAEB',
          100: '#E8F4D3',
          200: '#D2E9A9',
          300: '#B5DB79',
          400: '#9DD04F',
          500: '#8DC63F',
          600: '#74A930',
          700: '#598223',
          800: '#48691E',
          900: '#3C5719',
          950: '#1E2F0B',
        },
      },
    },
  },
  plugins: [],
};
