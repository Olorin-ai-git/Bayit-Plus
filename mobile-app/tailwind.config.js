/**
 * Tailwind CSS Configuration for React Native Mobile App
 *
 * This config is mobile-specific and excludes web-only CSS properties
 * that NativeWind v2 cannot process (boxShadow, backdropBlur CSS strings).
 *
 * React Native uses shadowColor, shadowOffset, shadowOpacity, shadowRadius
 * via StyleSheet instead of CSS box-shadow.
 *
 * @type {import('tailwindcss').Config}
 */

// Import colors directly from design tokens (colors are just strings, RN compatible)
const { colors, primary, secondary, dark, success, warning, error, info, glass } = require('@olorin/design-tokens/colors');
const { fontFamily, fontSize, fontWeight, lineHeight, letterSpacing } = require('@olorin/design-tokens/typography');
const { borderRadius, extendedSpacing } = require('@olorin/design-tokens/spacing');

module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    '../shared/components/**/*.{js,jsx,ts,tsx}',
    '../shared/screens/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand colors
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

        // Aliases
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

      spacing: extendedSpacing,

      // Explicitly disable CSS properties that NativeWind v2 can't process
      // React Native uses native shadow properties instead
      boxShadow: {
        // Empty object disables all shadow utilities
        // Use StyleSheet with shadowColor, shadowOffset, shadowOpacity, shadowRadius
      },
      dropShadow: {
        // Empty object disables all drop-shadow utilities
      },
    },
  },
  // Explicitly disable the shadow corePlugin for React Native compatibility
  corePlugins: {
    boxShadow: false,
    dropShadow: false,
    backdropBlur: false,
    backdropBrightness: false,
    backdropContrast: false,
    backdropGrayscale: false,
    backdropHueRotate: false,
    backdropInvert: false,
    backdropOpacity: false,
    backdropSaturate: false,
    backdropSepia: false,
  },
  plugins: [],
};
