/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./public/**/*.html",
  ],
  theme: {
    extend: {
      colors: {
        darkroom: {
          bg: '#0a0a0a',
          panel: '#1a1a1a',
          border: '#2a2a2a',
          accent: '#3b82f6',
        }
      }
    },
  },
  plugins: [],
};