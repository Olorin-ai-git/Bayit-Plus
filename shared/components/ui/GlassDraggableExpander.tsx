import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, PanResponder, Easing, ScrollView } from 'react-native';
import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { colors, spacing, borderRadius } from '../theme';

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
      <Pressable style={styles.header} onPress={toggleExpanded}>
        <View style={styles.headerLeft} pointerEvents="box-none">
          {icon && <View style={styles.icon} pointerEvents="none">{icon}</View>}
          <View style={styles.titleContainer} pointerEvents="none">
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
          {badge && <View style={styles.badgeContainer} pointerEvents="none">{badge}</View>}
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
          <Animated.View 
            style={[
              styles.chevronContainer, 
              { transform: [{ rotate: chevronRotate }] }
            ]}
          >
            <ChevronDown size={20} color={colors.primary} />
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
          }
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
          <View
            style={styles.dragHandle}
            {...panResponder.panHandlers}
          >
            <GripVertical size={20} color={colors.textMuted} />
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.glass,  // Purple-tinted glass
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,  // Purple border
    overflow: 'hidden',
    backdropFilter: 'blur(20px)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorderLight,  // Purple border
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
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
  headerActionsContainer: {
    // Stops propagation - clicking this won't toggle
  },
  rightElementContainer: {
    // Stops propagation - clicking this won't toggle
  },
  chevronContainer: {
    // Chevron rotates on expand/collapse
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
    backgroundColor: colors.glassLight,  // Purple-tinted glass
    borderTopWidth: 1,
    borderTopColor: colors.glassBorderLight,  // Purple border
    cursor: 'ns-resize',
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
