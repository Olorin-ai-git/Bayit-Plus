/**
 * DubbingControls Component
 * Premium feature for real-time audio dubbing of live streams
 * Uses Glass components for consistent styling and better UX
 */

import { useState, useEffect } from 'react'
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Radio, Mic } from 'lucide-react'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { isTV } from '@bayit/shared/utils/platform'
import { GlassLiveControlButton } from '../controls/GlassLiveControlButton'
import { GlassView } from '@bayit/shared/ui'
import { DubbingOnboarding } from './DubbingOnboarding'
import { VoiceSelector } from './VoiceSelector'
import { LiveDubbingService } from '@/services/liveDubbingService'
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

interface DubbingControlsProps {
  isEnabled: boolean
  isConnecting: boolean
  isAvailable: boolean
  isPremium: boolean
  quotaExceeded?: boolean
  targetLanguage: string
  availableLanguages: string[]
  availableVoices?: Array<{ id: string; name: string; description: string }>
  latencyMs: number
  error: string | null
  onToggle: () => void
  onLanguageChange: (lang: string) => void
  onShowUpgrade?: () => void
  onDisableSubtitles?: () => void
  onOriginalVolumeChange?: (volume: number) => void
  onDubbedVolumeChange?: (volume: number) => void
  onVoiceChange?: (voiceId: string) => void
  onHoveredButtonChange?: (button: string | null) => void
  sourceLanguage?: string
}

export default function DubbingControls({
  isEnabled,
  isConnecting,
  isAvailable,
  isPremium,
  quotaExceeded = false,
  targetLanguage,
  availableLanguages,
  availableVoices: availableVoicesProp = [],
  latencyMs,
  error,
  onToggle,
  onLanguageChange,
  onShowUpgrade,
  onDisableSubtitles,
  onOriginalVolumeChange,
  onDubbedVolumeChange,
  onVoiceChange,
  onHoveredButtonChange,
  sourceLanguage = 'he',
}: DubbingControlsProps) {
  const { t } = useTranslation()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showVoiceSelector, setShowVoiceSelector] = useState(false)
  const [showLangPicker, setShowLangPicker] = useState(false)
  const [inputLang, setInputLang] = useState(sourceLanguage)
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>()
  const [availableVoices, setAvailableVoices] = useState<Array<{ id: string; name: string; description: string }>>([])

  // Sync inputLang when sourceLanguage prop changes (e.g. channel switch)
  useEffect(() => {
    setInputLang(sourceLanguage)
  }, [sourceLanguage])

  // Load available voices from ElevenLabs API
  useEffect(() => {
    if (availableVoices.length === 0) {
      LiveDubbingService.getVoices()
        .then((voices) => {
          logger.debug('Loaded ElevenLabs voices', 'DubbingControls', { count: voices.length })
          setAvailableVoices(
            voices.map((v) => ({
              id: v.id,
              name: v.name,
              description: v.description || `${v.language} voice`,
            }))
          )
          // Set default voice if none selected
          if (!selectedVoiceId && voices.length > 0) {
            setSelectedVoiceId(voices[0].id)
          }
        })
        .catch((loadError) => {
          logger.error('Failed to load voices', 'DubbingControls', loadError)
        })
    }
  }, [])

  if (!isAvailable) return null

  const handlePress = () => {
    // Prevent action while connecting
    if (isConnecting) {
      return
    }

    if (quotaExceeded) {
      logger.debug('Press ignored - quota exceeded', 'DubbingControls', {})
      return
    }

    if (!isPremium) {
      onShowUpgrade?.()
      return
    }

    // Disable subtitles for mutual exclusivity before toggling
    if (!isEnabled && onDisableSubtitles) {
      logger.debug('Disabling subtitles for mutual exclusivity', 'DubbingControls', {})
      onDisableSubtitles()
    }

    onToggle()
  }

  return (
    <>
      <View style={styles.container}>
        {/* Main Toggle Button with split voice selector */}
        <View
          onMouseEnter={() => onHoveredButtonChange?.('liveDubbing')}
          onMouseLeave={() => onHoveredButtonChange?.(null)}
        >
          <GlassLiveControlButton
            icon={
              <Radio
                size={18}
                color={isEnabled ? colors.primary.DEFAULT : colors.textSecondary}
              />
            }
            label={t('dubbing.title', 'Live Dubbing')}
            isEnabled={isEnabled}
            isConnecting={isConnecting}
            isPremium={isPremium}
            quotaExceeded={quotaExceeded}
            onPress={handlePress}
            tooltip={
              quotaExceeded
                ? t('quota.dubbingExceeded', 'Dubbing quota exceeded. Please try again later.')
                : isEnabled
                ? t('dubbing.active', 'Live Dubbing Active')
                : isPremium
                ? t('dubbing.clickToEnable', 'Click to enable live dubbing')
                : t('dubbing.premiumRequired', 'Premium subscription required')
            }
            splitIcon={<Text style={styles.splitFlag}>{LANG_FLAGS[inputLang] || inputLang.toUpperCase()}</Text>}
            onSplitPress={() => setShowLangPicker(true)}
            splitAccessibilityLabel={t('dubbing.selectInputLanguage', 'Select input language')}
            splitTooltip={t('dubbing.inputLanguageTooltip', 'Check Input Language')}
          />
        </View>

        {/* Latency Indicator (only when connected) */}
        {isEnabled && !isConnecting && latencyMs > 0 && (
          <View style={styles.latencyBadge}>
            <Text style={styles.latencyText}>~{latencyMs}ms</Text>
          </View>
        )}

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>

      {/* Onboarding Modal */}
      <DubbingOnboarding
        visible={showOnboarding}
        isPremium={isPremium}
        onClose={(tryNow) => {
          setShowOnboarding(false)
          if (tryNow) {
            onToggle()
          }
        }}
      />

      {/* Input Language Picker Modal */}
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
                  {t('dubbing.selectInputLanguage', 'Select Input Language')}
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

                {/* Voice Selection shortcut */}
                <Pressable
                  onPress={() => {
                    setShowLangPicker(false)
                    setShowVoiceSelector(true)
                  }}
                  style={styles.voiceShortcut}
                  accessibilityRole="button"
                  accessibilityLabel={t('dubbing.selectVoice', 'Select Voice')}
                >
                  <Mic size={16} color={colors.textSecondary} />
                  <Text style={styles.voiceShortcutText}>
                    {t('dubbing.selectVoice', 'Select Voice')}
                  </Text>
                </Pressable>
              </GlassView>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* Voice Selector Modal */}
      <VoiceSelector
        visible={showVoiceSelector}
        voices={availableVoices}
        selectedVoiceId={selectedVoiceId}
        onSelect={(voiceId) => {
          setSelectedVoiceId(voiceId)
          onVoiceChange?.(voiceId)
          setShowVoiceSelector(false)
        }}
        onClose={() => setShowVoiceSelector(false)}
      />
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    position: 'relative',
  },
  splitFlag: {
    fontSize: 14,
    lineHeight: 18,
  },
  latencyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  latencyText: {
    color: '#93c5fd',
    fontSize: isTV ? 12 : 11,
    fontWeight: '600',
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
  voiceShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 92, 246, 0.2)',
  },
  voiceShortcutText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
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
