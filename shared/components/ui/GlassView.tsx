import React from 'react';
import { View, StyleSheet, Platform, ViewStyle, StyleProp } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors, borderRadius } from '../theme';

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
    subtle: { backgroundColor: 'transparent' },       // No background for subtle blur
    low: { backgroundColor: colors.glassLight },      // rgba(10, 10, 10, 0.5)
    medium: { backgroundColor: colors.glass },        // rgba(10, 10, 10, 0.7)
    high: { backgroundColor: colors.glassStrong },    // rgba(10, 10, 10, 0.85)
  };

  const blurAmount = {
    subtle: 4,
    low: 8,
    medium: 12,
    high: 20,
  };

  // Web: Use CSS backdrop-filter with className for reliability
  if (Platform.OS === 'web') {
    const glassClassName = normalizedIntensity === 'high' ? 'glass-strong' :
                           normalizedIntensity === 'low' ? 'glass-light' :
                           normalizedIntensity === 'subtle' ? 'glass-subtle' : 'glass';
    return (
      <View
        // @ts-ignore - Web-specific className
        className={glassClassName}
        style={[
          styles.glass,
          intensityStyles[normalizedIntensity],
          !noBorder && styles.border,
          borderColor && { borderColor },
          {
            // @ts-ignore - Web-specific CSS properties
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

  // iOS/tvOS: Native BlurView would go here
  // For now, using gradient fallback that works on all platforms

  // Android/Android TV & iOS fallback: Purple-tinted gradient
  const gradientColors = normalizedIntensity === 'high'
    ? ['rgba(10, 10, 10, 0.9)', 'rgba(15, 10, 20, 0.95)']  // Stronger with purple tint
    : normalizedIntensity === 'low'
    ? ['rgba(10, 10, 10, 0.4)', 'rgba(15, 10, 20, 0.5)']   // Lighter with purple tint
    : normalizedIntensity === 'subtle'
    ? ['rgba(10, 10, 10, 0.1)', 'rgba(15, 10, 20, 0.15)']  // Very subtle with minimal tint
    : ['rgba(10, 10, 10, 0.7)', 'rgba(15, 10, 20, 0.8)'];  // Medium with purple tint
  
  return (
    <LinearGradient
      colors={gradientColors}
      style={[
        styles.glass,
        !noBorder && styles.border,
        borderColor && { borderColor },
        style,
      ]}
    >
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
    borderColor: colors.glassBorderLight,  // Subtle purple inner glow
  },
});

export default GlassView;
