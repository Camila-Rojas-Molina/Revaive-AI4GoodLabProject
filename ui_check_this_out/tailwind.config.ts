import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /* Primary green scale */
        brand: {
          50:  '#dce5df',
          100: '#dce5df',
          200: '#adc9c2',
          300: '#659a9d',
          400: '#4b8083',
          500: '#306669',
          600: '#134e51',
          700: '#003739',
          800: '#002021',
          900: '#002b2d',
        },
        /* Warm brown scale */
        warm: {
          100: '#eae8e3',
          200: '#d2c6b6',
          300: '#a8867c',
          400: '#77574d',
          500: '#62473e',
          600: '#4e3730',
          700: '#362520',
          800: '#231916',
        },
        /* Neutral / surface tokens */
        surface: {
          bg:       '#fbf9f4',
          elevated: '#f0eee9',
          border:   '#bfc8c8',
          tertiary: '#696f70',
          secondary:'#404849',
          primary:  '#002b2d',
        },
        /* Semantic states */
        error:   { DEFAULT: '#ba1a1a', dark: '#93000a', light: '#fddad5' },
        warning: { DEFAULT: '#ffa000', light: '#fff3e0' },
        success: { DEFAULT: '#2aa84c', light: '#e8f5ec' },
      },
      fontFamily: {
        sans: ['var(--font-public-sans)', 'sans-serif'],
      },
      letterSpacing: {
        overline: '1.5px',
        nav:      '0.8px',
        label:    '0.14px',
        caption:  '0.24px',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '3rem',
      },
    },
  },
  plugins: [],
}

export default config
