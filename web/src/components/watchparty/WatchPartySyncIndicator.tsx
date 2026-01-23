import { View, Text, Animated } from 'react-native'
import { useTranslation } from 'react-i18next'
import { RefreshCw, Check, Pause } from 'lucide-react'
import { useRef, useEffect } from 'react'
import { styles } from './WatchPartySyncIndicator.styles'

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
        containerStyle: styles.containerPaused,
        textStyle: styles.textPaused,
      }
    }
    if (isSynced) {
      return {
        icon: <Check size={14} color="#34D399" />,
        text: t('watchParty.synced'),
        containerStyle: styles.containerSynced,
        textStyle: styles.textSynced,
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
      containerStyle: styles.containerSyncing,
      textStyle: styles.textSyncing,
    }
  }

  const state = getState()

  return (
    <View style={[styles.container, state.containerStyle]}>
      {state.icon}
      <Text style={[styles.text, state.textStyle]}>{state.text}</Text>
    </View>
  )
}