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
  Animated,
  PanResponder,
  Easing,
  ScrollView,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { colors, spacing } from '../../theme';

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
    return <Text className="text-base" style={{ color: colors.primary }}>▼</Text>;
  };

  // Default drag handle icon
  const renderDragHandle = () => {
    if (dragHandleIcon) return dragHandleIcon;
    return <Text className="text-xl" style={{ color: colors.textMuted }}>⋮</Text>;
  };

  return (
    <View className="rounded-lg border overflow-hidden" style={[{ backgroundColor: colors.glass, borderColor: colors.glassBorder }, style]} testID={testID}>
      {/* Header - Entire header is clickable to toggle */}
      <Pressable className="flex-row items-center justify-between p-4 border-b" style={{ borderBottomColor: colors.glassBorderLight }} onPress={toggleExpanded}>
        <View className="flex-row items-center flex-1 gap-2" pointerEvents="box-none">
          {icon && (
            <View className="mr-1" pointerEvents="none">
              {icon}
            </View>
          )}
          <View className="flex-1" pointerEvents="none">
            <Text className="text-lg font-semibold" style={{ color: colors.text }}>{title}</Text>
            {subtitle && <Text className="text-[13px] mt-0.5" style={{ color: colors.textMuted }}>{subtitle}</Text>}
          </View>
          {badge && (
            <View className="ml-2" pointerEvents="none">
              {badge}
            </View>
          )}
        </View>
        <View className="flex-row items-center gap-2 ml-2">
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
          <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
            {renderChevron()}
          </Animated.View>
        </View>
      </Pressable>

      {/* Expandable Content - Always rendered but animated */}
      <Animated.View
        className="overflow-hidden relative"
        style={{
          height: heightAnim,
          opacity: opacityAnim,
        }}
        pointerEvents={isExpanded ? 'auto' : 'none'}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: spacing.md, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          {isEmpty && emptyMessage ? (
            <View className="py-6 items-center justify-center">
              <Text className="text-sm text-center" style={{ color: colors.textMuted }}>{emptyMessage}</Text>
            </View>
          ) : (
            children
          )}
        </ScrollView>

        {/* Draggable Handle */}
        {draggable && isExpanded && (
          <View className="absolute bottom-0 left-0 right-0 h-8 justify-center items-center border-t" style={{ backgroundColor: colors.glassLight, borderTopColor: colors.glassBorderLight }} {...panResponder.panHandlers}>
            {renderDragHandle()}
          </View>
        )}
      </Animated.View>
    </View>
  );
};

export default GlassDraggableExpander;
