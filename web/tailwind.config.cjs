/**
 * Bayit+ Web App - Tailwind Config
 * Uses shared design tokens for consistency with TV app
 */

const path = require('path');

// We can't import ES modules in CJS, so we'll define colors inline
// These match the colors from ../shared/design-tokens/colors.js
const colors = {
  primary: {
    DEFAULT: '#a855f7',
    50: '#e6f9ff',
    100: '#b3eeff',
    200: '#80e4ff',
    300: '#4dd9ff',
    400: '#1aceff',
    500: '#a855f7',
    600: '#00b3d9',
    700: '#008cb3',
    800: '#00668c',
    900: '#004066',
  },
  secondary: {
    DEFAULT: '#a855f7',
    50: '#f5e6ff',
    100: '#e6b3ff',
    200: '#d680ff',
    300: '#c74dff',
    400: '#b81aff',
    500: '#a855f7',
    600: '#8c00d9',
    700: '#7000b3',
    800: '#54008c',
    900: '#380066',
  },
  dark: {
    DEFAULT: '#0f172a',
    50: '#1e293b',
    100: '#334155',
    200: '#475569',
    300: '#64748b',
    400: '#94a3b8',
    500: '#cbd5e1',
    600: '#e2e8f0',
    700: '#f1f5f9',
    800: '#f8fafc',
    900: '#ffffff',
  },
  success: {
    DEFAULT: '#10b981',
    50: '#d1fae5',
    100: '#a7f3d0',
    200: '#6ee7b7',
    300: '#34d399',
    400: '#10b981',
    500: '#059669',
    600: '#047857',
    700: '#065f46',
    800: '#064e3b',
    900: '#022c22',
  },
  warning: {
    DEFAULT: '#f59e0b',
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  error: {
    DEFAULT: '#ef4444',
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
};

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
        // Brand colors
        primary: colors.primary,
        secondary: colors.secondary,
        dark: colors.dark,
        success: colors.success,
        warning: colors.warning,
        error: colors.error,
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
