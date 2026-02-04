/**
 * Centralized Breakpoint System
 *
 * Provides consistent breakpoint values and touch target sizes
 * across the entire Bayit+ application for mobile optimization.
 */

export const BREAKPOINTS = {
  xs: 0,       // Mobile portrait (0-639px)
  sm: 640,     // Mobile landscape (640-767px)
  md: 768,     // Tablet portrait (768-1023px)
  lg: 1024,    // Tablet landscape / Desktop
  xl: 1280,    // Desktop
  '2xl': 1536, // Large desktop
} as const;

export const TOUCH_TARGET = {
  MIN_SIZE: 48,      // Material Design minimum (WCAG AA)
  COMFORTABLE: 56,   // Recommended comfortable size
  LARGE: 64,         // Large touch targets for primary actions
} as const;

export const MOBILE_BREAKPOINT = BREAKPOINTS.md;  // < 768px is mobile
export const TABLET_BREAKPOINT = BREAKPOINTS.lg;  // < 1024px is tablet

/**
 * Get breakpoint key for a given width
 */
export function getBreakpoint(width: number): keyof typeof BREAKPOINTS {
  if (width >= BREAKPOINTS['2xl']) return '2xl';
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  if (width >= BREAKPOINTS.sm) return 'sm';
  return 'xs';
}

/**
 * Column count configuration for responsive grids
 */
export const GRID_COLUMNS = {
  xs: 2,   // Mobile portrait: 2 columns
  sm: 3,   // Mobile landscape: 3 columns
  md: 4,   // Tablet portrait: 4 columns
  lg: 5,   // Tablet landscape: 5 columns
  xl: 6,   // Desktop: 6 columns
  '2xl': 6, // Large desktop: 6 columns
} as const;
