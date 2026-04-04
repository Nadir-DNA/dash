/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Rien Design - Noir profond
        rien: {
          black: '#000000',
          dark: '#0A0A0A',
          surface: '#141414',
          elevated: '#1C1C1C',
          border: '#262626',
          muted: '#404040',
          gray: '#737373',
          light: '#A3A3A3',
          white: '#FAFAFA',
          // Accents subtils
          accent: '#FF5733', // Orange subtil
          success: '#00D26A',
          warning: '#FFB800',
          // Glyph LEDs
          glyph1: '#FF5733',
          glyph2: '#00D26A',
          glyph3: '#3B82F6',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'SF Mono', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'rien': '0 0 0 1px rgba(255,255,255,0.05)',
        'glow': '0 0 20px rgba(255,87,51,0.15)',
        'card': '0 4px 24px rgba(0,0,0,0.4)',
      }
    },
  },
  plugins: [],
}