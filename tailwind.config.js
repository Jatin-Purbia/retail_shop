/** @type {import('tailwindcss').Config} */

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    extend: {
      colors: {
        primary: {
          light: '#a8b5a0',
          DEFAULT: '#4a5d4a',
          dark: '#2c3a2c',
        },
        accent: {
          light: '#f5f5f5',
          DEFAULT: '#d4af37',
          dark: '#b38f2a',
        },
      },
    },
  },

  plugins: [],

}