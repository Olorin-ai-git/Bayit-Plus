import { View, Text, StyleSheet, Pressable, Animated } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import { useRef, useEffect } from 'react'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'

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

  return (
    <View style={[styles.container, style]}>
      <Pressable
        onPress={onToggleMute}
        disabled={isConnecting}
        style={({ hovered }) => [
          styles.button,
          getButtonStyle(),
          hovered && !isConnecting && styles.buttonHovered,
        ]}
      >
        {isConnecting ? (
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Loader2 size={18} color={colors.textMuted} />
          </Animated.View>
        ) : isMuted ? (
          <MicOff size={18} color={colors.textMuted} />
        ) : (
          <Mic size={18} color={isSpeaking ? '#34D399' : colors.primary} />
        )}

        {/* Speaking indicator pulse */}
        {isSpeaking && !isMuted && (
          <Animated.View
            style={[
              styles.pulse,
              { opacity: pulseAnim },
            ]}
          />
        )}
      </Pressable>

      {/* Connection status */}
      {isConnecting && (
        <Text style={styles.statusText}>
          {t('watchParty.audio.connecting')}
        </Text>
      )}

      {/* Speaking indicator text */}
      {!isMuted && isSpeaking && (
        <Text style={styles.speakingText}>
          {t('watchParty.audio.speaking')}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  button: {
    position: 'relative',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  buttonConnecting: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    opacity: 0.5,
  },
  buttonMuted: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  buttonActive: {
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
  },
  buttonSpeaking: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  buttonHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  pulse: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
  },
  statusText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  speakingText: {
    fontSize: 12,
    color: '#34D399',
  },
})
