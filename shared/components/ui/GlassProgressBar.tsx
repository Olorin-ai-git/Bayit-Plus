/**
 * GlassProgressBar - Progress indicator with Glassmorphic Design
 * Used in Flow Hero to show progress through flow items
 * Supports segments, labels, and animated transitions
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { colors, borderRadius, spacing } from '../theme';
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
    default: { start: colors.primary, end: '#7c3aed' },
    gradient: { start: '#a855f7', end: '#a855f7' },
    success: { start: colors.success, end: '#00CC66' },
    warning: { start: colors.warning, end: '#FF6B00' },
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
        <View style={[styles.segmentsContainer, isRTL && styles.segmentsRTL]}>
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
                    : 'rgba(255, 255, 255, 0.2)',
                },
                index < (current || 0) && styles.segmentActive,
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
          styles.track,
          {
            height: currentSize.height,
            borderRadius: currentSize.height / 2,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.fill,
            {
              height: currentSize.height,
              borderRadius: currentSize.height / 2,
              width: progressAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
                extrapolate: 'clamp',
              }),
              backgroundColor: currentVariant.start,
            },
            isRTL && styles.fillRTL,
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
  track: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    // @ts-ignore - Web gradient
    background: 'linear-gradient(90deg, #a855f7, #a855f7)',
  },
  fillRTL: {
    left: 'auto' as any,
    right: 0,
  },
  label: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
    textAlign: 'center',
  },
  labelRTL: {
    textAlign: 'right',
  },
  segmentsContainer: {
    flexDirection: 'row',
    width: '100%',
  },
  segmentsRTL: {
    flexDirection: 'row-reverse',
  },
  segment: {
    flex: 1,
    borderRadius: borderRadius.full,
    // @ts-ignore - Web transition
    transition: 'background-color 0.3s ease',
  },
  segmentActive: {
    // @ts-ignore - Web shadow
    boxShadow: '0 0 8px rgba(168, 85, 247, 0.5)',
  },
});

export default GlassProgressBar;
