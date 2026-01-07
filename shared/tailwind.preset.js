/**
 * Bayit+ Shared Tailwind Preset
 *
 * Import this in both web and TV app tailwind configs:
 *
 * // tailwind.config.js
 * module.exports = {
 *   presets: [require('../shared/tailwind.preset.js')],
 *   // app-specific overrides...
 * }
 */

import {
  primary,
  secondary,
  dark,
  success,
  warning,
  error,
  glass,
} from './design-tokens/colors.js'

import { borderRadius } from './design-tokens/spacing.js'
import { fontFamily } from './design-tokens/typography.js'
import { boxShadow } from './design-tokens/shadows.js'
import { keyframes, animation } from './design-tokens/animations.js'

/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
      colors: {
        primary,
        secondary,
        dark,
        success,
        warning,
        error,
        // Amber for warnings/highlights
        amber: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        // Purple alias
        purple: secondary,
        // Green alias
        green: success,
        // Red alias
        red: error,
      },
      fontFamily,
      borderRadius: {
        sm: `${borderRadius.sm}px`,
        DEFAULT: `${borderRadius.DEFAULT}px`,
        md: `${borderRadius.md}px`,
        lg: `${borderRadius.lg}px`,
        xl: `${borderRadius.xl}px`,
        '2xl': `${borderRadius['2xl']}px`,
        full: `${borderRadius.full}px`,
      },
      boxShadow,
      backdropBlur: {
        xs: '4px',
        glass: '16px',
        'glass-lg': '24px',
      },
      keyframes,
      animation,
    },
  },
  plugins: [],
}
