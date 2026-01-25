/**
 * LiveSubtitleControls Component
 * Premium feature for real-time subtitle translation of live streams
 * Uses GlassLiveControlButton for consistent styling
 */

import { useState, useEffect, useRef } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
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

  // Sync UI state with actual service connection state ONLY on mount
  // DO NOT poll - it creates race conditions with async connection logic
  useEffect(() => {
    const isConnected = liveSubtitleService.isServiceConnected()
    if (isConnected) {
      setEnabled(true)
      setStatus('connected')
    }
    // Note: We don't set to disconnected if not connected, because the user
    // may have just clicked to connect and we don't want to override their intent
  }, [])

  // Handle language changes - only reconnect if already connected
  useEffect(() => {
    if (enabled && videoElement && prevLangRef.current !== targetLang) {
      logger.debug(`Language changed from ${prevLangRef.current} to ${targetLang}, reconnecting...`, 'LiveSubtitleControls')
      prevLangRef.current = targetLang
      liveSubtitleService.disconnect()
      setStatus('connecting')

      liveSubtitleService
        .connect(channelId, targetLang, videoElement, onSubtitleCue, (err) => {
          logger.error('Language change reconnection error', 'LiveSubtitleControls', err)
          setError(err)
          setStatus('error')
          setEnabled(false)
        })
        .then(() => {
          logger.debug('Language change reconnection successful', 'LiveSubtitleControls')
          setStatus('connected')
          setEnabled(true)
        })
        .catch((err) => {
          logger.error('Language change reconnection failed', 'LiveSubtitleControls', err)
          setError(err instanceof Error ? err.message : 'Reconnection failed')
          setStatus('error')
          setEnabled(false)
        })
    } else {
      prevLangRef.current = targetLang
    }
  }, [targetLang, enabled, videoElement, channelId, onSubtitleCue])

  const handleToggle = async () => {
    // Prevent toggling while connection is in progress
    if (status === 'connecting') {
      logger.debug('Toggle ignored - connection in progress', 'LiveSubtitleControls')
      return
    }

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
            logger.error('Subtitle connection error callback', 'LiveSubtitleControls', err)
            setError(err)
            setStatus('error')
            setEnabled(false)
          }
        )

        // Connection succeeded - update state
        prevLangRef.current = targetLang
        setStatus('connected')
        setEnabled(true)
        logger.debug('Live subtitle connection successful', 'LiveSubtitleControls')
      } catch (err) {
        logger.error('Live subtitle connection failed', 'LiveSubtitleControls', err)
        setError(err instanceof Error ? err.message : 'Connection failed')
        setStatus('error')
        setEnabled(false)
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
