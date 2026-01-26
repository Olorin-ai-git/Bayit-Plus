/**
 * Hook: useSafeAreaPadding
 *
 * Calculates safe area padding with design token spacing
 * Ensures content doesn't overlap with notches, home indicators, or status bars
 *
 * Usage:
 * const safeAreaPadding = useSafeAreaPadding();
 * <View style={safeAreaPadding}>Content</View>
 */

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EdgeInsets } from 'react-native-safe-area-context';

interface SafeAreaPadding {
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
  insets: EdgeInsets;
}

export const useSafeAreaPadding = (useHorizontal: boolean = true): SafeAreaPadding => {
  const insets = useSafeAreaInsets();

  // Standard spacing values
  const topSpacing = 24;
  const bottomSpacing = 32;
  const horizontalSpacing = 16;

  return {
    paddingTop: insets.top + topSpacing,
    paddingBottom: insets.bottom + bottomSpacing,
    paddingLeft: useHorizontal ? insets.left + horizontalSpacing : 0,
    paddingRight: useHorizontal ? insets.right + horizontalSpacing : 0,
    insets,
  };
};
