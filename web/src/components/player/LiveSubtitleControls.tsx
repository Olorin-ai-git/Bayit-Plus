/**
 * LiveSubtitleControls Component
 * Premium feature for real-time subtitle translation of live streams
 */

import { useState, useEffect, useRef } from 'react'
import { View, Text, Pressable, ActivityIndicator } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'
import { colors } from '@bayit/shared/theme'
import { GlassView } from '@bayit/shared/ui'
import liveSubtitleService, { LiveSubtitleCue } from '@/services/liveSubtitleService'
import { styles, AVAILABLE_LANGUAGES } from './LiveSubtitleControls.styles'

interface LiveSubtitleControlsProps {
  channelId: string
  isLive: boolean
  isPremium: boolean
  videoElement: HTMLVideoElement | null
  onSubtitleCue: (cue: LiveSubtitleCue) => void
  onShowUpgrade?: () => void
  targetLang: string
  onLanguageChange: (lang: string) => void
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
}: LiveSubtitleControlsProps) {
  const { t } = useTranslation()
  const [enabled, setEnabled] = useState(false)
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [error, setError] = useState<string | null>(null)
  const prevLangRef = useRef<string>(targetLang)

  // Don't render if not a live stream
  if (!isLive) return null

  // Reconnect when language changes while connected
  useEffect(() => {
    // Only reconnect if language actually changed and we're connected
    if (enabled && videoElement && prevLangRef.current !== targetLang) {
      console.log('🔄 [LiveSubtitleControls] Language changed, reconnecting:', prevLangRef.current, '->', targetLang)
      prevLangRef.current = targetLang

      liveSubtitleService.disconnect()
      setStatus('connecting')

      liveSubtitleService.connect(
        channelId,
        targetLang,
        videoElement,
        onSubtitleCue,
        (err) => {
          setError(err)
          setStatus('error')
          setEnabled(false)
        }
      ).then(() => {
        setStatus('connected')
        setEnabled(true)
      }).catch((err) => {
        console.error('❌ [LiveSubtitleControls] Reconnection failed:', err)
        setError(err instanceof Error ? err.message : 'Reconnection failed')
        setStatus('error')
      })
    } else {
      // Update ref even if not reconnecting
      prevLangRef.current = targetLang
    }
  }, [targetLang, enabled, videoElement, channelId])

  const handleToggle = async () => {
    // Check premium access
    if (!isPremium) {
      onShowUpgrade?.()
      return
    }

    if (enabled) {
      // Disconnect
      liveSubtitleService.disconnect()
      setStatus('disconnected')
      setEnabled(false)
      setError(null)
    } else {
      // Connect
      if (!videoElement) {
        setError('Video not ready')
        return
      }

      setStatus('connecting')
      setError(null)

      try {
        await liveSubtitleService.connect(
          channelId,
          targetLang,
          videoElement,
          (cue) => {
            onSubtitleCue(cue)
          },
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
      {/* Main Toggle Button */}
      <Pressable
        onPress={handleToggle}
        style={({ pressed, hovered }) => [
          styles.button,
          enabled && styles.buttonActive, // Active state takes priority
          !enabled && hovered && styles.buttonHovered, // Only show hover when not enabled
          !enabled && pressed && styles.buttonPressed, // Only show pressed when not enabled
          !isPremium && styles.buttonPremium,
        ]}
      >
        <Globe size={20} color={enabled ? colors.primary : colors.textSecondary} />
        <Text style={[styles.buttonText, enabled && styles.buttonTextActive]}>
          {isPremium ? t('subtitles.liveTranslate') : '⭐ Premium'}
        </Text>
        {status === 'connecting' && <ActivityIndicator size="small" color={colors.primary} />}
        {enabled && status === 'connected' && <View style={styles.connectedDot} />}
      </Pressable>

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  )
}
