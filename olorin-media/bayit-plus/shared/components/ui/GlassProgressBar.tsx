/**
 * GlassProgressBar - Progress indicator with Glassmorphic Design
 * Used in Flow Hero to show progress through flow items
 * Supports segments, labels, and animated transitions
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Animated,
  ViewStyle,
  TextStyle,
  StyleProp,
  StyleSheet,
} from 'react-native';
import { colors, borderRadius, spacing } from '@olorin/design-tokens';
import { isTV } from '../utils/platform';

type ProgressSize = 'sm' | 'md' | 'lg';
type ProgressVariant = 'default' | 'gradient' | 'success' | 'warning';

interface GlassProgressBarProps {
  /** Current progress (0-100) */
  progress: number;
  /** Total items (if using segments mode) */
  total?: number;
  /** Current item index (if using segments mode) */
  current?: number;
  /** Show segments instead of continuous bar */
  showSegments?: boolean;
  /** Show label (e.g., "3 of 7") */
  showLabel?: boolean;
  /** Custom label text */
  label?: string;
  /** Size variant */
  size?: ProgressSize;
  /** Color variant */
  variant?: ProgressVariant;
  /** RTL layout */
  isRTL?: boolean;
  /** Custom container style */
  style?: StyleProp<ViewStyle>;
  /** Custom label style */
  labelStyle?: StyleProp<TextStyle>;
  /** Animate progress changes */
  animated?: boolean;
}

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
}) => {
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Calculate progress from current/total if provided
  const calculatedProgress = total && current !== undefined
    ? (current / total) * 100
    : progress;

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
  }, [calculatedProgress, animated]);

  // Size configurations
  const sizeStyles: Record<ProgressSize, {
    height: number;
    labelFontSize: number;
    labelMargin: number;
    segmentGap: number;
  }> = {
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
    default: { start: colors.primary, end: colors.primaryDark },
    gradient: { start: colors.primary, end: colors.primary },
    success: { start: colors.success, end: colors.success },
    warning: { start: colors.warning, end: colors.warning },
  };

  const currentSize = sizeStyles[size];
  const currentVariant = variantColors[variant];

  // Generate label text
  const labelText = label || (total && current !== undefined
    ? `${current} / ${total}`
    : `${Math.round(calculatedProgress)}%`);

  // Render segments mode
  if (showSegments && total) {
    return (
      <View style={[styles.container, style]}>
        <View style={[styles.segmentsRow, isRTL && styles.segmentsRowRTL]}>
          {Array.from({ length: total }, (_, index) => (
            <View
              key={index}
              style={[
                styles.segment,
                {
                  height: currentSize.height,
                  marginHorizontal: currentSize.segmentGap / 2,
                  backgroundColor: index < (current || 0)
                    ? currentVariant.start
                    : colors.glassBorderWhite,
                },
              ]}
            />
          ))}
        </View>
        {showLabel && (
          <Text
            style={[
              styles.label,
              {
                fontSize: currentSize.labelFontSize,
                marginTop: currentSize.labelMargin,
              },
              isRTL && styles.labelRTL,
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
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.progressTrack,
          {
            height: currentSize.height,
            borderRadius: currentSize.height / 2,
            backgroundColor: colors.glassBorderWhite,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.progressFill,
            {
              height: currentSize.height,
              borderRadius: currentSize.height / 2,
              width: progressAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
                extrapolate: 'clamp',
              }),
              backgroundColor: currentVariant.start,
              left: isRTL ? 'auto' : 0,
              right: isRTL ? 0 : 'auto',
            },
          ]}
        />
      </View>
      {showLabel && (
        <Text
          style={[
            styles.label,
            {
              fontSize: currentSize.labelFontSize,
              marginTop: currentSize.labelMargin,
            },
            isRTL && styles.labelRTL,
            labelStyle,
          ]}
        >
          {labelText}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  segmentsRow: {
    flexDirection: 'row',
    width: '100%',
  },
  segmentsRowRTL: {
    flexDirection: 'row-reverse',
  },
  segment: {
    flex: 1,
    borderRadius: borderRadius.full,
  },
  progressTrack: {
    width: '100%',
    overflow: 'hidden',
  },
  progressFill: {
    position: 'absolute',
    top: 0,
  },
  label: {
    color: colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  labelRTL: {
    textAlign: 'right',
  },
});

export default GlassProgressBar;
