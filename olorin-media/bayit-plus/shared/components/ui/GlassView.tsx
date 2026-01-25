import React from 'react';
import { View, Platform, ViewStyle, StyleProp, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors, borderRadius } from '@olorin/design-tokens';

interface GlassViewProps {
  children: React.ReactNode;
  intensity?: 'subtle' | 'low' | 'medium' | 'high' | 'light' | 'heavy';
  style?: StyleProp<ViewStyle>;
  borderColor?: string;
  noBorder?: boolean;
}

// Map intensity aliases to base levels
const normalizeIntensity = (intensity: 'subtle' | 'low' | 'medium' | 'high' | 'light' | 'heavy'): 'subtle' | 'low' | 'medium' | 'high' => {
  if (intensity === 'light') return 'low';
  if (intensity === 'heavy') return 'high';
  return intensity;
};

export const GlassView: React.FC<GlassViewProps> = ({
  children,
  intensity = 'medium',
  style,
  borderColor,
  noBorder = false,
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
    return (
      <View
        style={[
          styles.base,
          intensityStyles[normalizedIntensity],
          !noBorder && styles.border,
          !noBorder && { borderColor: borderColor || colors.glassBorder },
          borderColor && { borderColor },
          {
            // @ts-ignore - Web-specific CSS properties
            backdropFilter: `blur(${blurAmount[normalizedIntensity]}px) saturate(180%)`,
            WebkitBackdropFilter: `blur(${blurAmount[normalizedIntensity]}px) saturate(180%)`,
            isolation: 'isolate',
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  // Android/Android TV & iOS fallback: Purple-tinted gradient
  const gradientColors = normalizedIntensity === 'high'
    ? ['rgba(10, 10, 10, 0.9)', 'rgba(15, 10, 20, 0.95)']
    : normalizedIntensity === 'low'
    ? ['rgba(10, 10, 10, 0.4)', 'rgba(15, 10, 20, 0.5)']
    : normalizedIntensity === 'subtle'
    ? ['rgba(10, 10, 10, 0.1)', 'rgba(15, 10, 20, 0.15)']
    : ['rgba(10, 10, 10, 0.7)', 'rgba(15, 10, 20, 0.8)'];

  return (
    <LinearGradient
      colors={gradientColors}
      style={[
        styles.base,
        !noBorder && styles.border,
        !noBorder && { borderColor: borderColor || colors.glassBorder },
        borderColor && { borderColor },
        style,
      ]}
    >
      <View style={styles.innerView}>
        {children}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  border: {
    borderWidth: 1,
  },
  innerView: {
    flex: 1,
  },
});

export default GlassView;
