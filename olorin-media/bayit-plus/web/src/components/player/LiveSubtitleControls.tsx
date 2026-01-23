/**
 * LiveSubtitleControls Component
 * Premium feature for real-time subtitle translation of live streams
 * Uses GlassLiveControlButton for consistent styling
 */

import { useState, useEffect, useRef } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { GlassLiveControlButton } from './controls/GlassLiveControlButton'
import liveSubtitleService, { LiveSubtitleCue } from '@/services/liveSubtitleService'
import logger from '@/utils/logger'

interface LiveSubtitleControlsProps {
  channelId: string
  isLive: boolean
  isPremium: boolean
  videoElement: HTMLVideoElement | null
  onSubtitleCue: (cue: LiveSubtitleCue) => void
  onShowUpgrade?: () => void
  targetLang: string
  onLanguageChange: (lang: string) => void
  onDisableDubbing?: () => void
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export default function LiveSubtitleControls({
  channelId,
  isLive,
  isPremium,
  videoElement,
  onSubtitleCue,
  onShowUpgrade,
  targetLang,
  onLanguageChange,
  onDisableDubbing,
}: LiveSubtitleControlsProps) {
  const { t } = useTranslation()
  // Initialize enabled state by checking actual service connection
  const [enabled, setEnabled] = useState(() => liveSubtitleService.isServiceConnected())
  const [status, setStatus] = useState<ConnectionStatus>(() =>
    liveSubtitleService.isServiceConnected() ? 'connected' : 'disconnected'
  )
  const [error, setError] = useState<string | null>(null)
  const prevLangRef = useRef<string>(targetLang)

  if (!isLive) return null

  // Sync UI state with actual service connection state on mount and periodically
  useEffect(() => {
    const syncConnectionState = () => {
      const isConnected = liveSubtitleService.isServiceConnected()
      setEnabled(isConnected)
      setStatus(isConnected ? 'connected' : 'disconnected')
    }

    // Initial sync
    syncConnectionState()

    // Periodic sync every second to detect disconnections
    const interval = setInterval(syncConnectionState, 1000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (enabled && videoElement && prevLangRef.current !== targetLang) {
      prevLangRef.current = targetLang
      liveSubtitleService.disconnect()
      setStatus('connecting')

      liveSubtitleService
        .connect(channelId, targetLang, videoElement, onSubtitleCue, (err) => {
          setError(err)
          setStatus('error')
          setEnabled(false)
        })
        .then(() => {
          setStatus('connected')
          setEnabled(true)
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Reconnection failed')
          setStatus('error')
        })
    } else {
      prevLangRef.current = targetLang
    }
  }, [targetLang, enabled, videoElement, channelId])

  const handleToggle = async () => {
    if (!isPremium) {
      onShowUpgrade?.()
      return
    }

    if (enabled) {
      liveSubtitleService.disconnect()
      setStatus('disconnected')
      setEnabled(false)
      setError(null)
    } else {
      if (!videoElement) {
        setError('Video not ready')
        return
      }

      // Disable dubbing before enabling subtitles (mutual exclusivity)
      if (onDisableDubbing) {
        logger.debug('Disabling dubbing for mutual exclusivity', 'LiveSubtitleControls', {});
        onDisableDubbing()
      }

      setStatus('connecting')
      setError(null)

      try {
        await liveSubtitleService.connect(
          channelId,
          targetLang,
          videoElement,
          onSubtitleCue,
          (err) => {
            setError(err)
            setStatus('error')
            setEnabled(false)
          }
        )

        prevLangRef.current = targetLang
        setStatus('connected')
        setEnabled(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Connection failed')
        setStatus('error')
      }
    }
  }

  return (
    <View style={styles.container}>
      <GlassLiveControlButton
        icon={
          <Globe
            size={18}
            color={enabled ? colors.primary : colors.textSecondary}
          />
        }
        label={t('subtitles.liveTranslate')}
        isEnabled={enabled}
        isConnecting={status === 'connecting'}
        isPremium={isPremium}
        onPress={handleToggle}
      />

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  errorContainer: {
    position: 'absolute',
    bottom: 52,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(220, 38, 38, 0.95)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
    maxWidth: 220,
  },
  errorText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
})
