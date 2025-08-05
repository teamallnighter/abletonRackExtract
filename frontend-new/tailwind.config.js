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
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#1e40af',
          700: '#1d4ed8',
          800: '#1e3a8a',
        },
        text: {
          primary: '#111827',    // Gray 900 - 12:1 contrast
          secondary: '#374151',  // Gray 700 - 4.5:1 contrast  
          tertiary: '#6b7280',   // Gray 500 - 4.5:1 contrast
          disabled: '#9ca3af',   // Gray 400 - accessible disabled state
        },
        border: {
          primary: '#374151',    // Gray 700 for better visibility
          secondary: '#6b7280',  // Gray 500 for subtle borders
          focus: '#1d4ed8',      // Blue 700 for focus states
        }
      }
    },
  },
  plugins: [],
}