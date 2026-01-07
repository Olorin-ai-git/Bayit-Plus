/**
 * Bayit+ TV App - Tailwind Config (NativeWind)
 * Uses shared design tokens for consistency with web app
 */

const {
  primary,
  secondary,
  dark,
  success,
  warning,
  error,
  glass,
} = require('../shared/design-tokens/colors.cjs')
const { fontFamily } = require('../shared/design-tokens/typography.cjs')
const { boxShadow } = require('../shared/design-tokens/shadows.cjs')
const { keyframes, animation } = require('../shared/design-tokens/animations.cjs')
const { borderRadius } = require('../shared/design-tokens/spacing.cjs')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Brand colors from shared tokens
        primary,
        secondary,
        dark,
        success,
        warning,
        error,
        // Aliases
        purple: secondary,
        green: success,
        red: error,
        // Amber for warnings
        amber: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        // Glass colors for easy access
        glass: {
          bg: glass.bg,
          'bg-light': glass.bgLight,
          'bg-strong': glass.bgStrong,
          border: glass.border,
          'border-light': glass.borderLight,
          'border-focus': glass.borderFocus,
        },
      },
      fontFamily: {
        sans: ['System', 'Inter', 'sans-serif'],
        hebrew: ['System', 'Heebo', 'sans-serif'],
      },
      borderRadius: {
        sm: `${borderRadius.sm}px`,
        DEFAULT: `${borderRadius.DEFAULT}px`,
        md: `${borderRadius.md}px`,
        lg: `${borderRadius.lg}px`,
        xl: `${borderRadius.xl}px`,
        '2xl': `${borderRadius['2xl']}px`,
        full: `${borderRadius.full}px`,
      },
      boxShadow: {
        ...boxShadow,
        // TV-specific shadows (larger for big screens)
        'tv-card': '0 8px 32px rgba(0, 0, 0, 0.4)',
        'tv-focus': '0 0 0 4px rgba(0, 217, 255, 0.5)',
      },
      spacing: {
        // TV-friendly spacing (10-foot UI)
        'tv-xs': '8px',
        'tv-sm': '16px',
        'tv-md': '24px',
        'tv-lg': '32px',
        'tv-xl': '48px',
        'tv-2xl': '64px',
      },
      fontSize: {
        // TV-friendly sizes (10-foot UI)
        'tv-xs': ['14px', { lineHeight: '20px' }],
        'tv-sm': ['16px', { lineHeight: '24px' }],
        'tv-base': ['18px', { lineHeight: '28px' }],
        'tv-lg': ['22px', { lineHeight: '32px' }],
        'tv-xl': ['28px', { lineHeight: '36px' }],
        'tv-2xl': ['36px', { lineHeight: '44px' }],
        'tv-3xl': ['48px', { lineHeight: '56px' }],
      },
      keyframes,
      animation,
    },
  },
  plugins: [],
}
