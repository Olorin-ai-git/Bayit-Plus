import React, { useState, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, PanResponder } from 'react-native';
import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { colors, spacing, borderRadius } from '../theme';

interface GlassDraggableExpanderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  onExpandChange?: (expanded: boolean) => void;
  draggable?: boolean;
  minHeight?: number;
  maxHeight?: number;
  style?: any;
}

export const GlassDraggableExpander: React.FC<GlassDraggableExpanderProps> = ({
  title,
  subtitle,
  badge,
  icon,
  children,
  defaultExpanded = false,
  onExpandChange,
  draggable = true,
  minHeight = 200,
  maxHeight = 800,
  style,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [contentHeight, setContentHeight] = useState(minHeight);
  const heightAnim = useRef(new Animated.Value(defaultExpanded ? minHeight : 0)).current;

  const toggleExpanded = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    onExpandChange?.(newExpanded);

    Animated.spring(heightAnim, {
      toValue: newExpanded ? contentHeight : 0,
      useNativeDriver: false,
      friction: 8,
    }).start();
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
          }).start();
        } else if (contentHeight > maxHeight - 50) {
          setContentHeight(maxHeight);
          Animated.spring(heightAnim, {
            toValue: maxHeight,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <Pressable style={styles.header} onPress={toggleExpanded}>
        <View style={styles.headerLeft}>
          {icon && <View style={styles.icon}>{icon}</View>}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
          {badge && <View style={styles.badgeContainer}>{badge}</View>}
        </View>
        <View style={styles.headerRight}>
          {isExpanded ? (
            <ChevronUp size={20} color={colors.text} />
          ) : (
            <ChevronDown size={20} color={colors.text} />
          )}
        </View>
      </Pressable>

      {/* Expandable Content */}
      {isExpanded && (
        <Animated.View style={[styles.content, { height: heightAnim }]}>
          <View style={styles.scrollContent}>{children}</View>

          {/* Draggable Handle */}
          {draggable && (
            <View
              style={styles.dragHandle}
              {...panResponder.panHandlers}
            >
              <GripVertical size={20} color={colors.textMuted} />
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    backdropFilter: 'blur(20px)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
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
    marginLeft: spacing.sm,
  },
  content: {
    overflow: 'hidden',
    position: 'relative',
  },
  scrollContent: {
    flex: 1,
    padding: spacing.md,
  },
  dragHandle: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    cursor: 'ns-resize',
  },
});
