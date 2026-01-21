import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, Animated, PanResponder, Easing, ScrollView } from 'react-native';
import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react';

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
    <View className="bg-black/20 rounded-lg border border-white/10 overflow-hidden backdrop-blur-xl" style={style}>
      {/* Header - Entire header is clickable to toggle */}
      <Pressable className="flex-row items-center justify-between p-3 border-b border-white/[0.08] cursor-pointer" onPress={toggleExpanded}>
        <View className="flex-row items-center flex-1 gap-2" pointerEvents="box-none">
          {icon && <View className="mr-1" pointerEvents="none">{icon}</View>}
          <View className="flex-1" pointerEvents="none">
            <Text className="text-lg font-semibold text-white">{title}</Text>
            {subtitle && <Text className="text-sm text-gray-400 mt-0.5">{subtitle}</Text>}
          </View>
          {badge && <View className="ml-2" pointerEvents="none">{badge}</View>}
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
          <Animated.View
            style={{ transform: [{ rotate: chevronRotate }] }}
          >
            <ChevronDown size={20} color="#a855f7" />
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
          contentContainerStyle={{ padding: 12, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          {isEmpty && emptyMessage ? (
            <View className="py-6 items-center justify-center">
              <Text className="text-sm text-gray-400 text-center">{emptyMessage}</Text>
            </View>
          ) : (
            children
          )}
        </ScrollView>

        {/* Draggable Handle */}
        {draggable && isExpanded && (
          <View
            className="absolute bottom-0 left-0 right-0 h-8 justify-center items-center bg-white/5 border-t border-white/[0.08] cursor-ns-resize"
            {...panResponder.panHandlers}
          >
            <GripVertical size={20} color="#9ca3af" />
          </View>
        )}
      </Animated.View>
    </View>
  );
};

export default GlassDraggableExpander;
