import { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import { GlassView } from '@bayit/shared/ui'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'

interface OmriOverlayProps {
  onHide: () => void
}

export default function OmriOverlay({ onHide }: OmriOverlayProps) {
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    // Fade in animation
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start()

    // Start fade out after 4 seconds
    const fadeOutTimer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }).start()
    }, 4000)

    // Hide completely after 5 seconds
    const hideTimer = setTimeout(() => {
      onHide()
    }, 5000)

    return () => {
      clearTimeout(fadeOutTimer)
      clearTimeout(hideTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Animated.View
      style={[
        styles.overlayContainer,
        {
          opacity,
        },
      ]}
      pointerEvents="none"
    >
      <View style={styles.centerContainer}>
        <GlassView style={styles.card} intensity="high">
          <Text style={styles.message}>Omri is Aluves....</Text>
        </GlassView>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 600,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xxl * 1.5,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 300,
  },
  message: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
})
