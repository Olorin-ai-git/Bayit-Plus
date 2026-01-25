/**
 * Bayit+ Web App - Tailwind Config
 * Uses shared design tokens for consistency across all platforms
 */

const path = require('path');

// Import shared design tokens from local workspace package
const colors = require('../packages/ui/design-tokens/dist/colors.cjs');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./index.web.js",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../shared/**/*.{js,ts,jsx,tsx,css}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand colors from shared design tokens
        primary: colors.primary,
        secondary: colors.secondary,
        dark: colors.dark,
        success: colors.success,
        warning: colors.warning,
        error: colors.error,
        // Glass design system colors
        glass: colors.glass,
        // Aliases
        purple: colors.secondary,
        green: colors.success,
        red: colors.error,
        // Amber for warnings
        amber: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Heebo', 'Noto Sans SC', 'Noto Sans JP', 'Noto Sans Devanagari', 'Noto Sans Tamil', 'Noto Sans Bengali', 'system-ui', 'sans-serif'],
        hebrew: ['Heebo', 'Inter', 'sans-serif'],
        cjk: ['Noto Sans SC', 'Noto Sans JP', 'Inter', 'sans-serif'],
        devanagari: ['Noto Sans Devanagari', 'Inter', 'sans-serif'],
        tamil: ['Noto Sans Tamil', 'Inter', 'sans-serif'],
        bengali: ['Noto Sans Bengali', 'Inter', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-sm': '0 4px 16px 0 rgba(0, 0, 0, 0.25)',
        'glass-lg': '0 16px 48px 0 rgba(0, 0, 0, 0.45)',
        'glow': '0 0 20px rgba(59, 130, 246, 0.3)',
        'glow-lg': '0 0 40px rgba(59, 130, 246, 0.4)',
        'glow-success': '0 0 20px rgba(16, 185, 129, 0.3)',
        'glow-danger': '0 0 20px rgba(239, 68, 68, 0.3)',
        'glow-purple': '0 0 20px rgba(168, 85, 247, 0.3)',
        'glow-warning': '0 0 20px rgba(245, 158, 11, 0.3)',
      },
      backdropBlur: {
        'xs': '4px',
        'glass': '16px',
        'glass-lg': '24px',
      },
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(59, 130, 246, 0.5)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
  // RTL support
  corePlugins: {
    preflight: true,
  },
}
