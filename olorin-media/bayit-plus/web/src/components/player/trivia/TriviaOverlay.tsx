/**
 * TriviaOverlay Component
 * Displays trivia facts during video playback with glass design
 * Position: Bottom-left (no conflict with subtitles)
 *
 * Features:
 * - Platform-aware animations (useNativeDriver check)
 * - Safe area handling for iOS
 * - Keyboard navigation (Escape to dismiss)
 * - TTS conflict prevention
 * - tvOS 10-foot UI support
 */

import React, { useEffect, useRef, useCallback } from 'react'
import { Animated, Platform } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { TriviaFact } from '@bayit/shared-types/trivia'
import { TriviaCard } from './TriviaCard'
import { triviaStyles as styles } from './triviaStyles'

interface TriviaOverlayProps {
  fact: TriviaFact | null
  onDismiss: () => void
  isRTL?: boolean
  accessibilityLabel?: string
  isTTSPlaying?: boolean
}

// useNativeDriver is not supported on web
const useNativeDriver = Platform.OS !== 'web'

export function TriviaOverlay({
  fact,
  onDismiss,
  isRTL = false,
  accessibilityLabel,
  isTTSPlaying = false,
}: TriviaOverlayProps) {
  const { t, i18n } = useTranslation()
  const insets = useSafeAreaInsets()
  const isTV = Platform.isTV || Platform.OS === 'tvos'

  // Use refs for animations to prevent memory leaks
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(20)).current

  // Keyboard handler for web (Escape to dismiss)
  useEffect(() => {
    if (Platform.OS !== 'web' || !fact) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onDismiss()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [fact, onDismiss])

  useEffect(() => {
    // Don't show trivia if TTS is playing to avoid audio conflict
    if (isTTSPlaying && fact) {
      return
    }

    if (fact) {
      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver,
        }),
      ]).start()
    } else {
      // Animate out
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver,
        }),
        Animated.timing(slideAnim, {
          toValue: 20,
          duration: 200,
          useNativeDriver,
        }),
      ]).start()
    }

    // Cleanup: Stop animations on unmount to prevent memory leaks
    return () => {
      fadeAnim.stopAnimation()
      slideAnim.stopAnimation()
    }
  }, [fact, fadeAnim, slideAnim, isTTSPlaying])

  // Don't render if no fact or TTS is playing
  if (!fact || isTTSPlaying) return null

  const isHebrew = i18n.language === 'he' || isRTL

  // Apply safe area insets for iOS
  const safeAreaStyle = {
    bottom: Math.max(120, insets.bottom + 40), // 120px minimum for subtitle clearance
    left: isHebrew ? undefined : Math.max(16, insets.left),
    right: isHebrew ? Math.max(16, insets.right) : undefined,
  }

  return (
    <Animated.View
      style={[
        styles.container,
        isHebrew && styles.containerRTL,
        isTV && styles.containerTV,
        safeAreaStyle,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
      accessible={true}
      accessibilityRole="alert"
      accessibilityLabel={accessibilityLabel || `${t('trivia.didYouKnow')}: ${fact.text}`}
      accessibilityLiveRegion="polite"
      // @ts-ignore - Web-specific prop for keyboard focus
      {...(Platform.OS === 'web' ? { tabIndex: 0 } : {})}
    >
      <TriviaCard fact={fact} onDismiss={onDismiss} isRTL={isRTL} />
    </Animated.View>
  )
}

export default TriviaOverlay
