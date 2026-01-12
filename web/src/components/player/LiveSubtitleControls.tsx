/**
 * LiveSubtitleControls Component
 * Premium feature for real-time subtitle translation of live streams
 */

import { useState } from 'react'
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
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export default function LiveSubtitleControls({
  channelId,
  isLive,
  isPremium,
  videoElement,
  onSubtitleCue,
  onShowUpgrade,
}: LiveSubtitleControlsProps) {
  const { t } = useTranslation()
  const [enabled, setEnabled] = useState(false)
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [targetLang, setTargetLang] = useState('en')
  const [showLangSelector, setShowLangSelector] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Don't render if not a live stream
  if (!isLive) return null

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

        setStatus('connected')
        setEnabled(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Connection failed')
        setStatus('error')
      }
    }
  }

  const handleLanguageChange = (langCode: string) => {
    setTargetLang(langCode)
    setShowLangSelector(false)

    // If already connected, reconnect with new language
    if (enabled && videoElement) {
      liveSubtitleService.disconnect()
      setStatus('connecting')

      liveSubtitleService.connect(
        channelId,
        langCode,
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
      })
    }
  }

  const currentLang = AVAILABLE_LANGUAGES.find(l => l.code === targetLang)

  return (
    <View style={styles.container}>
      {/* Main Toggle Button */}
      <Pressable
        onPress={handleToggle}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
          enabled && styles.buttonActive,
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

      {/* Language Selector Button */}
      {enabled && isPremium && (
        <Pressable
          onPress={() => setShowLangSelector(!showLangSelector)}
          style={({ pressed }) => [styles.langButton, pressed && styles.buttonPressed]}
        >
          <Text style={styles.langFlag}>{currentLang?.flag || '🌐'}</Text>
        </Pressable>
      )}

      {/* Language Selector Menu */}
      {showLangSelector && (
        <GlassView style={styles.langMenu}>
          <View style={styles.menuHeader}>
            <Text style={styles.menuTitle}>{t('subtitles.translateTo')}</Text>
          </View>

          {AVAILABLE_LANGUAGES.map((lang) => (
            <Pressable
              key={lang.code}
              onPress={() => handleLanguageChange(lang.code)}
              style={({ pressed }) => [
                styles.langItem,
                pressed && styles.langItemPressed,
                targetLang === lang.code && styles.langItemActive,
              ]}
            >
              <Text style={styles.langItemFlag}>{lang.flag}</Text>
              <Text style={styles.langItemText}>{lang.label}</Text>
              {targetLang === lang.code && <View style={styles.activeDot} />}
            </Pressable>
          ))}
        </GlassView>
      )}

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  )
}
