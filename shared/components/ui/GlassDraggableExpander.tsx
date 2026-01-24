/**
 * GlassDraggableExpander - Expandable panel with drag-to-resize functionality
 * Complex animations for expansion/collapse with height adjustment
 * Preserves RTL support and accessibility
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, Animated, PanResponder, Easing, ScrollView, ViewStyle, TextStyle } from 'react-native';
import { ChevronDown, GripVertical } from 'lucide-react';
import { colors, borderRadius, spacing } from '../../theme';

interface GlassDraggableExpanderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  onExpandChange?: (expanded: boolean) => void;
  draggable?: boolean;
  minHeight?: number;
  maxHeight?: number;
  isEmpty?: boolean;
  emptyMessage?: string;
  style?: any;
}

export const GlassDraggableExpander: React.FC<GlassDraggableExpanderProps> = ({
  title,
  subtitle,
  badge,
  icon,
  rightElement,
  headerActions,
  children,
  defaultExpanded = false,
  onExpandChange,
  draggable = true,
  minHeight = 200,
  maxHeight = 800,
  isEmpty = false,
  emptyMessage,
  style,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [contentHeight, setContentHeight] = useState(minHeight);

  // Animation values
  const heightAnim = useRef(new Animated.Value(defaultExpanded ? minHeight : 0)).current;
  const opacityAnim = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;
  const rotateAnim = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

  useEffect(() => {
    // Initialize with default state
    if (defaultExpanded) {
      heightAnim.setValue(minHeight);
      opacityAnim.setValue(1);
      rotateAnim.setValue(1);
    }
  }, []);

  const toggleExpanded = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    onExpandChange?.(newExpanded);

    // Parallel animations for smooth expansion/collapse
    Animated.parallel([
      // Height animation with spring physics for natural motion
      Animated.spring(heightAnim, {
        toValue: newExpanded ? contentHeight : 0,
        useNativeDriver: false,
        tension: 50,        // Slightly increased for snappier response
        friction: 10,       // Increased for smoother deceleration
        overshootClamping: false, // Allow slight overshoot for natural feel
      }),
      // Opacity fade in/out with smooth easing
      Animated.timing(opacityAnim, {
        toValue: newExpanded ? 1 : 0,
        duration: 250,      // Slightly longer for smoother transition
        easing: Easing.inOut(Easing.ease), // Smoother acceleration/deceleration
        useNativeDriver: true,
      }),
      // Chevron rotation with smooth easing
      Animated.timing(rotateAnim, {
        toValue: newExpanded ? 1 : 0,
        duration: 250,      // Match opacity duration
        easing: Easing.inOut(Easing.ease), // Smoother acceleration/deceleration
        useNativeDriver: true,
      }),
    ]).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => draggable && isExpanded,
      onMoveShouldSetPanResponder: () => draggable && isExpanded,
      onPanResponderMove: (_, gestureState) => {
        if (!draggable || !isExpanded) return;

        const newHeight = Math.max(
          minHeight,
          Math.min(maxHeight, contentHeight + gestureState.dy)
        );
        setContentHeight(newHeight);
        heightAnim.setValue(newHeight);
      },
      onPanResponderRelease: () => {
        // Snap to min or max if close
        if (contentHeight < minHeight + 50) {
          setContentHeight(minHeight);
          Animated.spring(heightAnim, {
            toValue: minHeight,
            useNativeDriver: false,
            tension: 40,
            friction: 8,
          }).start();
        } else if (contentHeight > maxHeight - 50) {
          setContentHeight(maxHeight);
          Animated.spring(heightAnim, {
            toValue: maxHeight,
            useNativeDriver: false,
            tension: 40,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  // Interpolate rotation for chevron
  const chevronRotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={[styles.container, style]}>
      {/* Header - Entire header is clickable to toggle */}
      <Pressable
        style={styles.header}
        onPress={toggleExpanded}
      >
        <View style={styles.headerContent} pointerEvents="box-none">
          {icon && <View style={styles.iconWrapper} pointerEvents="none">{icon}</View>}
          <View style={styles.titleContainer} pointerEvents="none">
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
          {badge && <View style={styles.badgeWrapper} pointerEvents="none">{badge}</View>}
        </View>
        <View style={styles.headerActions}>
          {/* Header Actions (e.g., buttons) - stops propagation */}
          {headerActions && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
              }}
            >
              {headerActions}
            </Pressable>
          )}
          {/* Right Element (e.g., mute button) - stops propagation */}
          {rightElement && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
              }}
            >
              {rightElement}
            </Pressable>
          )}
          {/* Chevron - rotates on expand/collapse */}
          <Animated.View
            style={{ transform: [{ rotate: chevronRotate }] }}
          >
            <ChevronDown size={20} color={colors.primary} />
          </Animated.View>
        </View>
      </Pressable>

      {/* Expandable Content - Always rendered but animated */}
      <Animated.View
        style={[
          styles.contentWrapper,
          {
            height: heightAnim,
            opacity: opacityAnim,
          }
        ]}
        pointerEvents={isExpanded ? 'auto' : 'none'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          {isEmpty && emptyMessage ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyMessage}>{emptyMessage}</Text>
            </View>
          ) : (
            children
          )}
        </ScrollView>

        {/* Draggable Handle */}
        {draggable && isExpanded && (
          <View
            style={styles.dragHandle}
            {...panResponder.panHandlers}
          >
            <GripVertical size={20} color={colors.textSecondary} />
          </View>
        )}
      </Animated.View>
    </View>
  );
};

// Styles using StyleSheet-compatible object - React Native Web compatible
const styles = {
  // Container
  container: {
    backgroundColor: colors.glass,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorderWhite,
    overflow: 'hidden' as const,
    // @ts-ignore - Web-specific property
    backdropFilter: 'blur(20px)',
    // @ts-ignore - Web-specific property
    WebkitBackdropFilter: 'blur(20px)',
  } as ViewStyle,

  // Header
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    // @ts-ignore - Web-specific property
    cursor: 'pointer',
  } as ViewStyle,

  // Header content
  headerContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
    gap: spacing.sm,
  } as ViewStyle,

  // Icon wrapper
  iconWrapper: {
    marginRight: spacing.xs,
  } as ViewStyle,

  // Title container
  titleContainer: {
    flex: 1,
  } as ViewStyle,

  // Title text
  title: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text,
  } as TextStyle,

  // Subtitle text
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  } as TextStyle,

  // Badge wrapper
  badgeWrapper: {
    marginLeft: spacing.sm,
  } as ViewStyle,

  // Header actions
  headerActions: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    marginLeft: spacing.sm,
  } as ViewStyle,

  // Content wrapper
  contentWrapper: {
    overflow: 'hidden' as const,
    position: 'relative' as const,
  } as ViewStyle,

  // ScrollView
  scrollView: {
    flex: 1,
  } as ViewStyle,

  // ScrollView content
  scrollViewContent: {
    padding: spacing.md,
    flexGrow: 1,
  } as ViewStyle,

  // Empty container
  emptyContainer: {
    paddingVertical: spacing.lg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  } as ViewStyle,

  // Empty message
  emptyMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center' as const,
  } as TextStyle,

  // Drag handle
  dragHandle: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: 32,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    // @ts-ignore - Web-specific property
    cursor: 'ns-resize',
  } as ViewStyle,
};

export default GlassDraggableExpander;
