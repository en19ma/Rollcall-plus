import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        base: {
          50: '#E5E9F2',
          700: '#1E293B',
          800: '#151F32',
          900: '#0F172A',
          950: '#0B1120',
        },
        accent: {
          DEFAULT: '#6366F1',
          light: '#818CF8',
          dark: '#4F46E5',
        },
        teal: {
          DEFAULT: '#14B8A6',
        },
        amber: {
          DEFAULT: '#F59E0B',
        },
        rose: {
          DEFAULT: '#F43F5E',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-lexend)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0,0,0,0.28)',
      },
    },
  },
  plugins: [],
};
export default config;
