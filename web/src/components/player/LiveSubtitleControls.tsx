/**
 * LiveSubtitleControls Component
 * Premium feature for real-time subtitle translation of live streams
 * Uses GlassLiveControlButton for consistent styling
 */

import { useState, useEffect, useRef } from 'react'
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import i18n from 'i18next'
import { Languages } from 'lucide-react'
import { useNotifications } from '@olorin/glass-ui/hooks'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { GlassLiveControlButton } from './controls/GlassLiveControlButton'
import { GlassView } from '@bayit/shared/ui'
import liveSubtitleService, { LiveSubtitleCue } from '@/services/liveSubtitleService'
import logger from '@/utils/logger'

const LANG_FLAGS: Record<string, string> = {
  he: '\u{1F1EE}\u{1F1F1}',
  en: '\u{1F1FA}\u{1F1F8}',
  ar: '\u{1F1F8}\u{1F1E6}',
  es: '\u{1F1EA}\u{1F1F8}',
  ru: '\u{1F1F7}\u{1F1FA}',
  fr: '\u{1F1EB}\u{1F1F7}',
  de: '\u{1F1E9}\u{1F1EA}',
  it: '\u{1F1EE}\u{1F1F9}',
  pt: '\u{1F1F5}\u{1F1F9}',
  yi: '\u{1F54D}',
}

interface LiveSubtitleControlsProps {
  channelId: string
  isLive: boolean
  isPremium: boolean
  videoElement: HTMLVideoElement | null
  onSubtitleCue: (cue: LiveSubtitleCue) => void
  onShowUpgrade?: () => void
  targetLang: string
  onLanguageChange: (lang: string) => void
  availableLanguages?: string[]
  sourceLanguage?: string
  onDisableDubbing?: () => void
  onHoveredButtonChange?: (button: string | null) => void
  quotaExceeded?: boolean
  isDubbingActive?: boolean
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
  availableLanguages = [],
  sourceLanguage = 'he',
  onDisableDubbing,
  onHoveredButtonChange,
  quotaExceeded = false,
  isDubbingActive = false,
}: LiveSubtitleControlsProps) {
  const { t } = useTranslation()
  const notifications = useNotifications()
  // Initialize enabled state by checking actual service connection
  const [enabled, setEnabled] = useState(() => liveSubtitleService.isServiceConnected())
  const [status, setStatus] = useState<ConnectionStatus>(() =>
    liveSubtitleService.isServiceConnected() ? 'connected' : 'disconnected'
  )
  const [error, setError] = useState<string | null>(null)
  const [showLangPicker, setShowLangPicker] = useState(false)
  const [inputLang, setInputLang] = useState(sourceLanguage)
  const prevLangRef = useRef<string>(targetLang)

  // Sync inputLang when sourceLanguage prop changes (e.g. channel switch)
  useEffect(() => {
    setInputLang(sourceLanguage)
  }, [sourceLanguage])

  // Sync UI when dubbing activates (mutual exclusivity - subtitles get disconnected externally)
  useEffect(() => {
    if (isDubbingActive && enabled) {
      setEnabled(false)
      setStatus('disconnected')
      setError(null)
    }
  }, [isDubbingActive])

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

  // Detect external connections (e.g., auto-enabled by trivia)
  // Poll every second to sync UI when service is connected externally
  useEffect(() => {
    const interval = setInterval(() => {
      const serviceConnected = liveSubtitleService.isServiceConnected()

      // Sync if service is connected but UI shows not enabled (any non-connected status)
      if (serviceConnected && (!enabled || status !== 'connected')) {
        logger.info(`Detected external subtitle connection - serviceConnected=${serviceConnected}, enabled=${enabled}, status=${status}`, 'LiveSubtitleControls')
        setEnabled(true)
        setStatus('connected')
        setError(null)
      }
      // Also sync disconnection
      if (!serviceConnected && enabled && status === 'connected') {
        logger.info(`Detected external subtitle disconnection - serviceConnected=${serviceConnected}, enabled=${enabled}, status=${status}`, 'LiveSubtitleControls')
        setEnabled(false)
        setStatus('disconnected')
      }
    }, 1000) // Check every second

    return () => clearInterval(interval)
  }, [enabled, status])

  // Handle target language changes - only reconnect if already connected
  useEffect(() => {
    if (enabled && videoElement && prevLangRef.current !== targetLang) {
      logger.debug(`Target language changed from ${prevLangRef.current} to ${targetLang}, reconnecting...`, 'LiveSubtitleControls')
      prevLangRef.current = targetLang
      liveSubtitleService.disconnect()
      setStatus('connecting')

      liveSubtitleService
        .connect(channelId, targetLang, videoElement, onSubtitleCue, (err) => {
          logger.error('Language change reconnection error', 'LiveSubtitleControls', err)
          setError(err)
          setStatus('error')
          setEnabled(false)
          notifications.showError(err, t('subtitles.connectionError', 'Live Translation Error'))
        }, inputLang)
        .then(() => {
          logger.debug('Language change reconnection successful', 'LiveSubtitleControls')
          setStatus('connected')
          setEnabled(true)
        })
        .catch((err) => {
          const errorMsg = err instanceof Error ? err.message : 'Reconnection failed'
          logger.error('Language change reconnection failed', 'LiveSubtitleControls', err)
          setError(errorMsg)
          setStatus('error')
          setEnabled(false)
          notifications.showError(errorMsg, t('subtitles.connectionError', 'Live Translation Error'))
        })
    } else {
      prevLangRef.current = targetLang
    }
  }, [targetLang, enabled, videoElement, channelId, onSubtitleCue, inputLang])

  // Handle input language changes - only reconnect if already connected
  const prevInputLangRef = useRef<string>(inputLang)
  useEffect(() => {
    if (enabled && videoElement && prevInputLangRef.current !== inputLang) {
      logger.debug(`Input language changed from ${prevInputLangRef.current} to ${inputLang}, reconnecting...`, 'LiveSubtitleControls')
      prevInputLangRef.current = inputLang
      liveSubtitleService.disconnect()
      setStatus('connecting')

      liveSubtitleService
        .connect(channelId, targetLang, videoElement, onSubtitleCue, (err) => {
          logger.error('Input language change reconnection error', 'LiveSubtitleControls', err)
          setError(err)
          setStatus('error')
          setEnabled(false)
          notifications.showError(err, t('subtitles.connectionError', 'Live Translation Error'))
        }, inputLang)
        .then(() => {
          logger.debug('Input language change reconnection successful', 'LiveSubtitleControls')
          setStatus('connected')
          setEnabled(true)
        })
        .catch((err) => {
          const errorMsg = err instanceof Error ? err.message : 'Reconnection failed'
          logger.error('Input language change reconnection failed', 'LiveSubtitleControls', err)
          setError(errorMsg)
          setStatus('error')
          setEnabled(false)
          notifications.showError(errorMsg, t('subtitles.connectionError', 'Live Translation Error'))
        })
    } else {
      prevInputLangRef.current = inputLang
    }
  }, [inputLang, enabled, videoElement, channelId, onSubtitleCue, targetLang])

  const handleToggle = async () => {
    // Prevent toggling while connection is in progress
    if (status === 'connecting') {
      logger.debug('Toggle ignored - connection in progress', 'LiveSubtitleControls')
      return
    }

    if (quotaExceeded) {
      logger.debug('Toggle ignored - quota exceeded', 'LiveSubtitleControls')
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
        setError(i18n.t('errors.player.notReady'))
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
            notifications.showError(err, t('subtitles.connectionError', 'Live Translation Error'))
          },
          inputLang
        )

        // Connection succeeded - update state
        prevLangRef.current = targetLang
        setStatus('connected')
        setEnabled(true)
        logger.debug('Live subtitle connection successful', 'LiveSubtitleControls')
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Connection failed'
        logger.error('Live subtitle connection failed', 'LiveSubtitleControls', err)
        setError(errorMsg)
        setStatus('error')
        setEnabled(false)
        notifications.showError(errorMsg, t('subtitles.connectionError', 'Live Translation Error'))
      }
    }
  }

  return (
    <View
      style={styles.container}
      onMouseEnter={() => onHoveredButtonChange?.('liveTranslate')}
      onMouseLeave={() => onHoveredButtonChange?.(null)}
    >
      <GlassLiveControlButton
        icon={
          <Languages
            size={18}
            color={enabled ? colors.primary : colors.textSecondary}
          />
        }
        label={t('subtitles.liveTranslate')}
        isEnabled={enabled}
        isConnecting={status === 'connecting'}
        isPremium={isPremium}
        quotaExceeded={quotaExceeded}
        onPress={handleToggle}
        tooltip={
          quotaExceeded
            ? t('quota.subtitleExceeded', 'Subtitle quota exceeded. Please try again later.')
            : enabled
            ? t('subtitles.translateActive', 'Live Translation Active')
            : isPremium
            ? t('subtitles.clickToEnable', 'Click to enable live translation')
            : t('subtitles.premiumRequired', 'Premium subscription required')
        }
        splitIcon={<Text style={styles.splitFlag}>{LANG_FLAGS[inputLang] || inputLang.toUpperCase()}</Text>}
        onSplitPress={() => setShowLangPicker(true)}
        splitAccessibilityLabel={t('subtitles.selectInputLanguage', 'Select input language')}
        splitTooltip={t('subtitles.inputLanguageTooltip', 'Check Input Language')}
      />

      {/* Language Picker Modal */}
      {showLangPicker && availableLanguages.length > 0 && (
        <Modal
          visible={showLangPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowLangPicker(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowLangPicker(false)}
          >
            <Pressable
              style={styles.modalContent}
              onPress={(e) => e.stopPropagation()}
            >
              <GlassView style={styles.langPickerContainer} intensity="high">
                <Text style={styles.langPickerTitle}>
                  {t('subtitles.selectInputLanguage', 'Select Input Language')}
                </Text>
                <View style={styles.langList}>
                  {availableLanguages.map((lang) => {
                    const flag = LANG_FLAGS[lang] || lang.toUpperCase()
                    const isSelected = lang === inputLang
                    return (
                      <Pressable
                        key={lang}
                        onPress={() => {
                          setInputLang(lang)
                          setShowLangPicker(false)
                        }}
                        style={[
                          styles.langItem,
                          isSelected && styles.langItemSelected,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={t(`languages.${lang}`, lang.toUpperCase())}
                        accessibilityState={{ selected: isSelected }}
                      >
                        <Text style={styles.langFlag}>{flag}</Text>
                        <Text style={styles.langName}>
                          {t(`languages.${lang}`, lang.toUpperCase())}
                        </Text>
                        {isSelected && (
                          <Text style={styles.langCheck}>{'\u2713'}</Text>
                        )}
                      </Pressable>
                    )
                  })}
                </View>
              </GlassView>
            </Pressable>
          </Pressable>
        </Modal>
      )}

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
  splitFlag: {
    fontSize: 14,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 360,
    maxHeight: '80%',
  },
  langPickerContainer: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: 500,
  },
  langPickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 92, 246, 0.3)',
  },
  langList: {
    gap: spacing.xs,
  },
  langItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  langItemSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    borderColor: 'rgba(139, 92, 246, 0.5)',
  },
  langFlag: {
    fontSize: 24,
  },
  langName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  langCheck: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary.DEFAULT,
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
