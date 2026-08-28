/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './screens/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        primary: '#059669',
        'primary-light': '#34D399',
        'text-main': '#0F172A',
        'text-soft': '#64748B',
        surface: '#F8FAFC',
      },
      boxShadow: {
        card: '0 10px 40px -10px rgba(0,0,0,0.08)',
        soft: '0 4px 20px -2px rgba(148, 163, 184, 0.1)',
      },
      animation: {
        scan: 'scan 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite',
      },
      keyframes: {
        scan: {
          '0%': { top: '0%', opacity: '0' },
          '10%': { opacity: '1' },
          '90%': { opacity: '1' },
          '100%': { top: '100%', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};
