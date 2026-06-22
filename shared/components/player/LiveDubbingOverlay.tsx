/**
 * LiveDubbingOverlay - Cross-Platform Component
 * Displays current transcript and translation during live dubbing
 * Supports TV with larger fonts and RTL languages
 */

import React, { useEffect, useRef } from 'react'
import { View, Text, Animated } from 'react-native'
import { useTranslation } from 'react-i18next'
import { isTV } from '../../utils/platform'
import { useDirection } from '../../hooks/useDirection'

export interface LiveDubbingOverlayProps {
  isActive: boolean
  originalText: string
  translatedText: string
  latencyMs: number
  showTranscript?: boolean
}

export const LiveDubbingOverlay: React.FC<LiveDubbingOverlayProps> = ({
  isActive,
  originalText,
  translatedText,
  latencyMs,
  showTranscript = true,
}) => {
  const { t } = useTranslation()
  const { textAlign, flexDirection } = useDirection()
  const fadeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (translatedText) {
      // Fade in when new text arrives
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        // Fade out after 4 seconds
        Animated.delay(4000),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start()
    }
  }, [translatedText, fadeAnim])

  if (!isActive || !translatedText) return null

  return (
    <Animated.View
      style={{ opacity: fadeAnim }}
      className={`absolute ${isTV ? 'bottom-32' : 'bottom-24'} left-4 right-4 items-center z-50`}
    >
      {/* Active indicator */}
      <View
        className={`flex-${flexDirection} items-center gap-2 px-3 py-1 mb-2 rounded-xl
          bg-purple-700/20 border border-purple-500/40`}
      >
        <Text className="text-lg">🔊</Text>
        <Text className={`${isTV ? 'text-base' : 'text-xs'} font-semibold text-purple-300`}>
          {t('dubbing.liveDubbing', 'Live Dubbing')}
        </Text>
        <View className="bg-black/40 px-2 py-0.5 rounded">
          <Text className={`${isTV ? 'text-sm' : 'text-[10px]'} text-gray-400 font-medium`}>
            {latencyMs}ms
          </Text>
        </View>
      </View>

      {/* Original text (optional, smaller) */}
      {showTranscript && originalText && (
        <View className={`bg-black/60 px-3 py-1.5 rounded-lg mb-1 ${isTV ? 'max-w-[80%]' : 'max-w-[90%]'}`}>
          <Text
            className={`${isTV ? 'text-lg' : 'text-sm'} text-gray-400 italic`}
            style={{ textAlign }}
            numberOfLines={2}
          >
            {originalText}
          </Text>
        </View>
      )}

      {/* Translated text (primary display) */}
      <View
        className={`bg-black/85 ${isTV ? 'px-6 py-4' : 'px-4 py-2.5'} rounded-lg
          border border-white/10 ${isTV ? 'max-w-[85%]' : 'max-w-[95%]'}`}
      >
        <Text
          className={`${isTV ? 'text-[32px]' : 'text-xl'} font-bold text-white`}
          style={{
            textAlign,
            textShadowColor: 'rgba(0, 0, 0, 1)',
            textShadowOffset: { width: 2, height: 2 },
            textShadowRadius: 4,
            lineHeight: isTV ? 40 : 28,
          }}
        >
          {translatedText}
        </Text>
      </View>
    </Animated.View>
  )
}

export default LiveDubbingOverlay
