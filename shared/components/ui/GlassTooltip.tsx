import React, { useState, useRef } from 'react';
import { View, Text, Platform, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, borderRadius } from '../../theme';
import { GlassView } from './GlassView';

interface GlassTooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  disabled?: boolean;
}

/**
 * GlassTooltip - A tooltip component with glassmorphic styling
 * Wraps children and shows tooltip on hover (web only)
 */
export const GlassTooltip: React.FC<GlassTooltipProps> = ({
  content,
  children,
  position = 'top',
  disabled = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<View>(null);

  // Only show tooltip on web with mouse hover
  if (Platform.OS !== 'web' || disabled || !content) {
    return <>{children}</>;
  }

  const getPositionStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      position: 'absolute',
      zIndex: 1000,
      // @ts-ignore - Web CSS
      pointerEvents: 'none',
    };

    switch (position) {
      case 'bottom':
        return {
          ...baseStyle,
          top: '100%',
          left: '50%',
          transform: [{ translateX: '-50%' }],
          marginTop: spacing.sm,
        };
      case 'left':
        return {
          ...baseStyle,
          right: '100%',
          top: '50%',
          transform: [{ translateY: '-50%' }],
          marginRight: spacing.sm,
        };
      case 'right':
        return {
          ...baseStyle,
          left: '100%',
          top: '50%',
          transform: [{ translateY: '-50%' }],
          marginLeft: spacing.sm,
        };
      case 'top':
      default:
        return {
          ...baseStyle,
          bottom: '100%',
          left: '50%',
          transform: [{ translateX: '-50%' }],
          marginBottom: spacing.sm,
        };
    }
  };

  const getArrowStyle = (): ViewStyle => {
    const baseArrow: ViewStyle = {
      position: 'absolute',
      width: 0,
      height: 0,
      borderStyle: 'solid',
      borderWidth: 6,
      borderColor: 'transparent',
    };

    switch (position) {
      case 'bottom':
        return {
          ...baseArrow,
          top: '100%',
          left: '50%',
          marginLeft: -6,
          borderTopColor: 'rgba(255, 255, 255, 0.1)',
        };
      case 'left':
        return {
          ...baseArrow,
          left: '100%',
          top: '50%',
          marginTop: -6,
          borderRightColor: 'rgba(255, 255, 255, 0.1)',
        };
      case 'right':
        return {
          ...baseArrow,
          right: '100%',
          top: '50%',
          marginTop: -6,
          borderLeftColor: 'rgba(255, 255, 255, 0.1)',
        };
      case 'top':
      default:
        return {
          ...baseArrow,
          bottom: '100%',
          left: '50%',
          marginLeft: -6,
          borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        };
    }
  };

  return (
    <View
      ref={containerRef}
      style={styles.container}
      // @ts-ignore - web only
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}

      {isVisible && (
        <View style={getPositionStyle()}>
          <GlassView style={styles.tooltipContent} intensity="high">
            <Text style={[styles.tooltipText, { color: colors.text }]}>
              {content}
            </Text>
          </GlassView>
          <View style={getArrowStyle()} />
        </View>
      )}
    </View>
  );
};

// Styles using StyleSheet.create() - React Native Web compatible
const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },

  tooltipContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    maxWidth: 200,
    minWidth: 150,
  },

  tooltipText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default GlassTooltip;
