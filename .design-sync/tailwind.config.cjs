// Tailwind config for the design-sync DS stylesheet.
// Mirrors apps/web/tailwind.config.ts but scans the component sources AND the
// authored previews so every utility class used in a preview card is compiled.
// Output is the cfg.cssEntry that the converter appends into _ds_bundle.css.
/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`

module.exports = {
  content: [
    'apps/web/index.html',
    'apps/web/src/**/*.{ts,tsx}',
    '.design-sync/ds-entry.tsx',
    '.design-sync/previews/**/*.{ts,tsx,jsx}',
  ],
  darkMode: ['selector', '[data-mode="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        // Semantic, theme-driven tokens — mirrors apps/web/tailwind.config.ts.
        // The channel-triplet CSS vars ship via .design-sync/tailwind.css.
        bg: token('bg'),
        surface: {
          DEFAULT: token('surface'),
          2: token('surface-2'),
        },
        border: {
          DEFAULT: token('border'),
          strong: token('border-strong'),
        },
        fg: {
          DEFAULT: token('fg'),
          muted: token('fg-muted'),
          subtle: token('fg-subtle'),
        },
        accent: {
          DEFAULT: token('accent'),
          hover: token('accent-hover'),
          subtle: token('accent-subtle'),
        },
        success: {
          DEFAULT: token('success'),
          subtle: token('success-subtle'),
        },
        error: {
          DEFAULT: token('error'),
          subtle: token('error-subtle'),
        },
        info: token('info'),
        // Kept for any legacy references.
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
        blink: {
          '50%': { opacity: '0' },
        },
      },
      animation: {
        pop: 'pop 280ms cubic-bezier(0.2, 0, 0, 1)',
        shake: 'shake 300ms ease-in-out',
        blink: 'blink 1.1s steps(1, end) infinite',
      },
    },
  },
  plugins: [],
}
