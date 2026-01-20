/**
 * Bayit+ Shared Tailwind CSS Preset
 *
 * Base preset containing design tokens shared across all applications:
 * - Web app
 * - Mobile app (React Native / NativeWind)
 * - TV app (tvOS / React Native)
 * - Partner Portal
 *
 * This file provides a consistent design system foundation.
 */

const colors = require("./colors.cjs");
const typography = require("./typography.cjs");
const shadows = require("./shadows.cjs");
const animations = require("./animations.cjs");
const spacing = require("./spacing.cjs");

/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        // Brand colors from shared tokens
        primary: colors.primary,
        secondary: colors.secondary,
        dark: colors.dark,
        success: colors.success,
        warning: colors.warning,
        error: colors.error,

        // Glass design system colors
        glass: {
          bg: colors.glass?.bg || "rgba(15, 15, 25, 0.95)",
          "bg-light": colors.glass?.bgLight || "rgba(25, 25, 40, 0.8)",
          "bg-strong": colors.glass?.bgStrong || "rgba(10, 10, 20, 0.98)",
          border: colors.glass?.border || "rgba(255, 255, 255, 0.1)",
          "border-light":
            colors.glass?.borderLight || "rgba(255, 255, 255, 0.05)",
          "border-focus":
            colors.glass?.borderFocus || "rgba(168, 85, 247, 0.5)",
        },

        // Aliases for convenience
        purple: colors.secondary,
        green: colors.success,
        red: colors.error,
        amber: {
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
        },
      },

      fontFamily: {
        // Multi-script font stack for international support
        sans: typography.fontFamily?.sans || [
          "Inter",
          "Heebo",
          "Noto Sans SC",
          "Noto Sans JP",
          "Noto Sans Devanagari",
          "Noto Sans Tamil",
          "Noto Sans Bengali",
          "system-ui",
          "sans-serif",
        ],
        hebrew: typography.fontFamily?.hebrew || [
          "Heebo",
          "Inter",
          "sans-serif",
        ],
        cjk: typography.fontFamily?.cjk || [
          "Noto Sans SC",
          "Noto Sans JP",
          "Inter",
          "sans-serif",
        ],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },

      borderRadius: {
        sm: `${spacing.borderRadius?.sm || 4}px`,
        DEFAULT: `${spacing.borderRadius?.DEFAULT || 8}px`,
        md: `${spacing.borderRadius?.md || 12}px`,
        lg: `${spacing.borderRadius?.lg || 16}px`,
        xl: `${spacing.borderRadius?.xl || 24}px`,
        "2xl": `${spacing.borderRadius?.["2xl"] || 32}px`,
        full: `${spacing.borderRadius?.full || 9999}px`,
      },

      boxShadow: {
        ...shadows.boxShadow,
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        "glass-sm": "0 4px 16px 0 rgba(0, 0, 0, 0.25)",
        "glass-lg": "0 16px 48px 0 rgba(0, 0, 0, 0.45)",
        glow: "0 0 20px rgba(59, 130, 246, 0.3)",
        "glow-lg": "0 0 40px rgba(59, 130, 246, 0.4)",
        "glow-success": "0 0 20px rgba(16, 185, 129, 0.3)",
        "glow-danger": "0 0 20px rgba(239, 68, 68, 0.3)",
        "glow-purple": "0 0 20px rgba(168, 85, 247, 0.3)",
        "glow-warning": "0 0 20px rgba(245, 158, 11, 0.3)",
      },

      backdropBlur: {
        xs: "4px",
        glass: "16px",
        "glass-lg": "24px",
      },

      spacing: {
        18: "4.5rem",
        88: "22rem",
        128: "32rem",
      },

      keyframes: animations.keyframes || {
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(59, 130, 246, 0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(59, 130, 246, 0.5)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },

      animation: animations.animation || {
        "slide-up": "slideUp 0.3s ease-out",
        "fade-in": "fadeIn 0.3s ease-out",
        "glow-pulse": "glowPulse 2s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
};
