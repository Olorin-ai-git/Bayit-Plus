/**
 * LiveSplitSubtitleControls Component
 * Controls for enabling dual-language live subtitle split screen mode
 */

import { useState, useCallback, MouseEvent } from 'react'
import { View, Text, Pressable, Modal, StyleSheet, GestureResponderEvent } from 'react-native'
import { useTranslation } from 'react-i18next'
import { SplitSquareVertical, Check } from 'lucide-react'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { GlassLiveControlButton } from './controls/GlassLiveControlButton'
import { SplitLanguages, getLanguageInfo } from '@/types/subtitle'
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

interface LiveSplitSubtitleControlsProps {
  isLive: boolean
  isPremium: boolean
  splitMode: boolean
  splitLanguages: SplitLanguages | null
  onSplitModeToggle: (enabled: boolean) => void
  onSplitLanguagesChange: (languages: SplitLanguages) => void
  isConnected: boolean
  isConnecting: boolean
  availableLanguages?: string[]
  sourceLanguage?: string
  onShowUpgrade?: () => void
  onHoveredButtonChange?: (button: string | null) => void
  quotaExceeded?: boolean
  disabled?: boolean
}

export default function LiveSplitSubtitleControls({
  isLive,
  isPremium,
  splitMode,
  splitLanguages,
  onSplitModeToggle,
  onSplitLanguagesChange,
  isConnected,
  isConnecting,
  availableLanguages = ['en', 'es', 'fr', 'de', 'ru', 'ar'],
  sourceLanguage = 'he',
  onShowUpgrade,
  onHoveredButtonChange,
  quotaExceeded = false,
  disabled = false,
}: LiveSplitSubtitleControlsProps) {
  const { t } = useTranslation()
  const [showLangPicker, setShowLangPicker] = useState(false)
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(
    splitLanguages ? [splitLanguages[0], splitLanguages[1]] : []
  )

  // Handle toggle press
  const handleToggle = useCallback(() => {
    if (disabled || quotaExceeded) return

    if (!isPremium) {
      onShowUpgrade?.()
      return
    }

    if (splitMode) {
      onSplitModeToggle(false)
    } else {
      setShowLangPicker(true)
    }
  }, [disabled, quotaExceeded, isPremium, splitMode, onSplitModeToggle, onShowUpgrade])

  // Handle language selection
  const handleLanguageSelect = useCallback((lang: string) => {
    setSelectedLanguages((prev) => {
      if (prev.includes(lang)) {
        return prev.filter((l) => l !== lang)
      }
      if (prev.length >= 2) {
        // Replace the first selected language
        return [prev[1], lang]
      }
      return [...prev, lang]
    })
  }, [])

  // Confirm language selection
  const handleConfirmLanguages = useCallback(() => {
    if (selectedLanguages.length === 2) {
      const languages: SplitLanguages = [selectedLanguages[0], selectedLanguages[1]]
      onSplitLanguagesChange(languages)
      onSplitModeToggle(true)
      setShowLangPicker(false)
      logger.info('Live split mode enabled', 'LiveSplitSubtitleControls', { languages })
    }
  }, [selectedLanguages, onSplitLanguagesChange, onSplitModeToggle])

  // Filter out source language from available options
  const targetLanguages = availableLanguages.filter((lang) => lang !== sourceLanguage)

  // Early return if not live
  if (!isLive) return null

  const getStatusLabel = () => {
    if (isConnecting) return t('subtitles.splitScreen.connecting', 'Connecting...')
    if (isConnected) return t('subtitles.splitScreen.active', 'Split Active')
    if (splitMode) return t('subtitles.splitScreen.disconnected', 'Disconnected')
    return t('subtitles.splitScreen.clickToEnable', 'Enable split screen')
  }

  return (
    <View
      style={styles.container}
      onMouseEnter={() => onHoveredButtonChange?.('liveSplitTranslate')}
      onMouseLeave={() => onHoveredButtonChange?.(null)}
    >
      <GlassLiveControlButton
        icon={
          <SplitSquareVertical
            size={18}
            color={splitMode ? colors.primary.DEFAULT : colors.textSecondary}
          />
        }
        label={t('subtitles.splitScreen.toggle', 'Split Screen')}
        isEnabled={splitMode}
        isConnecting={isConnecting}
        isPremium={isPremium}
        quotaExceeded={quotaExceeded}
        onPress={handleToggle}
        tooltip={
          quotaExceeded
            ? t('quota.subtitleExceeded', 'Subtitle quota exceeded')
            : splitMode
            ? t('subtitles.splitScreen.clickToDisable', 'Click to disable split screen')
            : isPremium
            ? t('subtitles.splitScreen.clickToEnable', 'Click to enable split screen')
            : t('subtitles.premiumRequired', 'Premium subscription required')
        }
      />

      {/* Split Mode Status Indicator */}
      {splitMode && splitLanguages && (
        <View style={styles.statusIndicator}>
          <Text style={styles.statusFlag}>{LANG_FLAGS[splitLanguages[0]] || splitLanguages[0]}</Text>
          <Text style={styles.statusDivider}>/</Text>
          <Text style={styles.statusFlag}>{LANG_FLAGS[splitLanguages[1]] || splitLanguages[1]}</Text>
          <View style={[styles.statusDot, isConnected && styles.statusDotConnected]} />
        </View>
      )}

      {/* Language Selection Modal */}
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
            onPress={(e: GestureResponderEvent) => e.stopPropagation()}
          >
            <View style={styles.langPickerContainer}>
              <Text style={styles.langPickerTitle}>
                {t('subtitles.splitScreen.selectLanguages', 'Select Two Languages')}
              </Text>
              <Text style={styles.langPickerSubtitle}>
                {t('subtitles.splitScreen.selectTwoHint', 'Choose two languages for split screen subtitles')}
              </Text>

              {/* Language List */}
              <View style={styles.langList}>
                {targetLanguages.map((lang) => {
                  const flag = LANG_FLAGS[lang] || lang.toUpperCase()
                  const langInfo = getLanguageInfo(lang)
                  const isSelected = selectedLanguages.includes(lang)
                  const selectionIndex = selectedLanguages.indexOf(lang)

                  return (
                    <Pressable
                      key={lang}
                      onPress={() => handleLanguageSelect(lang)}
                      style={[
                        styles.langItem,
                        isSelected && styles.langItemSelected,
                      ]}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isSelected }}
                      accessibilityLabel={langInfo?.name || lang}
                    >
                      <Text style={styles.langFlag}>{flag}</Text>
                      <Text style={styles.langName}>
                        {langInfo?.nativeName || lang.toUpperCase()}
                      </Text>
                      {isSelected && (
                        <View style={styles.positionBadge}>
                          <Text style={styles.positionBadgeText}>
                            {selectionIndex === 0 ? 'LEFT' : 'RIGHT'}
                          </Text>
                        </View>
                      )}
                      {isSelected && <Check size={16} color={colors.primary.DEFAULT} />}
                    </Pressable>
                  )
                })}
              </View>

              {/* Preview */}
              {selectedLanguages.length === 2 && (
                <View style={styles.preview}>
                  <View style={styles.previewPane}>
                    <Text style={styles.previewFlag}>{LANG_FLAGS[selectedLanguages[0]]}</Text>
                    <Text style={styles.previewLabel}>{t('subtitles.splitScreen.left', 'LEFT')}</Text>
                  </View>
                  <View style={styles.previewDivider} />
                  <View style={styles.previewPane}>
                    <Text style={styles.previewFlag}>{LANG_FLAGS[selectedLanguages[1]]}</Text>
                    <Text style={styles.previewLabel}>{t('subtitles.splitScreen.right', 'RIGHT')}</Text>
                  </View>
                </View>
              )}

              {/* Confirm Button */}
              <Pressable
                onPress={handleConfirmLanguages}
                disabled={selectedLanguages.length !== 2}
                style={[
                  styles.confirmButton,
                  selectedLanguages.length !== 2 && styles.confirmButtonDisabled,
                ]}
              >
                <Text style={styles.confirmButtonText}>
                  {t('subtitles.splitScreen.confirm', 'Start Split Screen')}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
    backgroundColor: colors.glass,
  },
  statusFlag: {
    fontSize: 12,
  },
  statusDivider: {
    fontSize: 10,
    color: colors.textMuted,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textMuted,
    marginLeft: 4,
  },
  statusDotConnected: {
    backgroundColor: colors.success.DEFAULT,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  langPickerContainer: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: 600,
  },
  langPickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  langPickerSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
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
    fontSize: 20,
  },
  langName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  positionBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.primary.DEFAULT,
  },
  positionBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.5,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: borderRadius.lg,
  },
  previewPane: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  previewFlag: {
    fontSize: 28,
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  previewDivider: {
    width: 2,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 1,
  },
  confirmButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary.DEFAULT,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: colors.glassBorderWhite,
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
})
