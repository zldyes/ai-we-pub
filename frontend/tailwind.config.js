/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#2563eb', hover: '#1d4ed8', light: '#dbeafe', dark: '#1e40af' },
        success: { DEFAULT: '#16a34a', light: '#dcfce7' },
        warning: { DEFAULT: '#d97706', light: '#fef3c7' },
        step: {
          inactive: '#d1d5db',
          active: '#2563eb',
          completed: '#16a34a',
        }
      }
    },
  },
  plugins: [],
}

