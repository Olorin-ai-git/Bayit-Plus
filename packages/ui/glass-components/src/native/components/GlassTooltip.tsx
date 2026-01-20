/**
 * GlassTooltip Component
 *
 * Tooltip with glassmorphic styling.
 * Web-only component that shows on hover.
 */

import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { colors, spacing, borderRadius } from '../../theme';
import { GlassView } from './GlassView';

export interface GlassTooltipProps {
  /** Tooltip content text */
  content: string;
  /** Element to wrap */
  children: React.ReactNode;
  /** Tooltip position */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Disable tooltip */
  disabled?: boolean;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Glassmorphic tooltip component (web only)
 */
export const GlassTooltip: React.FC<GlassTooltipProps> = ({
  content,
  children,
  position = 'top',
  disabled = false,
  testID,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<View>(null);

  // Only show tooltip on web with mouse hover
  if (Platform.OS !== 'web' || disabled || !content) {
    return <>{children}</>;
  }

  const getPositionStyle = () => {
    switch (position) {
      case 'bottom':
        return styles.positionBottom;
      case 'left':
        return styles.positionLeft;
      case 'right':
        return styles.positionRight;
      case 'top':
      default:
        return styles.positionTop;
    }
  };

  const getArrowStyle = () => {
    switch (position) {
      case 'bottom':
        return styles.arrowBottom;
      case 'left':
        return styles.arrowLeft;
      case 'right':
        return styles.arrowRight;
      case 'top':
      default:
        return styles.arrowTop;
    }
  };

  return (
    <View
      ref={containerRef}
      style={styles.container}
      testID={testID}
      {...{
        onMouseEnter: () => setIsVisible(true),
        onMouseLeave: () => setIsVisible(false),
      }}
    >
      {children}

      {isVisible && (
        <View style={[styles.tooltipContainer, getPositionStyle()]}>
          <GlassView style={styles.tooltip} intensity="high">
            <Text style={styles.tooltipText}>{content}</Text>
          </GlassView>
          <View style={[styles.arrow, getArrowStyle()]} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  tooltipContainer: {
    position: 'absolute',
    zIndex: 1000,
  },
  positionTop: {
    bottom: '100%',
    left: '50%',
    transform: [{ translateX: -75 }],
    marginBottom: 8,
  },
  positionBottom: {
    top: '100%',
    left: '50%',
    transform: [{ translateX: -75 }],
    marginTop: 8,
  },
  positionLeft: {
    right: '100%',
    top: '50%',
    transform: [{ translateY: -20 }],
    marginRight: 8,
  },
  positionRight: {
    left: '100%',
    top: '50%',
    transform: [{ translateY: -20 }],
    marginLeft: 8,
  },
  tooltip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    maxWidth: 200,
    minWidth: 150,
  },
  tooltipText: {
    fontSize: 13,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 18,
  },
  arrow: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderStyle: 'solid',
  },
  arrowTop: {
    top: '100%',
    left: '50%',
    marginLeft: -6,
    borderWidth: 6,
    borderColor: 'transparent',
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  arrowBottom: {
    bottom: '100%',
    left: '50%',
    marginLeft: -6,
    borderWidth: 6,
    borderColor: 'transparent',
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  arrowLeft: {
    left: '100%',
    top: '50%',
    marginTop: -6,
    borderWidth: 6,
    borderColor: 'transparent',
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
  },
  arrowRight: {
    right: '100%',
    top: '50%',
    marginTop: -6,
    borderWidth: 6,
    borderColor: 'transparent',
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
  },
});

export default GlassTooltip;
