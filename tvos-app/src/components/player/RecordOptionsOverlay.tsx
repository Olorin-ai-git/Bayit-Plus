/**
 * RecordOptionsOverlay (tvOS)
 * Focus-navigable modal for recording options on Apple TV
 */

import React, { useState, useCallback } from 'react'
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Circle, Subtitles, Volume2, Check } from 'lucide-react-native'
import { GlassModal, GlassTVSwitch } from '@olorin/glass-ui/native'
import { colors, spacing, borderRadius, fontSizeTV } from '@olorin/design-tokens'
import { AVAILABLE_LANGUAGES, LanguageOption } from '@bayit/shared-types/recording'
import logger from '@/utils/logger'

export interface TVRecordingOptions {
  subtitleEnabled: boolean
  subtitleTargetLanguage: string
  dubbingEnabled: boolean
  dubbingTargetLanguage: string
}

interface RecordOptionsOverlayProps {
  visible: boolean
  onClose: () => void
  onStartRecording: (options: TVRecordingOptions) => void
}

export const RecordOptionsOverlay: React.FC<RecordOptionsOverlayProps> = ({
  visible,
  onClose,
  onStartRecording,
}) => {
  const { t } = useTranslation()

  const [subtitleEnabled, setSubtitleEnabled] = useState(true)
  const [subtitleLang, setSubtitleLang] = useState('en')
  const [dubbingEnabled, setDubbingEnabled] = useState(false)
  const [dubbingLang, setDubbingLang] = useState('en')

  const handleStart = useCallback(() => {
    logger.info('TV recording started', 'RecordOptionsOverlay', {
      subtitleEnabled, dubbingEnabled,
    })
    onStartRecording({
      subtitleEnabled,
      subtitleTargetLanguage: subtitleLang,
      dubbingEnabled,
      dubbingTargetLanguage: dubbingLang,
    })
    onClose()
  }, [subtitleEnabled, subtitleLang, dubbingEnabled, dubbingLang, onStartRecording, onClose])

  return (
    <GlassModal
      visible={visible}
      onClose={onClose}
      size="lg"
      dismissable
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Title */}
        <Text style={styles.title}>{t('recordings.recordOptions')}</Text>

        {/* Subtitles Toggle */}
        <View
          style={styles.optionRow}
          accessibilityLabel={t('recordings.includeSubtitles')}
        >
          <Subtitles size={24} color={colors.text} />
          <Text style={styles.optionText}>{t('recordings.includeSubtitles')}</Text>
          <GlassTVSwitch
            value={subtitleEnabled}
            onValueChange={setSubtitleEnabled}
            testID="tv-subtitle-toggle"
          />
        </View>

        {/* Subtitle Language */}
        {subtitleEnabled && (
          <TVLanguageGrid
            selectedCode={subtitleLang}
            onSelect={setSubtitleLang}
            label={t('recordings.subtitleLanguage')}
          />
        )}

        {/* Dubbing Toggle */}
        <View
          style={styles.optionRow}
          accessibilityLabel={t('recordings.includeDubbedAudio')}
        >
          <Volume2 size={24} color={colors.text} />
          <Text style={styles.optionText}>{t('recordings.includeDubbedAudio')}</Text>
          <GlassTVSwitch
            value={dubbingEnabled}
            onValueChange={setDubbingEnabled}
            testID="tv-dubbing-toggle"
          />
        </View>

        {/* Dubbing Language */}
        {dubbingEnabled && (
          <TVLanguageGrid
            selectedCode={dubbingLang}
            onSelect={setDubbingLang}
            label={t('recordings.dubbingLanguage')}
          />
        )}

        {/* Start Button */}
        <Pressable
          focusable
          hasTVPreferredFocus
          style={({ focused }) => [styles.startButton, focused && styles.startButtonFocused]}
          onPress={handleStart}
          accessibilityLabel={t('recordings.startRecording')}
          accessibilityRole="button"
        >
          <Circle size={20} color="#fff" />
          <Text style={styles.startButtonText}>{t('recordings.startRecording')}</Text>
        </Pressable>
      </ScrollView>
    </GlassModal>
  )
}

interface TVLanguageGridProps {
  selectedCode: string
  onSelect: (code: string) => void
  label: string
}

const TVLanguageGrid: React.FC<TVLanguageGridProps> = ({ selectedCode, onSelect, label }) => (
  <View style={styles.languageSection}>
    <Text style={styles.languageSectionLabel}>{label}</Text>
    <View style={styles.languageGrid}>
      {AVAILABLE_LANGUAGES.map((lang: LanguageOption) => {
        const isSelected = selectedCode === lang.code
        return (
          <Pressable
            key={lang.code}
            focusable
            style={({ focused }) => [
              styles.langButton,
              isSelected && styles.langButtonSelected,
              focused && styles.langButtonFocused,
            ]}
            onPress={() => onSelect(lang.code)}
            accessibilityLabel={lang.label}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
          >
            <Text style={styles.langFlag}>{lang.flag}</Text>
            <Text style={[styles.langLabel, isSelected && styles.langLabelSelected]}>
              {lang.label}
            </Text>
            {isSelected && <Check size={18} color={colors.primary} />}
          </Pressable>
        )
      })}
    </View>
  </View>
)

const styles = StyleSheet.create({
  title: { fontSize: fontSizeTV.xl, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 20, paddingHorizontal: 16, borderRadius: 12, marginBottom: 8 },
  optionText: { flex: 1, fontSize: fontSizeTV.lg, fontWeight: '500', color: colors.text },
  languageSection: { paddingHorizontal: 16, paddingBottom: 16 },
  languageSectionLabel: { fontSize: fontSizeTV.sm, fontWeight: '500', color: colors.textSecondary, marginBottom: spacing.sm },
  languageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  langButton: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.04)', minWidth: '45%', flex: 1 },
  langButtonSelected: { backgroundColor: 'rgba(168,85,247,0.15)', borderColor: colors.primary },
  langButtonFocused: { borderColor: '#fff', backgroundColor: 'rgba(255,255,255,0.1)', transform: [{ scale: 1.05 }] },
  langFlag: { fontSize: fontSizeTV.lg },
  langLabel: { fontSize: fontSizeTV.base, fontWeight: '500', color: colors.textSecondary, flex: 1 },
  langLabelSelected: { color: colors.text },
  startButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: 'rgba(239,68,68,0.9)', paddingVertical: 18, borderRadius: 16, marginTop: spacing.lg },
  startButtonFocused: { backgroundColor: '#ef4444', transform: [{ scale: 1.05 }], shadowColor: '#ef4444', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 20 },
  startButtonText: { color: '#fff', fontSize: fontSizeTV.lg, fontWeight: '700' },
})
