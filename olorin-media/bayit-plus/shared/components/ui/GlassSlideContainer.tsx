/**
 * GlassSlideContainer Component
 * Horizontal slide-in/slide-out glassmorphic container with smooth animations
 * Part of the Olorin Glass UI Library
 *
 * @example
 * <GlassSlideContainer
 *   isOpen={showSettings}
 *   onClose={() => setShowSettings(false)}
 *   direction="left" // or "right"
 *   width={320}
 * >
 *   <Text>Content here</Text>
 * </GlassSlideContainer>
 */

import { useEffect, useRef } from 'react'
import { View, Pressable, StyleSheet, Animated, Dimensions } from 'react-native'
import { X } from 'lucide-react'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'

interface GlassSlideContainerProps {
  /** Whether the container is open */
  isOpen: boolean
  /** Callback when close button is pressed or backdrop is clicked */
  onClose: () => void
  /** Direction to slide from */
  direction?: 'left' | 'right'
  /** Width of the container in pixels */
  width?: number
  /** Animation duration in milliseconds */
  duration?: number
  /** Children to render inside the container */
  children: React.ReactNode
  /** Whether to show close button */
  showCloseButton?: boolean
  /** Whether to show backdrop overlay */
  showBackdrop?: boolean
  /** Custom z-index for positioning */
  zIndex?: number
}

export function GlassSlideContainer({
  isOpen,
  onClose,
  direction = 'right',
  width = 320,
  duration = 300,
  children,
  showCloseButton = true,
  showBackdrop = true,
  zIndex = 100,
}: GlassSlideContainerProps) {
  const slideAnim = useRef(new Animated.Value(direction === 'left' ? -width : width)).current
  const fadeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (isOpen) {
      // Slide in and fade in backdrop
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration,
          useNativeDriver: true,
        }),
      ]).start()
    } else {
      // Slide out and fade out backdrop
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: direction === 'left' ? -width : width,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration,
          useNativeDriver: true,
        }),
      ]).start()
    }
  }, [isOpen, slideAnim, fadeAnim, duration, direction, width])

  if (!isOpen && fadeAnim._value === 0) {
    return null
  }

  return (
    <>
      {/* Backdrop */}
      {showBackdrop && (
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: fadeAnim,
              zIndex,
            },
          ]}
        >
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={onClose}
          />
        </Animated.View>
      )}

      {/* Slide Container */}
      <Animated.View
        style={[
          styles.container,
          direction === 'left' ? styles.containerLeft : styles.containerRight,
          {
            width,
            transform: [{ translateX: slideAnim }],
            zIndex: zIndex + 1,
          },
        ]}
      >
        {/* Glass Background */}
        <View style={styles.glassBackground} />

        {/* Close Button */}
        {showCloseButton && (
          <Pressable
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={spacing.md}
          >
            <X size={20} color={colors.textSecondary} />
          </Pressable>
        )}

        {/* Content */}
        <View style={styles.content}>
          {children}
        </View>
      </Animated.View>
    </>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  containerLeft: {
    left: 0,
    borderTopRightRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
  },
  containerRight: {
    right: 0,
    borderTopLeftRadius: borderRadius.xl,
    borderBottomLeftRadius: borderRadius.xl,
  },
  glassBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17, 17, 34, 0.85)',
    backdropFilter: 'blur(20px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    paddingTop: spacing.xl * 2, // Space for close button
  },
})
