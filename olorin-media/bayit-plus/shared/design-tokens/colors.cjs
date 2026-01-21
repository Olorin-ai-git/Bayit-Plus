/**
 * Bayit+ Design System - Colors (CommonJS)
 * Unified Purple/Black Glassmorphic Theme
 * Shared across all platforms: web, mobile, TV, tvOS
 */

// Primary - Dark Purple (brand color for glassmorphic UI)
const primary = {
  50: '#faf5ff',
  100: '#f3e8ff',
  200: '#e9d5ff',
  300: '#d8b4fe',
  400: '#c084fc',
  500: '#a855f7',
  600: '#9333ea',
  700: '#7e22ce',
  800: '#6b21a8',  // Dark purple
  900: '#581c87',  // Darker purple
  950: '#3b0764',  // Darkest purple
  DEFAULT: '#7e22ce',  // Changed to dark purple (700)
}

// Secondary - Deep Dark Purple (for accents and highlights)
const secondary = {
  50: '#fdf4ff',
  100: '#fae8ff',
  200: '#f5d0fe',
  300: '#f0abfc',
  400: '#e879f9',
  500: '#d946ef',
  600: '#c026d3',
  700: '#a21caf',
  800: '#86198f',  // Dark magenta-purple
  900: '#701a75',  // Darker magenta-purple
  950: '#4a044e',  // Darkest magenta-purple
  DEFAULT: '#86198f',  // Changed to dark purple (800)
}

// Dark/Neutral - Pure blacks and grays for glassmorphic backgrounds
const dark = {
  50: '#fafafa',
  100: '#f5f5f5',
  200: '#e5e5e5',
  300: '#d4d4d4',
  400: '#a3a3a3',
  500: '#737373',
  600: '#525252',
  700: '#404040',
  800: '#262626',
  900: '#171717',
  950: '#0a0a0a',
  DEFAULT: '#000000',
}

// Semantic colors
const success = {
  400: '#4ade80',
  500: '#10b981',
  600: '#059669',
  DEFAULT: '#10b981',
}

const warning = {
  400: '#fbbf24',
  500: '#f59e0b',
  600: '#d97706',
  DEFAULT: '#f59e0b',
}

const error = {
  400: '#f87171',
  500: '#ef4444',
  600: '#dc2626',
  DEFAULT: '#ef4444',
}

// Special colors
const live = '#ef4444'  // Red for live indicators
const gold = '#fbbf24'  // Gold for premium features

// Glassmorphic effects - dark purple-tinted black glass
const glass = {
  // Backgrounds - dark purple-tinted black with transparency
  bg: 'rgba(10, 10, 10, 0.7)',           // Default glass background
  bgLight: 'rgba(10, 10, 10, 0.5)',      // Lighter glass
  bgMedium: 'rgba(10, 10, 10, 0.6)',     // Medium glass
  bgStrong: 'rgba(10, 10, 10, 0.85)',    // Strong glass
  bgPurple: 'rgba(59, 7, 100, 0.5)',     // Dark purple-tinted glass
  bgPurpleLight: 'rgba(88, 28, 135, 0.35)', // Dark purple glass (primary 900)
  
  // Borders - dark purple with glow
  border: 'rgba(126, 34, 206, 0.25)',     // Dark purple border (primary 700)
  borderLight: 'rgba(126, 34, 206, 0.15)', // Subtle dark purple border
  borderStrong: 'rgba(126, 34, 206, 0.45)', // Strong dark purple border
  borderFocus: 'rgba(126, 34, 206, 0.7)', // Focused state
  borderWhite: 'rgba(255, 255, 255, 0.1)', // White border for contrast
  
  // Overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayStrong: 'rgba(0, 0, 0, 0.8)',
  overlayPurple: 'rgba(59, 7, 100, 0.7)', // Darker purple overlay
  
  // Highlights and glows
  glow: 'rgba(126, 34, 206, 0.35)',       // Dark purple glow
  glowStrong: 'rgba(126, 34, 206, 0.6)', // Strong dark purple glow
  highlight: 'rgba(107, 33, 168, 0.2)', // Dark purple highlight
}

module.exports = {
  primary,
  secondary,
  dark,
  success,
  warning,
  error,
  live,
  gold,
  glass,
}
