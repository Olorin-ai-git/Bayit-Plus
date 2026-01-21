import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
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
      // @ts-ignore - web only
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
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
  } as any,
  tooltipContainer: {
    position: 'absolute',
    zIndex: 1000,
    pointerEvents: 'none',
  } as any,
  positionTop: {
    bottom: '100%',
    left: '50%',
    transform: [{ translateX: -75 }],
    marginBottom: 8,
  } as any,
  positionBottom: {
    top: '100%',
    left: '50%',
    transform: [{ translateX: -75 }],
    marginTop: 8,
  } as any,
  positionLeft: {
    right: '100%',
    top: '50%',
    transform: [{ translateY: -20 }],
    marginRight: 8,
  } as any,
  positionRight: {
    left: '100%',
    top: '50%',
    transform: [{ translateY: -20 }],
    marginLeft: 8,
  } as any,
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
  } as any,
  arrowTop: {
    top: '100%',
    left: '50%',
    marginLeft: -6,
    borderWidth: 6,
    borderColor: 'transparent',
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  } as any,
  arrowBottom: {
    bottom: '100%',
    left: '50%',
    marginLeft: -6,
    borderWidth: 6,
    borderColor: 'transparent',
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  } as any,
  arrowLeft: {
    left: '100%',
    top: '50%',
    marginTop: -6,
    borderWidth: 6,
    borderColor: 'transparent',
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
  } as any,
  arrowRight: {
    right: '100%',
    top: '50%',
    marginTop: -6,
    borderWidth: 6,
    borderColor: 'transparent',
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
  } as any,
});

export default GlassTooltip;
