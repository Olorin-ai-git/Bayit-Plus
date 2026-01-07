import { View, Text, StyleSheet, Pressable, Animated } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Mic, MicOff, Loader2, Square } from 'lucide-react'
import { useVoiceRecording } from '@/hooks/useVoiceRecording'
import { useRef, useEffect } from 'react'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'

interface VoiceSearchButtonProps {
  onTranscribed: (text: string) => void
  onError?: (error: string) => void
  style?: any
  size?: 'sm' | 'md' | 'lg'
}

export default function VoiceSearchButton({
  onTranscribed,
  onError,
  style,
  size = 'md',
}: VoiceSearchButtonProps) {
  const { t } = useTranslation()
  const {
    isRecording,
    isTranscribing,
    error,
    hasPermission,
    isSupported,
    toggleRecording,
  } = useVoiceRecording({
    onTranscribed,
    onError,
  })

  const pulseAnim = useRef(new Animated.Value(0)).current
  const spinAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (isRecording) {
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
    } else {
      pulseAnim.setValue(0)
    }
  }, [isRecording])

  useEffect(() => {
    if (isTranscribing) {
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
  }, [isTranscribing])

  const sizeStyles = {
    sm: { button: styles.buttonSm, icon: 16 },
    md: { button: styles.buttonMd, icon: 20 },
    lg: { button: styles.buttonLg, icon: 24 },
  }

  const currentSize = sizeStyles[size]

  if (!isSupported) {
    return null
  }

  const getButtonStyle = () => {
    if (isRecording) return styles.buttonRecording
    if (isTranscribing) return styles.buttonTranscribing
    if (hasPermission === false) return styles.buttonNoPermission
    return styles.buttonDefault
  }

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  return (
    <View style={[styles.container, style]}>
      <Pressable
        onPress={toggleRecording}
        disabled={isTranscribing}
        style={({ hovered }) => [
          styles.button,
          currentSize.button,
          getButtonStyle(),
          hovered && !isRecording && !isTranscribing && styles.buttonHovered,
        ]}
      >
        {isTranscribing ? (
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Loader2 size={currentSize.icon} color={colors.primary} />
          </Animated.View>
        ) : isRecording ? (
          <Square size={currentSize.icon - 4} fill={colors.text} color={colors.text} />
        ) : hasPermission === false ? (
          <MicOff size={currentSize.icon} color="#F87171" />
        ) : (
          <Mic size={currentSize.icon} color={colors.text} />
        )}
      </Pressable>

      {/* Recording indicator ring */}
      {isRecording && (
        <Animated.View
          style={[
            styles.pulseRing,
            currentSize.button,
            {
              opacity: pulseAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.5, 0],
              }),
              transform: [{
                scale: pulseAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.5],
                }),
              }],
            },
          ]}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  button: {
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSm: {
    width: 32,
    height: 32,
  },
  buttonMd: {
    width: 40,
    height: 40,
  },
  buttonLg: {
    width: 48,
    height: 48,
  },
  buttonDefault: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  buttonHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  buttonRecording: {
    backgroundColor: '#EF4444',
  },
  buttonTranscribing: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  buttonNoPermission: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    opacity: 0.5,
  },
  pulseRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: '#EF4444',
  },
})
