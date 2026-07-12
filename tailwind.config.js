/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'awac': {
          'primary': '#EF7952',
          'secondary': '#F49537',
          'accent': '#DF413A',
          'dark': '#0B0B0B',
        }
      },
      fontFamily: {
        'sans': ['Open Sans', 'system-ui', 'sans-serif'],
        'heading': ['Montserrat', 'sans-serif'],
      }
    },
  },
  plugins: [],
}