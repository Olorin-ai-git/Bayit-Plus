import React from 'react';
import { View, StyleSheet, Platform, ViewStyle, StyleProp } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors, borderRadius } from '../../theme';

interface GlassViewProps {
  children: React.ReactNode;
  intensity?: 'low' | 'medium' | 'high';
  style?: StyleProp<ViewStyle>;
  borderColor?: string;
  noBorder?: boolean;
}

export const GlassView: React.FC<GlassViewProps> = ({
  children,
  intensity = 'medium',
  style,
  borderColor,
  noBorder = false,
}) => {
  const intensityStyles = {
    low: { backgroundColor: 'rgba(26, 26, 46, 0.4)' },
    medium: { backgroundColor: 'rgba(26, 26, 46, 0.7)' },
    high: { backgroundColor: 'rgba(26, 26, 46, 0.85)' },
  };

  const blurAmount = {
    low: 8,
    medium: 12,
    high: 20,
  };

  // Web: Use CSS backdrop-filter
  if (Platform.OS === 'web') {
    return (
      <View
        style={[
          styles.glass,
          intensityStyles[intensity],
          !noBorder && styles.border,
          borderColor && { borderColor },
          {
            // @ts-ignore - Web-specific CSS properties
            backdropFilter: `blur(${blurAmount[intensity]}px)`,
            WebkitBackdropFilter: `blur(${blurAmount[intensity]}px)`,
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
  // To use native blur on iOS, install @react-native-community/blur

  // Android/Android TV & iOS fallback: Gradient with inner glow
  return (
    <LinearGradient
      colors={[
        intensity === 'high' ? 'rgba(30, 30, 50, 0.9)' : 'rgba(30, 30, 50, 0.7)',
        intensity === 'high' ? 'rgba(20, 20, 40, 0.95)' : 'rgba(20, 20, 40, 0.8)',
      ]}
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
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
});

export default GlassView;
