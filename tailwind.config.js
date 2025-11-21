/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#09090b',
        surface: '#18181b', // Dark panel background
        surfaceHighlight: '#27272a',
        border: '#3f3f46',
        primary: '#bef264', // Neon Lime (lime-400)
        primaryHover: '#a3e635', // lime-500
        primaryText: '#000000',
        secondary: '#06b6d4',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
