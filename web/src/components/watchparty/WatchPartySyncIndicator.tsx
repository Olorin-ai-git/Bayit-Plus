import { View, Text, Animated } from 'react-native'
import { useTranslation } from 'react-i18next'
import { RefreshCw, Check, Pause } from 'lucide-react'
import { useRef, useEffect } from 'react'

interface WatchPartySyncIndicatorProps {
  isHost: boolean
  isSynced: boolean
  hostPaused: boolean
}

export default function WatchPartySyncIndicator({ isHost, isSynced, hostPaused }: WatchPartySyncIndicatorProps) {
  const { t } = useTranslation()
  const spinAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!isSynced && !hostPaused) {
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
  }, [isSynced, hostPaused])

  if (isHost) return null

  const getState = () => {
    if (hostPaused) {
      return {
        icon: <Pause size={14} color="#FBBF24" />,
        text: t('watchParty.hostPaused'),
        containerClass: 'bg-amber-500/10 border-amber-500/20',
        textClass: 'text-amber-400',
      }
    }
    if (isSynced) {
      return {
        icon: <Check size={14} color="#34D399" />,
        text: t('watchParty.synced'),
        containerClass: 'bg-emerald-500/10 border-emerald-500/20',
        textClass: 'text-emerald-400',
      }
    }
    const spin = spinAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    })
    return {
      icon: (
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <RefreshCw size={14} color="#60A5FA" />
        </Animated.View>
      ),
      text: t('watchParty.syncing'),
      containerClass: 'bg-purple-700/20 border-purple-700/30',
      textClass: 'text-blue-400',
    }
  }

  const state = getState()

  return (
    <View className={`flex-row items-center gap-2 px-3 py-2 rounded-full border ${state.containerClass}`}>
      {state.icon}
      <Text className={`text-xs font-medium ${state.textClass}`}>{state.text}</Text>
    </View>
  )
}
