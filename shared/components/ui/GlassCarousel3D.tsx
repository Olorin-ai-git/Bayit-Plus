/**
 * GlassCarousel3D - Netflix-style 3D carousel with glassmorphism
 *
 * Features:
 * - 3D perspective transforms with rotation
 * - Center item enlargement
 * - Drag horizontally to rotate
 * - Swipe up to remove item (on active item only)
 * - Spring animations
 * - Glassmorphic styling
 * - RTL support
 */

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Pressable,
} from 'react-native'
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens'

interface GlassCarousel3DProps {
  /** Carousel items to render */
  children: React.ReactNode[]
  /** Width of each item (default: 180) */
  itemWidth?: number
  /** Height of each item (default: 270) */
  itemHeight?: number
  /** 3D perspective distance (default: 1200) */
  perspective?: number
  /** Maximum rotation angle in degrees (default: 25) */
  rotationFactor?: number
  /** Scale reduction per item distance (default: 0.12) */
  scaleFactor?: number
  /** Gap between items (default: 24) */
  gap?: number
  /** RTL layout support */
  isRTL?: boolean
  /** Controlled active index */
  activeIndex?: number
  /** Callback when index changes */
  onIndexChange?: (index: number) => void
  /** Callback when item is pressed */
  onItemPress?: (index: number) => void
  /** Callback when item is swiped up to remove */
  onSwipeUpRemove?: (index: number) => void
  /** Show pagination dots (default: true) */
  showPagination?: boolean
  /** Swipe up threshold in pixels (default: 80) */
  swipeUpThreshold?: number
}

const CARD_WIDTH = 180
const CARD_HEIGHT = 270
const PERSPECTIVE = 1200
const ROTATION_FACTOR = 25
const SCALE_FACTOR = 0.12
const SWIPE_UP_THRESHOLD = 80
const SPRING_CONFIG = { tension: 100, friction: 15, useNativeDriver: true }

export function GlassCarousel3D({
  children,
  itemWidth = CARD_WIDTH,
  itemHeight = CARD_HEIGHT,
  perspective = PERSPECTIVE,
  rotationFactor = ROTATION_FACTOR,
  scaleFactor = SCALE_FACTOR,
  gap = 24,
  isRTL = false,
  activeIndex: controlledIndex,
  onIndexChange,
  onItemPress,
  onSwipeUpRemove,
  showPagination = true,
  swipeUpThreshold = SWIPE_UP_THRESHOLD,
}: GlassCarousel3DProps) {
  const itemCount = React.Children.count(children)
  const isControlled = controlledIndex !== undefined

  // Internal state for uncontrolled mode
  const [internalIndex, setInternalIndex] = useState(0)
  const currentIndex = isControlled ? controlledIndex : internalIndex

  // Animation values
  const animatedIndex = useRef(new Animated.Value(currentIndex)).current
  const dragOffset = useRef(new Animated.Value(0)).current

  // Swipe up animation for active item
  const swipeUpOffset = useRef(new Animated.Value(0)).current
  const swipeUpOpacity = useRef(new Animated.Value(1)).current
  const [isSwipingUp, setIsSwipingUp] = useState(false)
  const [showRemoveHint, setShowRemoveHint] = useState(false)

  // Sync animated value with current index
  useEffect(() => {
    Animated.spring(animatedIndex, {
      toValue: currentIndex,
      ...SPRING_CONFIG,
    }).start()
  }, [currentIndex, animatedIndex])

  // Combined animated value for smooth transitions
  const combinedOffset = Animated.add(animatedIndex, dragOffset)

  // Update index
  const setIndex = useCallback((newIndex: number) => {
    const clampedIndex = Math.max(0, Math.min(itemCount - 1, newIndex))
    if (!isControlled) {
      setInternalIndex(clampedIndex)
    }
    onIndexChange?.(clampedIndex)
  }, [itemCount, isControlled, onIndexChange])

  // Snap to nearest index after drag
  const snapToIndex = useCallback((targetIndex: number) => {
    setIndex(targetIndex)

    // Reset drag offset with spring
    Animated.spring(dragOffset, {
      toValue: 0,
      ...SPRING_CONFIG,
    }).start()
  }, [setIndex, dragOffset])

  // Reset swipe up animation
  const resetSwipeUp = useCallback(() => {
    setIsSwipingUp(false)
    setShowRemoveHint(false)
    Animated.parallel([
      Animated.spring(swipeUpOffset, {
        toValue: 0,
        ...SPRING_CONFIG,
      }),
      Animated.spring(swipeUpOpacity, {
        toValue: 1,
        ...SPRING_CONFIG,
      }),
    ]).start()
  }, [swipeUpOffset, swipeUpOpacity])

  // Execute removal animation and callback
  const executeRemoval = useCallback((index: number) => {
    // Animate out
    Animated.parallel([
      Animated.timing(swipeUpOffset, {
        toValue: -itemHeight - 50,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(swipeUpOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Reset and call callback
      swipeUpOffset.setValue(0)
      swipeUpOpacity.setValue(1)
      setIsSwipingUp(false)
      setShowRemoveHint(false)
      onSwipeUpRemove?.(index)
    })
  }, [swipeUpOffset, swipeUpOpacity, itemHeight, onSwipeUpRemove])

  // Pan responder for horizontal carousel navigation
  const carouselPanResponder = useMemo(() => {
    if (itemCount <= 1) return { panHandlers: {} }

    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only handle horizontal swipes, let vertical pass through
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10
      },

      onPanResponderMove: (_, gestureState) => {
        // Convert drag distance to index offset
        const sensitivity = (itemWidth + gap) * 0.8
        const dragIndex = (isRTL ? gestureState.dx : -gestureState.dx) / sensitivity
        dragOffset.setValue(dragIndex)
      },

      onPanResponderRelease: (_, gestureState) => {
        const sensitivity = (itemWidth + gap) * 0.8
        const dragIndex = (isRTL ? gestureState.dx : -gestureState.dx) / sensitivity

        // Calculate target index based on drag distance and velocity
        let targetIndex = currentIndex
        if (Math.abs(dragIndex) > 0.25 || Math.abs(gestureState.vx) > 0.3) {
          const direction = dragIndex > 0 ? 1 : -1
          const magnitude = Math.ceil(Math.abs(dragIndex))
          targetIndex = currentIndex + direction * magnitude
        }

        snapToIndex(targetIndex)
      },

      onPanResponderTerminate: () => {
        Animated.spring(dragOffset, {
          toValue: 0,
          ...SPRING_CONFIG,
        }).start()
      },
    })
  }, [currentIndex, itemWidth, gap, isRTL, dragOffset, snapToIndex, itemCount])

  // Pan responder for swipe-up removal on active item
  const createItemPanResponder = useCallback((index: number) => {
    const isActive = index === currentIndex
    if (!isActive || !onSwipeUpRemove) return { panHandlers: {} }

    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Handle vertical swipes (swipe up)
        return gestureState.dy < -10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx)
      },

      onPanResponderGrant: () => {
        setIsSwipingUp(true)
      },

      onPanResponderMove: (_, gestureState) => {
        // Only allow upward movement
        const offset = Math.min(0, gestureState.dy)
        swipeUpOffset.setValue(offset)

        // Show remove hint when past threshold
        setShowRemoveHint(Math.abs(offset) > swipeUpThreshold * 0.5)

        // Fade out as it moves up
        const progress = Math.min(1, Math.abs(offset) / swipeUpThreshold)
        swipeUpOpacity.setValue(1 - progress * 0.5)
      },

      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -swipeUpThreshold || gestureState.vy < -0.5) {
          // Remove item
          executeRemoval(index)
        } else {
          // Snap back
          resetSwipeUp()
        }
      },

      onPanResponderTerminate: () => {
        resetSwipeUp()
      },
    })
  }, [currentIndex, onSwipeUpRemove, swipeUpOffset, swipeUpOpacity, swipeUpThreshold, executeRemoval, resetSwipeUp])

  // Render single item (no animation needed)
  const renderSingleItem = (child: React.ReactNode, index: number) => {
    const itemPanResponder = createItemPanResponder(index)

    return (
      <Animated.View
        key={index}
        style={[
          styles.itemContainer,
          {
            width: itemWidth,
            height: itemHeight,
            position: 'relative',
            transform: [{ translateY: swipeUpOffset }],
            opacity: swipeUpOpacity,
          },
        ]}
        {...itemPanResponder.panHandlers}
      >
        <Pressable
          onPress={() => onItemPress?.(index)}
          style={styles.itemPressable}
        >
          {child}
        </Pressable>
        {/* Remove hint overlay */}
        {showRemoveHint && index === currentIndex && (
          <View style={styles.removeHintOverlay}>
            <Text style={styles.removeHintText}>↑ Release to remove</Text>
          </View>
        )}
      </Animated.View>
    )
  }

  // Calculate transforms for each item
  const renderItem = (child: React.ReactNode, index: number) => {
    // Handle single item case - no animation needed
    if (itemCount <= 1) {
      return renderSingleItem(child, index)
    }

    const isActive = index === currentIndex
    const itemPanResponder = createItemPanResponder(index)

    // Create input range centered around current position
    const inputRange: number[] = []
    const translateXOutputRange: number[] = []
    const rotateYOutputRange: string[] = []
    const scaleOutputRange: number[] = []
    const opacityOutputRange: number[] = []

    for (let i = 0; i < itemCount; i++) {
      inputRange.push(i)
      const offset = index - i
      const absOffset = Math.abs(offset)

      // Position - spread items around center
      translateXOutputRange.push(offset * (itemWidth + gap) * (isRTL ? -1 : 1))

      // Rotation - items rotate based on their position from center
      const rotation = Math.max(-rotationFactor, Math.min(rotationFactor, offset * (rotationFactor / 1.5)))
      rotateYOutputRange.push(`${isRTL ? -rotation : rotation}deg`)

      // Scale - center item is largest
      const scale = absOffset === 0 ? 1 : Math.max(0.65, 1 - absOffset * scaleFactor)
      scaleOutputRange.push(scale)

      // Opacity - fade distant items
      const opacity = absOffset === 0 ? 1 : Math.max(0.35, 1 - absOffset * 0.25)
      opacityOutputRange.push(opacity)
    }

    const translateX = combinedOffset.interpolate({
      inputRange,
      outputRange: translateXOutputRange,
      extrapolate: 'clamp',
    })

    const rotateY = combinedOffset.interpolate({
      inputRange,
      outputRange: rotateYOutputRange,
      extrapolate: 'clamp',
    })

    const scale = combinedOffset.interpolate({
      inputRange,
      outputRange: scaleOutputRange,
      extrapolate: 'clamp',
    })

    const baseOpacity = combinedOffset.interpolate({
      inputRange,
      outputRange: opacityOutputRange,
      extrapolate: 'clamp',
    })

    // For active item, combine base opacity with swipe opacity
    const finalOpacity = isActive
      ? Animated.multiply(baseOpacity, swipeUpOpacity)
      : baseOpacity

    return (
      <Animated.View
        key={index}
        style={[
          styles.itemContainer,
          {
            width: itemWidth,
            height: itemHeight,
            transform: [
              { perspective },
              { translateX },
              { translateY: isActive ? swipeUpOffset : 0 },
              { rotateY },
              { scale },
            ],
            opacity: finalOpacity,
            zIndex: itemCount - Math.abs(index - currentIndex),
          },
        ]}
        {...(isActive ? itemPanResponder.panHandlers : {})}
      >
        <Pressable
          onPress={() => onItemPress?.(index)}
          style={styles.itemPressable}
        >
          {child}
        </Pressable>
        {/* Remove hint overlay */}
        {showRemoveHint && isActive && (
          <View style={styles.removeHintOverlay}>
            <Text style={styles.removeHintText}>↑ Release to remove</Text>
          </View>
        )}
      </Animated.View>
    )
  }

  // Handle empty case
  if (itemCount === 0) {
    return <View style={styles.container} />
  }

  return (
    <View style={styles.container}>
      {/* Swipe hint */}
      {onSwipeUpRemove && itemCount > 0 && (
        <View style={styles.swipeHintContainer}>
          <Text style={styles.swipeHintText}>Swipe up to remove</Text>
        </View>
      )}

      <View
        style={[
          styles.carouselTrack,
          {
            height: itemHeight + 60,
            // @ts-ignore - Web-specific perspective
            perspective: `${perspective}px`,
          },
        ]}
        {...(itemCount > 1 ? carouselPanResponder.panHandlers : {})}
      >
        <View style={styles.itemsWrapper}>
          {React.Children.map(children, (child, index) => renderItem(child, index))}
        </View>
      </View>

      {/* Pagination dots */}
      {showPagination && itemCount > 1 && (
        <View style={[styles.pagination, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {Array.from({ length: itemCount }).map((_, index) => (
            <Pressable
              key={index}
              onPress={() => setIndex(index)}
              style={styles.dotPressable}
            >
              <View
                style={[
                  styles.dot,
                  index === currentIndex && styles.dotActive,
                ]}
              />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
  swipeHintContainer: {
    marginBottom: spacing.sm,
  },
  swipeHintText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
  },
  carouselTrack: {
    width: '100%',
    overflow: 'visible',
    alignItems: 'center',
    justifyContent: 'center',
    // @ts-ignore - Web-specific
    cursor: 'grab',
    userSelect: 'none',
    touchAction: 'none',
  },
  itemsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  itemContainer: {
    position: 'absolute',
    // @ts-ignore - Web-specific
    transformStyle: 'preserve-3d',
    backfaceVisibility: 'hidden',
    willChange: 'transform, opacity',
  },
  itemPressable: {
    width: '100%',
    height: '100%',
  },
  removeHintOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    // @ts-ignore - Web-specific
    backdropFilter: 'blur(4px)',
  },
  removeHintText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  pagination: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  dotPressable: {
    padding: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.glass.bgLight,
    // @ts-ignore - Web transition
    transition: 'all 0.3s ease',
  },
  dotActive: {
    backgroundColor: colors.primary.DEFAULT,
    width: 28,
  },
})

export default GlassCarousel3D
