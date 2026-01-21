/**
 * GlassProgressBar Component
 *
 * Progress indicator with glassmorphic design.
 * Supports continuous bar and segmented modes.
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Animated,
  ViewStyle,
  TextStyle,
  StyleProp,
  Platform,
} from 'react-native';
import { colors, borderRadius, spacing } from '../../theme';

export type ProgressSize = 'sm' | 'md' | 'lg';
export type ProgressVariant = 'default' | 'gradient' | 'success' | 'warning';

export interface GlassProgressBarProps {
  /** Current progress (0-100) */
  progress: number;
  /** Total items for segments mode */
  total?: number;
  /** Current item index for segments mode */
  current?: number;
  /** Show segments instead of continuous bar */
  showSegments?: boolean;
  /** Show progress label */
  showLabel?: boolean;
  /** Custom label text */
  label?: string;
  /** Size preset */
  size?: ProgressSize;
  /** Visual variant */
  variant?: ProgressVariant;
  /** Force RTL layout */
  isRTL?: boolean;
  /** Additional container styles */
  style?: StyleProp<ViewStyle>;
  /** Additional label styles */
  labelStyle?: StyleProp<TextStyle>;
  /** Animate progress changes */
  animated?: boolean;
  /** Test ID for testing */
  testID?: string;
}

// Detect TV platform
const isTV = Platform.isTV || Platform.OS === 'android';

// Size configurations
const sizeStyles: Record<
  ProgressSize,
  {
    height: number;
    labelFontSize: number;
    labelMargin: number;
    segmentGap: number;
  }
> = {
  sm: {
    height: isTV ? 6 : 4,
    labelFontSize: isTV ? 14 : 12,
    labelMargin: spacing.xs,
    segmentGap: 2,
  },
  md: {
    height: isTV ? 10 : 8,
    labelFontSize: isTV ? 16 : 14,
    labelMargin: spacing.sm,
    segmentGap: 3,
  },
  lg: {
    height: isTV ? 14 : 12,
    labelFontSize: isTV ? 18 : 16,
    labelMargin: spacing.md,
    segmentGap: 4,
  },
};

// Variant colors
const variantColors: Record<ProgressVariant, { start: string; end: string }> = {
  default: { start: colors.primary, end: '#7c3aed' },
  gradient: { start: '#a855f7', end: '#a855f7' },
  success: { start: colors.success, end: '#00CC66' },
  warning: { start: colors.warning, end: '#FF6B00' },
};

/**
 * Glassmorphic progress bar component
 */
export const GlassProgressBar: React.FC<GlassProgressBarProps> = ({
  progress,
  total,
  current,
  showSegments = false,
  showLabel = false,
  label,
  size = 'md',
  variant = 'default',
  isRTL = false,
  style,
  labelStyle,
  animated = true,
  testID,
}) => {
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Calculate progress from current/total if provided
  const calculatedProgress =
    total && current !== undefined ? (current / total) * 100 : progress;

  useEffect(() => {
    if (animated) {
      Animated.spring(progressAnim, {
        toValue: calculatedProgress,
        friction: 10,
        tension: 40,
        useNativeDriver: false,
      }).start();
    } else {
      progressAnim.setValue(calculatedProgress);
    }
  }, [calculatedProgress, animated, progressAnim]);

  const currentSize = sizeStyles[size];
  const currentVariant = variantColors[variant];

  // Generate label text
  const labelText =
    label ||
    (total && current !== undefined
      ? `${current} / ${total}`
      : `${Math.round(calculatedProgress)}%`);

  // Render segments mode
  if (showSegments && total) {
    return (
      <View className="w-full" style={style} testID={testID}>
        <View className={`${isRTL ? 'flex-row-reverse' : 'flex-row'} w-full`}>
          {Array.from({ length: total }, (_, index) => (
            <View
              key={index}
              className="flex-1 rounded-full"
              style={{
                height: currentSize.height,
                marginHorizontal: currentSize.segmentGap / 2,
                backgroundColor:
                  index < (current || 0) ? currentVariant.start : colors.glassBorderWhite,
              }}
            />
          ))}
        </View>
        {showLabel && (
          <Text
            className={`font-medium ${isRTL ? 'text-right' : 'text-center'}`}
            style={[
              {
                fontSize: currentSize.labelFontSize,
                marginTop: currentSize.labelMargin,
                color: colors.textSecondary,
              },
              labelStyle,
            ]}
          >
            {labelText}
          </Text>
        )}
      </View>
    );
  }

  // Render continuous progress bar
  return (
    <View className="w-full" style={style} testID={testID}>
      <View
        className="w-full overflow-hidden"
        style={{
          height: currentSize.height,
          borderRadius: currentSize.height / 2,
          backgroundColor: colors.glassBorderWhite,
        }}
      >
        <Animated.View
          className={`absolute top-0 ${isRTL ? 'right-0' : 'left-0'}`}
          style={{
            height: currentSize.height,
            borderRadius: currentSize.height / 2,
            width: progressAnim.interpolate({
              inputRange: [0, 100],
              outputRange: ['0%', '100%'],
              extrapolate: 'clamp',
            }),
            backgroundColor: currentVariant.start,
          }}
        />
      </View>
      {showLabel && (
        <Text
          className={`font-medium ${isRTL ? 'text-right' : 'text-center'}`}
          style={[
            {
              fontSize: currentSize.labelFontSize,
              marginTop: currentSize.labelMargin,
              color: colors.textSecondary,
            },
            labelStyle,
          ]}
        >
          {labelText}
        </Text>
      )}
    </View>
  );
};

export default GlassProgressBar;
