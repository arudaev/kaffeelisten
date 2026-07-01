import type { Config } from 'tailwindcss'

const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-mode="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Semantic, theme-driven tokens (see src/index.css).
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
      },
      animation: {
        pop: 'pop 280ms cubic-bezier(0.2, 0, 0, 1)',
        shake: 'shake 300ms ease-in-out',
      },
    },
  },
  plugins: [],
} satisfies Config
