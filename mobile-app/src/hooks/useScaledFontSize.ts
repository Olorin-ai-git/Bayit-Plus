/**
 * Hook: useScaledFontSize
 *
 * Provides Dynamic Type support (font scaling 100-200%)
 * Returns scaled font sizes based on system accessibility settings
 *
 * Usage:
 * const { xs, sm, base, lg, xl, '2xl', '3xl', '4xl', '6xl', fontScale } = useScaledFontSize();
 * <Text style={{ fontSize: scaledFontSize.lg }}>Large Text</Text>
 */

import { PixelRatio } from 'react-native';

interface ScaledFontSizes {
  xs: number;
  sm: number;
  base: number;
  lg: number;
  xl: number;
  '2xl': number;
  '3xl': number;
  '4xl': number;
  '6xl': number;
  fontScale: number;
}

export const useScaledFontSize = (): ScaledFontSizes => {
  const fontScale = PixelRatio.getFontScale();

  // Limit max scale to prevent extreme sizing
  const maxScale = 2.0;
  const adjustedScale = Math.min(fontScale, maxScale);

  return {
    xs: 12 * adjustedScale,
    sm: 14 * adjustedScale,
    base: 16 * adjustedScale,
    lg: 18 * adjustedScale,
    xl: 20 * adjustedScale,
    '2xl': 24 * adjustedScale,
    '3xl': 30 * adjustedScale,
    '4xl': 36 * adjustedScale,
    '6xl': 48 * adjustedScale,
    fontScale,
  };
};
