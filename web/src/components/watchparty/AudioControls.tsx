import { View, Text, Pressable, Animated } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import { useRef, useEffect } from 'react'
import { colors } from '@bayit/shared/theme'

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

  const getButtonClass = () => {
    if (isConnecting) return 'bg-white/5 opacity-50'
    if (isMuted) return 'bg-white/5'
    if (isSpeaking) return 'bg-green-500/20'
    return 'bg-purple-700/30'
  }

  return (
    <View className="flex-row items-center gap-3" style={style}>
      <Pressable
        onPress={onToggleMute}
        disabled={isConnecting}
        className={`relative p-3 rounded-md ${getButtonClass()} ${!isConnecting ? 'hover:bg-white/10' : ''}`}
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
            className="absolute top-0 left-0 right-0 bottom-0 rounded-md bg-green-500/30"
            style={{ opacity: pulseAnim }}
          />
        )}
      </Pressable>

      {/* Connection status */}
      {isConnecting && (
        <Text className="text-xs text-gray-400">
          {t('watchParty.audio.connecting')}
        </Text>
      )}

      {/* Speaking indicator text */}
      {!isMuted && isSpeaking && (
        <Text className="text-xs text-emerald-400">
          {t('watchParty.audio.speaking')}
        </Text>
      )}
    </View>
  )
}
