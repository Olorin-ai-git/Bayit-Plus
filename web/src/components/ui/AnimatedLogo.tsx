import { useState, useEffect } from 'react'
import { View, Text, Image, StyleSheet, Animated } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRef } from 'react'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'

interface AnimatedLogoProps {
  size?: 'small' | 'medium' | 'large'
  onAnimationComplete?: () => void
}

/**
 * AnimatedLogo Component
 * Matches TV app's AnimatedLogo with sliding text animation
 * - "בית" slides from right, "+" slides from left (Hebrew)
 * - Logo image fades in after text animation completes
 */
export default function AnimatedLogo({
  size = 'large',
  onAnimationComplete,
}: AnimatedLogoProps) {
  const { i18n } = useTranslation()
  const isHebrew = i18n.language === 'he'

  const bayitAnim = useRef(new Animated.Value(isHebrew ? 150 : -150)).current
  const plusAnim = useRef(new Animated.Value(isHebrew ? -150 : 150)).current
  const textOpacity = useRef(new Animated.Value(0)).current
  const logoOpacity = useRef(new Animated.Value(0)).current
  const logoScale = useRef(new Animated.Value(0.9)).current

  const sizes = {
    small: { logo: 64, text: 24, plus: 20, gap: spacing.xs },
    medium: { logo: 96, text: 36, plus: 28, gap: spacing.sm },
    large: { logo: 128, text: 48, plus: 40, gap: spacing.md },
  }

  const currentSize = sizes[size] || sizes.large

  useEffect(() => {
    // Animation sequence matching TV app
    const timers: NodeJS.Timeout[] = []

    // 1. Show text and start sliding
    timers.push(setTimeout(() => {
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }).start()
    }, 100))

    // 2. Animate text to center
    timers.push(setTimeout(() => {
      Animated.parallel([
        Animated.spring(bayitAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(plusAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start()
    }, 150))

    // 3. Fade in logo
    timers.push(setTimeout(() => {
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start()
    }, 1000))

    // 4. Animation complete callback
    timers.push(setTimeout(() => {
      onAnimationComplete?.()
    }, 2200))

    return () => timers.forEach(clearTimeout)
  }, [onAnimationComplete])

  return (
    <View style={[styles.container, { gap: currentSize.gap }]}>
      {/* Logo Image - fades in after text */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            width: currentSize.logo,
            height: currentSize.logo / 2,
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Image
          source={{ uri: '/logo.png' }}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Animated Text */}
      <View style={styles.textContainer}>
        {isHebrew ? (
          <>
            {/* Hebrew: בית+ */}
            <Animated.Text
              style={[
                styles.bayitText,
                {
                  fontSize: currentSize.text,
                  opacity: textOpacity,
                  transform: [{ translateX: bayitAnim }],
                },
              ]}
            >
              בית
            </Animated.Text>
            <Animated.Text
              style={[
                styles.plusText,
                {
                  fontSize: currentSize.plus,
                  opacity: textOpacity,
                  transform: [{ translateX: plusAnim }],
                  marginLeft: spacing.xs,
                },
              ]}
            >
              +
            </Animated.Text>
          </>
        ) : (
          <>
            {/* English/Spanish: Bayit+ */}
            <Animated.Text
              style={[
                styles.plusText,
                {
                  fontSize: currentSize.plus,
                  opacity: textOpacity,
                  transform: [{ translateX: plusAnim }],
                  marginRight: spacing.xs,
                },
              ]}
            >
              +
            </Animated.Text>
            <Animated.Text
              style={[
                styles.bayitText,
                {
                  fontSize: currentSize.text,
                  opacity: textOpacity,
                  transform: [{ translateX: bayitAnim }],
                },
              ]}
            >
              Bayit
            </Animated.Text>
          </>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    marginBottom: -8,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  bayitText: {
    fontWeight: 'bold',
    color: colors.text,
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  plusText: {
    fontWeight: 'bold',
    color: colors.primary,
    textShadowColor: 'rgba(0, 217, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
})
