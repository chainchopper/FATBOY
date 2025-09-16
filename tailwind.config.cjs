/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#f038ff',
        teal: {
          DEFAULT: '#0abdc6'
        }
      }
    },
  },
  plugins: [],
};