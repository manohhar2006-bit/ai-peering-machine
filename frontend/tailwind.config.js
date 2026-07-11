/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1', // Primary Indigo
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        accent: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6', // Teal Accent
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Outfit', 'sans-serif'],
      },
      boxShadow: {
        'premium': '0 8px 30px -4px rgba(99, 102, 241, 0.06), 0 4px 12px -2px rgba(99, 102, 241, 0.04), 0 0 0 1px rgba(99, 102, 241, 0.05)',
        'premium-hover': '0 20px 40px -4px rgba(99, 102, 241, 0.12), 0 8px 20px -2px rgba(99, 102, 241, 0.08)',
        'card-shadow': '0 8px 30px rgba(0, 0, 0, 0.02), 0 1px 2px rgba(0, 0, 0, 0.02)',
        'card-shadow-hover': '0 20px 40px rgba(99, 102, 241, 0.06), 0 1px 3px rgba(0, 0, 0, 0.02)',
      }
    },
  },
  plugins: [],
}
