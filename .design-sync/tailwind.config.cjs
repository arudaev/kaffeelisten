// Tailwind config for the design-sync DS stylesheet.
// Mirrors apps/web/tailwind.config.ts but scans the component sources AND the
// authored previews so every utility class used in a preview card is compiled.
// Output is the cfg.cssEntry that the converter appends into _ds_bundle.css.
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    'apps/web/index.html',
    'apps/web/src/**/*.{ts,tsx}',
    '.design-sync/ds-entry.tsx',
    '.design-sync/previews/**/*.{ts,tsx,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          DEFAULT: '#D97706',
          hover: '#B45309',
          subtle: '#FFFBEB',
        },
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
      },
      keyframes: {
        pop: {
          from: { transform: 'scale(0.85)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-6px)' },
          '75%': { transform: 'translateX(6px)' },
        },
      },
      animation: {
        pop: 'pop 280ms cubic-bezier(0.2, 0, 0, 1)',
        shake: 'shake 300ms ease-in-out',
      },
    },
  },
  plugins: [],
}
