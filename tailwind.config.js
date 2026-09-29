/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/renderer/index.html",
    "./src/renderer/src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f5ff',
          100: '#e0ecff',
          500: '#2563eb',
          600: '#1d4ed8',
          700: '#1a4cd2',
          800: '#1640b8',
          900: '#123294',
        },
      },
    },
  },
  plugins: [],
};
