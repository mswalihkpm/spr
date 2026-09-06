/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        madin: {
          50: '#F0F5FA',
          100: '#E1EBF5',
          200: '#C3D7EC',
          300: '#94BBE0',
          400: '#5F9BD0',
          500: '#387EBf',
          600: '#25639E',
          700: '#1B4D7E',
          800: '#0E2E50',
          900: '#0A2540',
          950: '#061626',
        },
        gold: {
          50: '#FCF9EE',
          100: '#F7F0D5',
          200: '#EFE1AB',
          300: '#E5CD7B',
          400: '#DCB74D',
          500: '#D4A017',
          600: '#C59013',
          700: '#A57310',
          800: '#845A13',
          900: '#6D4A13',
          950: '#3E2706',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'premium': '0 4px 20px -2px rgba(10, 37, 64, 0.08), 0 2px 6px -1px rgba(10, 37, 64, 0.04)',
        'card-hover': '0 10px 25px -5px rgba(10, 37, 64, 0.12), 0 8px 10px -6px rgba(10, 37, 64, 0.06)',
      },
    },
  },
  plugins: [],
};
