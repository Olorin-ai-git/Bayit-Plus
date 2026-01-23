/**
 * WatchPartySyncOverlay Component
 * Displays sync status messages (paused, syncing, waiting) over video player
 */

import { useRef, useEffect } from 'react'
import { View, Text, Animated, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { RefreshCw, Check, Pause, Loader } from 'lucide-react'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { isTV } from '@bayit/shared/utils/platform'

interface WatchPartySyncOverlayProps {
  isHost: boolean
  isSynced: boolean
  hostPaused: boolean
  isBuffering?: boolean
}

type SyncState = 'synced' | 'paused' | 'syncing' | 'buffering'

export default function WatchPartySyncOverlay({
  isHost,
  isSynced,
  hostPaused,
  isBuffering = false,
}: WatchPartySyncOverlayProps) {
  const { t } = useTranslation()
  const spinAnim = useRef(new Animated.Value(0)).current
  const fadeAnim = useRef(new Animated.Value(0)).current

  // Determine current state
  const getSyncState = (): SyncState => {
    if (isBuffering) return 'buffering'
    if (hostPaused) return 'paused'
    if (isSynced) return 'synced'
    return 'syncing'
  }

  const state = getSyncState()

  // Spin animation for syncing/buffering icons
  useEffect(() => {
    if (state === 'syncing' || state === 'buffering') {
      const animation = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        })
      )
      animation.start()
      return () => animation.stop()
    }
  }, [state, spinAnim])

  // Fade in/out animation
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: state === 'synced' || isHost ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start()
  }, [state, isHost, fadeAnim])

  // Don't show anything for host or when synced
  if (isHost || state === 'synced') return null

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  // State configurations
  const stateConfig = {
    paused: {
      icon: <Pause size={isTV ? 32 : 24} color="#F59E0B" />,
      text: t('watchParty.hostPaused', 'Host paused'),
      bgColor: 'rgba(245, 158, 11, 0.15)',
      borderColor: 'rgba(245, 158, 11, 0.4)',
      textColor: '#F59E0B',
    },
    syncing: {
      icon: (
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <RefreshCw size={isTV ? 32 : 24} color={colors.primary} />
        </Animated.View>
      ),
      text: t('watchParty.syncing', 'Syncing with host...'),
      bgColor: colors.glassPurpleLight,
      borderColor: 'rgba(168, 85, 247, 0.5)',
      textColor: colors.primary,
    },
    buffering: {
      icon: (
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <Loader size={isTV ? 32 : 24} color="#3B82F6" />
        </Animated.View>
      ),
      text: t('watchParty.buffering', 'Buffering...'),
      bgColor: 'rgba(59, 130, 246, 0.15)',
      borderColor: 'rgba(59, 130, 246, 0.4)',
      textColor: '#3B82F6',
    },
    synced: {
      icon: <Check size={isTV ? 32 : 24} color="#34D399" />,
      text: t('watchParty.synced', 'Synced'),
      bgColor: 'rgba(52, 211, 153, 0.15)',
      borderColor: 'rgba(52, 211, 153, 0.4)',
      textColor: '#34D399',
    },
  }

  const config = stateConfig[state]

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: fadeAnim,
        },
      ]}
      pointerEvents="none"
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: config.bgColor,
            borderColor: config.borderColor,
          },
        ]}
      >
        <View style={styles.iconContainer}>{config.icon}</View>
        <Text
          style={[
            styles.text,
            {
              color: config.textColor,
            },
          ]}
        >
          {config.text}
        </Text>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: isTV ? spacing.xl : spacing.lg,
    paddingVertical: isTV ? spacing.lg : spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: isTV ? 20 : 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
})
