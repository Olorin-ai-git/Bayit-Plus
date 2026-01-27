/**
 * GlassPlaceholder Component
 *
 * Unified placeholder for content with missing images.
 * Supports all content types (movie, series, podcast, live, radio, vod, audiobook)
 * with platform-specific icon sizing and full accessibility.
 */

import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, StyleSheet, Platform, ViewStyle, StyleProp } from 'react-native';
import { colors, spacing, borderRadius, CONTENT_TYPE_CONFIG, getContentTypeConfig, ContentType } from '../../theme';

export interface GlassPlaceholderProps {
  /** Content type for icon selection (required for accessibility) */
  contentType: ContentType;

  /** Dimensions */
  width: number;
  height: number;
  aspectRatio?: number;

  /** Animation */
  animated?: boolean;

  /** Styling */
  style?: StyleProp<ViewStyle>;

  /** Accessibility (REQUIRED) */
  accessibilityRole: 'image' | 'none';
  accessibilityLabel: string;
  accessibilityHint?: string;

  /** Content context for screen readers */
  contentTitle?: string;
  contentReason?: 'loading' | 'missing' | 'unavailable';

  /** Keyboard navigation */
  focusable?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;

  /** Testing */
  testID?: string;
}

export const GlassPlaceholder: React.FC<GlassPlaceholderProps> = ({
  contentType,
  width,
  height,
  aspectRatio,
  animated = false,
  style,
  accessibilityRole,
  accessibilityLabel,
  accessibilityHint,
  contentTitle,
  contentReason,
  focusable = false,
  onFocus,
  onBlur,
  testID,
}) => {
  const config = getContentTypeConfig(contentType);
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // Disable animation on tvOS for performance
  const shouldAnimate = animated && !Platform.isTV;

  // Platform-specific icon size
  const iconSize = Platform.isTV
    ? config.iconSize.tvos
    : config.iconSize.ios;

  // Animation setup
  useEffect(() => {
    if (!shouldAnimate) return;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [shouldAnimate, shimmerAnim]);

  // Generate accessibility label
  const generateAccessibilityLabel = () => {
    if (contentTitle) {
      const reasonText = contentReason === 'loading'
        ? 'Loading image'
        : contentReason === 'missing'
          ? 'Image unavailable'
          : 'Image not found';
      return `${contentTitle} - ${config.label} placeholder - ${reasonText}`;
    }
    return accessibilityLabel || `${config.label} placeholder`;
  };

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 1],
  });

  const AnimatedContainer = shouldAnimate ? Animated.View : View;
  const animatedStyle = shouldAnimate ? { opacity } : {};

  return (
    <AnimatedContainer
      style={[
        styles.container,
        {
          width,
          height,
          aspectRatio: aspectRatio || config.aspectRatio,
        },
        animatedStyle,
        style,
      ]}
      accessible={accessibilityRole === 'image'}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={generateAccessibilityLabel()}
      accessibilityHint={accessibilityHint}
      testID={testID}
    >
      <View style={styles.iconContainer}>
        <Text
          style={[styles.emoji, { fontSize: iconSize, lineHeight: iconSize }]}
          accessibilityLabel={config.ttsLabel}
        >
          {config.icon}
        </Text>
      </View>
    </AnimatedContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  iconContainer: {
    backgroundColor: colors.glassMedium,
    borderRadius: borderRadius.full,
    padding: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    textAlign: 'center',
    textAlignVertical: 'center',
  },
});
