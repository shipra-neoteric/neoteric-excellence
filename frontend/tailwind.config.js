/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Neoteric Excellence's single fixed brand color (no per-company theming — one tenant)
        primary: {
          50: '#e3eaf2', 100: '#c7d5e5', 200: '#8fb4de', 300: '#5c91e3',
          400: '#2f5f8f', 500: '#12355b', 600: '#0f2c4b', 700: '#0c233c',
          800: '#091a2d', 900: '#06111e',
        },
      },
      fontFamily: {
        sans: ['"Source Sans 3"', 'system-ui', 'sans-serif'],
        heading: ['Archivo', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
