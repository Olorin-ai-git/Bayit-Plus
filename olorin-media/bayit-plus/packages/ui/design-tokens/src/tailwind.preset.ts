/**
 * Olorin Tailwind CSS Preset
 *
 * Base preset containing design tokens shared across all applications:
 * - Web app
 * - Mobile app (React Native / NativeWind)
 * - TV apps (tvOS, Android TV, WebOS, Tizen)
 * - Partner Portal
 *
 * This file provides a consistent design system foundation.
 *
 * Usage:
 * ```js
 * // tailwind.config.js
 * module.exports = {
 *   presets: [require('@olorin/design-tokens/tailwind.preset')],
 *   // Your app-specific config...
 * }
 * ```
 */

import { colors, primary, secondary, dark, success, warning, error, info, glass } from './colors';
import { fontFamily, fontSize, fontWeight, lineHeight, letterSpacing } from './typography';
import { borderRadius, extendedSpacing } from './spacing';
import { boxShadow, backdropBlur } from './shadows';
import { keyframes, animation, transitionTimingFunction, transitionDuration } from './animations';

import type { Config } from 'tailwindcss';

const preset: Partial<Config> = {
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
        info,

        // Glass design system colors
        glass: {
          bg: glass.bg,
          'bg-light': glass.bgLight,
          'bg-strong': glass.bgStrong,
          border: glass.border,
          'border-light': glass.borderLight,
          'border-focus': glass.borderFocus,
          'purple-light': glass.purpleLight,
          'purple-strong': glass.purpleStrong,
          'purple-glow': glass.purpleGlow,
        },

        // Aliases for convenience
        purple: secondary,
        green: success,
        red: error,
        amber: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
      },

      fontFamily: {
        // Multi-script font stack for international support
        sans: fontFamily.sans,
        hebrew: fontFamily.hebrew,
        cjk: fontFamily.cjk,
        mono: fontFamily.mono,
      },

      fontSize: {
        xs: [`${fontSize.xs}px`, { lineHeight: '1rem' }],
        sm: [`${fontSize.sm}px`, { lineHeight: '1.25rem' }],
        base: [`${fontSize.base}px`, { lineHeight: '1.5rem' }],
        lg: [`${fontSize.lg}px`, { lineHeight: '1.75rem' }],
        xl: [`${fontSize.xl}px`, { lineHeight: '1.75rem' }],
        '2xl': [`${fontSize['2xl']}px`, { lineHeight: '2rem' }],
        '3xl': [`${fontSize['3xl']}px`, { lineHeight: '2.25rem' }],
        '4xl': [`${fontSize['4xl']}px`, { lineHeight: '2.5rem' }],
        '5xl': [`${fontSize['5xl']}px`, { lineHeight: '1' }],
        '6xl': [`${fontSize['6xl']}px`, { lineHeight: '1' }],
      },

      fontWeight,
      lineHeight,
      letterSpacing,

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
      backdropBlur,

      spacing: extendedSpacing,

      keyframes,
      animation,

      transitionTimingFunction,
      transitionDuration,
    },
  },
};

export default preset;

// CommonJS export for Tailwind config
module.exports = preset;
