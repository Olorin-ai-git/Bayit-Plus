/**
 * useGlassTheme Hook
 *
 * Provides access to the Glass theme configuration.
 * Can be extended to support theme switching in the future.
 */

import { glassTheme, colors, spacing, borderRadius, fontSize, shadows } from '../theme';

export interface GlassThemeConfig {
  colors: typeof colors;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  fontSize: typeof fontSize;
  shadows: typeof shadows;
}

/**
 * Hook to access the Glass theme
 * @returns Glass theme configuration
 */
export const useGlassTheme = (): GlassThemeConfig => {
  return {
    colors,
    spacing,
    borderRadius,
    fontSize,
    shadows,
  };
};

export default useGlassTheme;
