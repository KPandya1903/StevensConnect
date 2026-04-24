import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2e1065',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'card':      '0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04)',
        'card-hover': '0 8px 24px rgba(109,40,217,.1), 0 2px 8px rgba(0,0,0,.06)',
        'lift':      '0 4px 16px rgba(109,40,217,.12), 0 2px 6px rgba(0,0,0,.06)',
        'lift-lg':   '0 12px 32px rgba(109,40,217,.16), 0 4px 12px rgba(0,0,0,.08)',
        'glow':      '0 0 0 3px rgba(139,92,246,.18)',
      },
    },
  },
  plugins: [forms],
};

export default config;
