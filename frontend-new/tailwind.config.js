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
        gray: {
          700: '#374151',  // Our accessible gray
          800: '#1f2937',  // Darker gray
          900: '#111827',  // Near black
        },
        blue: {
          700: '#1d4ed8',  // Our focus blue
        }
      }
    },
  },
  plugins: [],
}