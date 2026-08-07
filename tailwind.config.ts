import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        awac: {
          primary: '#EF7952',
          primaryDark: '#D2603A',
          secondary: '#F49537',
          accent: '#DF413A',
          dark: '#0B0B0B',
        },
      },
      fontFamily: {
        sans: ['Open Sans', 'system-ui', 'sans-serif'],
        heading: ['Montserrat', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
