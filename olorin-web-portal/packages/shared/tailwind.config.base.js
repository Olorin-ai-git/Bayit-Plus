/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        // Legacy primary colors (for backward compatibility)
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

        // NEW WIZARD THEME - Deep Purple/Black Glassmorphic Design
        wizard: {
          // Background Colors - Deep purple/black theme from mockups
          'bg-deep': '#0f0027',        // Near-black purple base (darkest)
          'bg-primary': '#1a0033',     // Deep purple primary background
          'bg-secondary': '#2d1b4e',   // Dark purple secondary surfaces
          'bg-card': 'rgba(45, 27, 78, 0.6)',  // Semi-transparent card overlay

          // Neon Accent Colors - Purple/Pink gradient theme
          'accent-purple': '#a855f7',  // Neon purple primary
          'accent-pink': '#d946ef',    // Neon pink secondary
          'accent-cyan': '#22d3ee',    // Cyan highlight

          // Glow Colors (for box-shadow effects)
          'glow-purple': 'rgba(168, 85, 247, 0.5)',
          'glow-pink': 'rgba(217, 70, 239, 0.5)',
          'glow-cyan': 'rgba(34, 211, 238, 0.3)',

          // Text Colors - High contrast for accessibility
          'text-primary': '#ffffff',    // Pure white for headings
          'text-secondary': '#e8e8e8',  // Near white for body text
          'text-muted': '#b8b8b8',      // Light gray for muted text
          'text-disabled': '#888888',   // Medium gray for disabled

          // Border Colors
          'border-primary': 'rgba(168, 85, 247, 0.3)',   // Purple border
          'border-secondary': 'rgba(255, 255, 255, 0.1)', // Subtle white border
          'border-glow': 'rgba(168, 85, 247, 0.6)',      // Glowing border

          // Interactive States
          'hover': '#3d2b5e',           // Lighter purple for hover
          'active': '#4d3b6e',          // Even lighter for active
          'focus': '#a855f7',           // Purple focus ring
        },

        // Legacy corporate colors (keep for migration period)
        corporate: {
          bgPrimary: '#1A0B2E',
          bgSecondary: '#16213E',
          bgTertiary: '#0F3460',
          textPrimary: '#E8E8E8',
          textSecondary: '#B8B8B8',
          textMuted: '#888888',
          accentPrimary: '#A855F7',
          accentSecondary: '#7C3AED',
          accentTertiary: '#C084FC',
          borderPrimary: '#FFFFFF',
          borderSecondary: '#E8E8E8',
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#3B82F6',
          hover: '#2D1B4E',
          active: '#3D2B5E',
          focus: '#A855F7',
        }
      },
      fontFamily: {
        'sans': ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      // Enhanced backdrop blur for glassmorphic effects
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '32px',
      },
      // Custom box shadows for glow effects
      boxShadow: {
        'glow-purple': '0 0 20px rgba(168, 85, 247, 0.5)',
        'glow-pink': '0 0 20px rgba(217, 70, 239, 0.5)',
        'glow-cyan': '0 0 15px rgba(34, 211, 238, 0.3)',
        'glow-purple-lg': '0 0 40px rgba(168, 85, 247, 0.6)',
        'glow-pink-lg': '0 0 40px rgba(217, 70, 239, 0.6)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(168, 85, 247, 0.1)',
        'glass-lg': '0 12px 48px rgba(0, 0, 0, 0.5), 0 0 30px rgba(168, 85, 247, 0.15)',
      },
      // Animation configuration for wizard theme
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.5s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'spin-slow': 'spin 3s linear infinite',
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
        pulseGlow: {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 20px rgba(168, 85, 247, 0.5)' },
          '50%': { opacity: '0.8', boxShadow: '0 0 40px rgba(168, 85, 247, 0.8)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      // Background gradients for wizard theme
      backgroundImage: {
        'wizard-gradient': 'linear-gradient(135deg, #a855f7 0%, #d946ef 100%)',
        'wizard-gradient-radial': 'radial-gradient(circle, #a855f7 0%, #1a0033 100%)',
        'hero-gradient': 'linear-gradient(180deg, #0f0027 0%, #1a0033 50%, #2d1b4e 100%)',
        'shimmer-gradient': 'linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.3), transparent)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
