/**
 * GlassCarousel3D - Netflix-style 3D carousel with glassmorphism
 *
 * Features:
 * - 3D perspective transforms with rotation
 * - Center item enlargement
 * - Drag to rotate with momentum
 * - Spring animations
 * - Glassmorphic styling
 * - RTL support
 * - Platform-aware (Web, iOS, tvOS, Android)
 */

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import {
  View,
  StyleSheet,
  Animated,
  PanResponder,
  Platform,
  Pressable,
  type ViewStyle,
  type StyleProp,
} from 'react-native'
import { colors, spacing, borderRadius } from '../../theme'

export interface GlassCarousel3DProps {
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
  /** Container style */
  style?: StyleProp<ViewStyle>
  /** Show pagination dots (default: true) */
  showPagination?: boolean
  /** Auto-play interval in ms (0 to disable) */
  autoPlayInterval?: number
}

const CARD_WIDTH = 180
const CARD_HEIGHT = 270
const PERSPECTIVE = 1200
const ROTATION_FACTOR = 25
const SCALE_FACTOR = 0.12
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
  style,
  showPagination = true,
  autoPlayInterval = 0,
}: GlassCarousel3DProps) {
  const itemCount = React.Children.count(children)
  const isControlled = controlledIndex !== undefined

  // Internal state for uncontrolled mode
  const [internalIndex, setInternalIndex] = useState(0)
  const currentIndex = isControlled ? controlledIndex : internalIndex

  const animatedIndex = useRef(new Animated.Value(currentIndex)).current
  const dragOffset = useRef(new Animated.Value(0)).current
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Sync animated value with current index
  useEffect(() => {
    Animated.spring(animatedIndex, {
      toValue: currentIndex,
      ...SPRING_CONFIG,
    }).start()
  }, [currentIndex, animatedIndex])

  // Auto-play functionality
  useEffect(() => {
    if (autoPlayInterval > 0 && itemCount > 1) {
      autoPlayRef.current = setInterval(() => {
        const nextIndex = (currentIndex + 1) % itemCount
        setIndex(nextIndex)
      }, autoPlayInterval)

      return () => {
        if (autoPlayRef.current) {
          clearInterval(autoPlayRef.current)
        }
      }
    }
  }, [autoPlayInterval, currentIndex, itemCount])

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

  // Pan responder for drag gestures
  const panResponder = useMemo(() => {
    if (itemCount <= 1) return { panHandlers: {} }

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 10,

      onPanResponderGrant: () => {
        // Stop auto-play while dragging
        if (autoPlayRef.current) {
          clearInterval(autoPlayRef.current)
        }
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
        const velocity = isRTL ? gestureState.vx : -gestureState.vx

        // Calculate target index based on drag distance and velocity
        let targetIndex = currentIndex
        if (Math.abs(dragIndex) > 0.25 || Math.abs(velocity) > 0.3) {
          const direction = dragIndex > 0 ? 1 : -1
          const magnitude = Math.ceil(Math.abs(dragIndex))
          targetIndex = currentIndex + direction * magnitude
        }

        snapToIndex(targetIndex)
      },

      onPanResponderTerminate: () => {
        // Reset on cancel
        Animated.spring(dragOffset, {
          toValue: 0,
          ...SPRING_CONFIG,
        }).start()
      },
    })
  }, [currentIndex, itemWidth, gap, isRTL, dragOffset, snapToIndex, itemCount])

  // Render single item (no animation needed)
  const renderSingleItem = (child: React.ReactNode, index: number) => {
    return (
      <Pressable
        key={index}
        onPress={() => onItemPress?.(index)}
        style={[
          styles.itemContainer,
          {
            width: itemWidth,
            height: itemHeight,
            position: 'relative',
          },
        ]}
      >
        {child}
      </Pressable>
    )
  }

  // Calculate transforms for each item
  const renderItem = (child: React.ReactNode, index: number) => {
    // Handle single item case - no animation needed
    if (itemCount <= 1) {
      return renderSingleItem(child, index)
    }

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

    const opacity = combinedOffset.interpolate({
      inputRange,
      outputRange: opacityOutputRange,
      extrapolate: 'clamp',
    })

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
              { rotateY },
              { scale },
            ],
            opacity,
            zIndex: itemCount - Math.abs(index - currentIndex),
          },
        ]}
      >
        <Pressable
          onPress={() => onItemPress?.(index)}
          style={styles.itemPressable}
        >
          {child}
        </Pressable>
      </Animated.View>
    )
  }

  // Handle empty case
  if (itemCount === 0) {
    return <View style={[styles.container, style]} />
  }

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.carouselTrack,
          {
            height: itemHeight + 60,
            // @ts-ignore - Web-specific perspective
            ...(Platform.OS === 'web' && {
              perspective: `${perspective}px`,
            }),
          },
        ]}
        {...(itemCount > 1 ? panResponder.panHandlers : {})}
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
  carouselTrack: {
    width: '100%',
    overflow: 'visible',
    alignItems: 'center',
    justifyContent: 'center',
    // @ts-ignore - Web-specific
    ...(Platform.OS === 'web' && {
      cursor: 'grab',
      userSelect: 'none',
      touchAction: 'pan-y',
    }),
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
    ...(Platform.OS === 'web' && {
      transformStyle: 'preserve-3d',
      backfaceVisibility: 'hidden',
      willChange: 'transform, opacity',
    }),
  },
  itemPressable: {
    width: '100%',
    height: '100%',
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
    ...(Platform.OS === 'web' && {
      transition: 'all 0.3s ease',
    }),
  },
  dotActive: {
    backgroundColor: colors.primary.DEFAULT,
    width: 28,
  },
})

export default GlassCarousel3D
