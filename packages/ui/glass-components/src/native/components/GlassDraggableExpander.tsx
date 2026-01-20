/**
 * GlassDraggableExpander Component
 *
 * Expandable container with draggable resize handle.
 * Features glassmorphism styling and smooth animations.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  PanResponder,
  Easing,
  ScrollView,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { colors, spacing, borderRadius } from '../../theme';

export interface GlassDraggableExpanderProps {
  /** Section title */
  title: string;
  /** Section subtitle */
  subtitle?: string;
  /** Badge element to display */
  badge?: React.ReactNode;
  /** Icon element to display */
  icon?: React.ReactNode;
  /** Right side element */
  rightElement?: React.ReactNode;
  /** Header action buttons */
  headerActions?: React.ReactNode;
  /** Expander content */
  children: React.ReactNode;
  /** Default expanded state */
  defaultExpanded?: boolean;
  /** Expand state change callback */
  onExpandChange?: (expanded: boolean) => void;
  /** Enable drag resize */
  draggable?: boolean;
  /** Minimum content height */
  minHeight?: number;
  /** Maximum content height */
  maxHeight?: number;
  /** Show empty state */
  isEmpty?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Custom chevron icon */
  chevronIcon?: React.ReactNode;
  /** Custom drag handle icon */
  dragHandleIcon?: React.ReactNode;
  /** Additional styles */
  style?: StyleProp<ViewStyle>;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Glassmorphic draggable expander component
 */
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
  chevronIcon,
  dragHandleIcon,
  style,
  testID,
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
  }, [defaultExpanded, heightAnim, minHeight, opacityAnim, rotateAnim]);

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
        tension: 50,
        friction: 10,
        overshootClamping: false,
      }),
      // Opacity fade in/out with smooth easing
      Animated.timing(opacityAnim, {
        toValue: newExpanded ? 1 : 0,
        duration: 250,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      // Chevron rotation with smooth easing
      Animated.timing(rotateAnim, {
        toValue: newExpanded ? 1 : 0,
        duration: 250,
        easing: Easing.inOut(Easing.ease),
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

        const newHeight = Math.max(minHeight, Math.min(maxHeight, contentHeight + gestureState.dy));
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

  // Default chevron icon
  const renderChevron = () => {
    if (chevronIcon) return chevronIcon;
    return <Text style={styles.chevronText}>▼</Text>;
  };

  // Default drag handle icon
  const renderDragHandle = () => {
    if (dragHandleIcon) return dragHandleIcon;
    return <Text style={styles.dragHandleText}>⋮</Text>;
  };

  return (
    <View style={[styles.container, style]} testID={testID}>
      {/* Header - Entire header is clickable to toggle */}
      <Pressable style={styles.header} onPress={toggleExpanded}>
        <View style={styles.headerLeft} pointerEvents="box-none">
          {icon && (
            <View style={styles.icon} pointerEvents="none">
              {icon}
            </View>
          )}
          <View style={styles.titleContainer} pointerEvents="none">
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
          {badge && (
            <View style={styles.badgeContainer} pointerEvents="none">
              {badge}
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          {/* Header Actions (e.g., buttons) - stops propagation */}
          {headerActions && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
              }}
              style={styles.headerActionsContainer}
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
              style={styles.rightElementContainer}
            >
              {rightElement}
            </Pressable>
          )}
          {/* Chevron - rotates on expand/collapse */}
          <Animated.View style={[styles.chevronContainer, { transform: [{ rotate: chevronRotate }] }]}>
            {renderChevron()}
          </Animated.View>
        </View>
      </Pressable>

      {/* Expandable Content - Always rendered but animated */}
      <Animated.View
        style={[
          styles.content,
          {
            height: heightAnim,
            opacity: opacityAnim,
          },
        ]}
        pointerEvents={isExpanded ? 'auto' : 'none'}
      >
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
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
          <View style={styles.dragHandle} {...panResponder.panHandlers}>
            {renderDragHandle()}
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.glass,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorderLight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  icon: {
    marginRight: spacing.xs,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  badgeContainer: {
    marginLeft: spacing.sm,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: spacing.sm,
  },
  headerActionsContainer: {},
  rightElementContainer: {},
  chevronContainer: {},
  chevronText: {
    fontSize: 16,
    color: colors.primary,
  },
  content: {
    overflow: 'hidden',
    position: 'relative',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    flexGrow: 1,
  },
  dragHandle: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.glassLight,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorderLight,
  },
  dragHandleText: {
    fontSize: 20,
    color: colors.textMuted,
  },
  emptyContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyMessage: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

export default GlassDraggableExpander;
