/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        nothing: {
          black: '#0A0A0A',
          white: '#FFFFFF',
          gray: '#888888',
          red: '#FF0000',
          border: '#222222',
        }
      },
      fontFamily: {
        nothing: ['Montserrat', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}