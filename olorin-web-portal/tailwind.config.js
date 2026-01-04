/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7c3aed',
          800: '#6b21a8',
          900: '#581c87',
        },
        secondary: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
        },
        // Corporate Dark Glassmorphic Theme Colors (Feature: 022-olorin-webportal-dark)
        corporate: {
          // Background Colors - Deep purple/indigo dark theme
          bgPrimary: '#1A0B2E',      // Deep space purple - Main background
          bgSecondary: '#16213E',    // Dark blue-purple - Secondary surfaces
          bgTertiary: '#0F3460',     // Mid-tone blue - Tertiary surfaces

          // Text Colors - High contrast for accessibility
          textPrimary: '#E8E8E8',    // Near white - Primary text (WCAG AAA)
          textSecondary: '#B8B8B8',  // Light gray - Secondary text
          textMuted: '#888888',      // Medium gray - Muted/disabled text

          // Accent Colors - Purple wizard theme
          accentPrimary: '#A855F7',  // Purple 500 - Primary accent
          accentSecondary: '#7C3AED', // Purple 700 - Secondary accent
          accentTertiary: '#C084FC', // Purple 400 - Tertiary accent

          // Border Colors - Subtle glassmorphic borders
          borderPrimary: '#FFFFFF',  // White borders at low opacity
          borderSecondary: '#E8E8E8', // Light gray borders at low opacity

          // Success/Warning/Error States
          success: '#10B981',        // Green - Success states
          warning: '#F59E0B',        // Amber - Warning states
          error: '#EF4444',          // Red - Error states
          info: '#3B82F6',           // Blue - Info states

          // Interactive States
          hover: '#2D1B4E',          // Slightly lighter purple for hover
          active: '#3D2B5E',         // Even lighter for active
          focus: '#A855F7',          // Purple focus ring
        }
      },
      fontFamily: {
        'sans': ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      // Backdrop blur configuration for glassmorphic effects (T006)
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '12px',
        lg: '16px',
        xl: '24px',
      },
      // Animation configuration (T007)
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.5s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
} 