/**
 * AudioControls Component
 * Audio controls for Watch Party with mute toggle and speaking indicator
 */

import { View, Text, Pressable, Animated } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import { useRef, useEffect } from 'react'
import { colors } from '@olorin/design-tokens'
import { isTV } from '@bayit/shared/utils/platform'
import { styles } from './AudioControls.styles'

interface AudioControlsProps {
  isMuted?: boolean
  isSpeaking?: boolean
  isConnecting?: boolean
  isConnected?: boolean
  onToggleMute?: () => void
  style?: any
}

export default function AudioControls({
  isMuted = true,
  isSpeaking = false,
  isConnecting = false,
  isConnected = false,
  onToggleMute,
  style,
}: AudioControlsProps) {
  const { t } = useTranslation()
  const spinAnim = useRef(new Animated.Value(0)).current
  const pulseAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (isConnecting) {
      const animation = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      )
      animation.start()
      return () => animation.stop()
    }
  }, [isConnecting])

  useEffect(() => {
    if (isSpeaking && !isMuted) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      )
      animation.start()
      return () => animation.stop()
    }
  }, [isSpeaking, isMuted])

  if (!isConnected && !isConnecting) {
    return null
  }

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  const getButtonStyle = () => {
    if (isConnecting) return styles.buttonConnecting
    if (isMuted) return styles.buttonMuted
    if (isSpeaking) return styles.buttonSpeaking
    return styles.buttonActive
  }

  const iconSize = isTV ? 20 : 18

  return (
    <View style={[styles.container, style]}>
      <Pressable
        onPress={onToggleMute}
        disabled={isConnecting}
        style={[styles.button, getButtonStyle()]}
        accessibilityRole="button"
        accessibilityLabel={isMuted ? t('watchParty.audio.unmute') : t('watchParty.audio.mute')}
        accessibilityHint={isMuted ? t('watchParty.audio.unmuteHint') : t('watchParty.audio.muteHint')}
        accessibilityState={{ disabled: isConnecting, checked: !isMuted }}
      >
        {isConnecting ? (
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Loader2 size={iconSize} color={colors.textMuted} />
          </Animated.View>
        ) : isMuted ? (
          <MicOff size={iconSize} color={colors.textMuted} />
        ) : (
          <Mic size={iconSize} color={isSpeaking ? '#34D399' : colors.primary} />
        )}

        {isSpeaking && !isMuted && (
          <Animated.View
            style={[styles.speakingPulse, { opacity: pulseAnim }]}
          />
        )}
      </Pressable>

      {isConnecting && (
        <Text style={styles.statusText}>
          {t('watchParty.audio.connecting')}
        </Text>
      )}

      {!isMuted && isSpeaking && (
        <Text style={styles.speakingText}>
          {t('watchParty.audio.speaking')}
        </Text>
      )}
    </View>
  )
}
