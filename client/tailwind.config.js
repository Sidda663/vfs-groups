/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        teal: { 900: '#073B4C', 800: '#0B5261' },
        gold: { 500: '#F5B700', 600: '#D99F00' },
        ink: '#17252A',
        muted: '#64748B',
        canvas: '#F7F9FA',
      },
      fontFamily: {
        display: ['Manrope', 'ui-sans-serif', 'system-ui'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      boxShadow: { card: '0 18px 50px rgba(7, 59, 76, 0.08)' },
      borderRadius: { card: '14px' },
    },
  },
  plugins: [],
};
