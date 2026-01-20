/**
 * GlassView Component
 *
 * Base glass container with glassmorphic styling.
 * Provides a consistent glass background effect across platforms.
 */

import React from 'react';
import { View, StyleSheet, Platform, ViewStyle, StyleProp } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors, borderRadius } from '../../theme';

export interface GlassViewProps {
  /** Content to render inside the glass view */
  children: React.ReactNode;
  /** Intensity of the glass effect */
  intensity?: 'subtle' | 'low' | 'medium' | 'high' | 'light' | 'heavy';
  /** Additional styles */
  style?: StyleProp<ViewStyle>;
  /** Custom border color */
  borderColor?: string;
  /** Whether to hide the border */
  noBorder?: boolean;
  /** Test ID for testing */
  testID?: string;
}

// Map intensity aliases to base levels
const normalizeIntensity = (
  intensity: 'subtle' | 'low' | 'medium' | 'high' | 'light' | 'heavy'
): 'subtle' | 'low' | 'medium' | 'high' => {
  if (intensity === 'light') return 'low';
  if (intensity === 'heavy') return 'high';
  return intensity;
};

/**
 * Glass container component with glassmorphic styling
 */
export const GlassView: React.FC<GlassViewProps> = ({
  children,
  intensity = 'medium',
  style,
  borderColor,
  noBorder = false,
  testID,
}) => {
  const normalizedIntensity = normalizeIntensity(intensity);

  // Purple-tinted black glass backgrounds
  const intensityStyles = {
    subtle: { backgroundColor: 'transparent' },
    low: { backgroundColor: colors.glassLight },
    medium: { backgroundColor: colors.glass },
    high: { backgroundColor: colors.glassStrong },
  };

  const blurAmount = {
    subtle: 4,
    low: 8,
    medium: 12,
    high: 20,
  };

  // Web: Use CSS backdrop-filter
  if (Platform.OS === 'web') {
    const glassClassName =
      normalizedIntensity === 'high'
        ? 'glass-strong'
        : normalizedIntensity === 'low'
          ? 'glass-light'
          : normalizedIntensity === 'subtle'
            ? 'glass-subtle'
            : 'glass';

    return (
      <View
        testID={testID}
        // Web-specific className
        {...({ className: glassClassName } as object)}
        style={[
          styles.glass,
          intensityStyles[normalizedIntensity],
          !noBorder && styles.border,
          borderColor && { borderColor },
          {
            // @ts-expect-error - Web-specific CSS properties
            backdropFilter: `blur(${blurAmount[normalizedIntensity]}px)`,
            WebkitBackdropFilter: `blur(${blurAmount[normalizedIntensity]}px)`,
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  // Native: Purple-tinted gradient fallback
  const gradientColors =
    normalizedIntensity === 'high'
      ? ['rgba(10, 10, 10, 0.9)', 'rgba(15, 10, 20, 0.95)']
      : normalizedIntensity === 'low'
        ? ['rgba(10, 10, 10, 0.4)', 'rgba(15, 10, 20, 0.5)']
        : normalizedIntensity === 'subtle'
          ? ['rgba(10, 10, 10, 0.1)', 'rgba(15, 10, 20, 0.15)']
          : ['rgba(10, 10, 10, 0.7)', 'rgba(15, 10, 20, 0.8)'];

  const gradientStyle: ViewStyle[] = [
    styles.glass,
    ...(noBorder ? [] : [styles.border]),
    ...(borderColor ? [{ borderColor }] : []),
    ...(style ? [style as ViewStyle] : []),
  ];

  return (
    <LinearGradient colors={gradientColors} style={gradientStyle} testID={testID}>
      <View style={styles.innerGlow}>{children}</View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  glass: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  border: {
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  innerGlow: {
    flex: 1,
    borderRadius: borderRadius.lg - 1,
    borderWidth: 1,
    borderColor: colors.glassBorderLight,
  },
});

export default GlassView;
