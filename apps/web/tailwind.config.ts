import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#1a56db', light: '#3b7de8', dark: '#1140a8' },
      },
    },
  },
  plugins: [],
};

export default config;
