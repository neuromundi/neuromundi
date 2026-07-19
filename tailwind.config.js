/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9', // Azul cielo — primario
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        warm: {
          50: '#fdf8f0',
          100: '#fdf3e0',
          300: '#fbbf77',
          500: '#f59e0b', // Ámbar — acento / EVS
          700: '#b45309',
        },
        sage: {
          50: '#f0fdf4',
          500: '#22c55e', // Verde — estados positivos
          700: '#15803d',
        },
        muted: '#586577',
        surface: '#f8fafc',
        // Colores semánticos del EVS (degradado 1–5)
        evs: {
          1: '#ef4444',
          2: '#f97316',
          3: '#eab308',
          4: '#84cc16',
          5: '#22c55e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        fade: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        fade: 'fade 150ms ease-out',
        slideUp: 'slideUp 200ms ease-out',
      },
    },
  },
  plugins: [],
};
