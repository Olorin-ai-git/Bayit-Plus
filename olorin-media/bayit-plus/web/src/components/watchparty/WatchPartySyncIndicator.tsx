import { View, Text, Animated, StyleSheet } from 'react-native'
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
    <View className="flex-row items-center gap-2 px-3 py-2 rounded-full border" style={[state.containerStyle]}>
      {state.icon}
      <Text className="text-xs font-medium" style={[state.textStyle]}>{state.text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  containerPaused: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderColor: 'rgba(251, 191, 36, 0.2)',
  },
  textPaused: {
    color: '#FBBF24',
  },
  containerSynced: {
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    borderColor: 'rgba(52, 211, 153, 0.2)',
  },
  textSynced: {
    color: '#34D399',
  },
  containerSyncing: {
    backgroundColor: 'rgba(109, 40, 217, 0.2)',
    borderColor: 'rgba(109, 40, 217, 0.3)',
  },
  textSyncing: {
    color: '#60A5FA',
  },
})
