import { View, Text, StyleSheet, Animated } from 'react-native'
import { useTranslation } from 'react-i18next'
import { RefreshCw, Check, Pause } from 'lucide-react'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
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
        style: styles.amber,
      }
    }
    if (isSynced) {
      return {
        icon: <Check size={14} color="#34D399" />,
        text: t('watchParty.synced'),
        style: styles.emerald,
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
      style: styles.blue,
    }
  }

  const state = getState()

  return (
    <View style={[styles.container, state.style]}>
      {state.icon}
      <Text style={[styles.text, state.style]}>{state.text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
  amber: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.2)',
    color: '#FBBF24',
  },
  emerald: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
    color: '#34D399',
  },
  blue: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: 'rgba(59, 130, 246, 0.2)',
    color: '#60A5FA',
  },
})
