/**
 * RecordOptionsSheet (Mobile)
 * Bottom sheet with dubbing/subtitle options for recording
 */

import React, { useState, useCallback } from 'react'
import {
  View, Text, Pressable, StyleSheet, ScrollView,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { Subtitles, Volume2, Check, Circle } from 'lucide-react-native'
import { useDirection } from '@bayit/shared-hooks'
import { GlassView } from '@bayit/shared'
import { GlassModal, GlassToggle } from '@olorin/glass-ui/native'
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens'
import { AVAILABLE_LANGUAGES, LanguageOption } from '@bayit/shared-types/recording'
import logger from '@/utils/logger'

export interface MobileRecordingOptions {
  subtitleEnabled: boolean
  subtitleTargetLanguage: string
  dubbingEnabled: boolean
  dubbingTargetLanguage: string
}

interface RecordOptionsSheetProps {
  visible: boolean
  onClose: () => void
  onStartRecording: (options: MobileRecordingOptions) => void
}

export const RecordOptionsSheet: React.FC<RecordOptionsSheetProps> = ({
  visible,
  onClose,
  onStartRecording,
}) => {
  const { t } = useTranslation()
  const { textAlign, flexDirection } = useDirection()

  const [subtitleEnabled, setSubtitleEnabled] = useState(true)
  const [subtitleLang, setSubtitleLang] = useState('en')
  const [dubbingEnabled, setDubbingEnabled] = useState(false)
  const [dubbingLang, setDubbingLang] = useState('en')

  const handleStart = useCallback(() => {
    logger.info('Mobile recording started', 'RecordOptionsSheet', {
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
        <Text style={[styles.title, { textAlign }]}>
          {t('recordings.recordOptions')}
        </Text>

        {/* Subtitles Toggle */}
        <View style={[styles.optionRow, { flexDirection }]}>
          <View
            style={[styles.optionLabel, { flexDirection }]}
            accessibilityLabel={t('recordings.includeSubtitles')}
          >
            <Subtitles size={20} color={colors.text} />
            <Text style={styles.optionText}>{t('recordings.includeSubtitles')}</Text>
          </View>
          <GlassToggle
            value={subtitleEnabled}
            onValueChange={setSubtitleEnabled}
            testID="subtitle-toggle"
          />
        </View>

        {/* Subtitle Language */}
        {subtitleEnabled && (
          <LanguageGrid
            selectedCode={subtitleLang}
            onSelect={setSubtitleLang}
            label={t('recordings.subtitleLanguage')}
            textAlign={textAlign}
          />
        )}

        {/* Dubbing Toggle */}
        <View style={[styles.optionRow, { flexDirection }]}>
          <View
            style={[styles.optionLabel, { flexDirection }]}
            accessibilityLabel={t('recordings.includeDubbedAudio')}
          >
            <Volume2 size={20} color={colors.text} />
            <Text style={styles.optionText}>{t('recordings.includeDubbedAudio')}</Text>
          </View>
          <GlassToggle
            value={dubbingEnabled}
            onValueChange={setDubbingEnabled}
            testID="dubbing-toggle"
          />
        </View>

        {/* Dubbing Language */}
        {dubbingEnabled && (
          <LanguageGrid
            selectedCode={dubbingLang}
            onSelect={setDubbingLang}
            label={t('recordings.dubbingLanguage')}
            textAlign={textAlign}
          />
        )}

        {/* Start */}
        <Pressable
          style={styles.startButton}
          onPress={handleStart}
          accessibilityLabel={t('recordings.startRecording')}
          accessibilityRole="button"
        >
          <Circle size={18} color="#fff" />
          <Text style={styles.startButtonText}>{t('recordings.startRecording')}</Text>
        </Pressable>
      </ScrollView>
    </GlassModal>
  )
}

interface LanguageGridProps {
  selectedCode: string
  onSelect: (code: string) => void
  label: string
  textAlign: 'left' | 'right'
}

const LanguageGrid: React.FC<LanguageGridProps> = ({ selectedCode, onSelect, label, textAlign }) => (
  <View style={styles.langSection}>
    <Text style={[styles.langLabel, { textAlign }]}>{label}</Text>
    <View style={styles.langGrid}>
      {AVAILABLE_LANGUAGES.map((lang: LanguageOption) => {
        const isSelected = selectedCode === lang.code
        return (
          <Pressable
            key={lang.code}
            style={[styles.langButton, isSelected && styles.langButtonSelected]}
            onPress={() => onSelect(lang.code)}
            accessibilityLabel={lang.label}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
          >
            <Text style={styles.langFlag}>{lang.flag}</Text>
            <Text style={[styles.langText, isSelected && styles.langTextSelected]}>
              {lang.label}
            </Text>
            {isSelected && <Check size={14} color={colors.primary} />}
          </Pressable>
        )
      })}
    </View>
  </View>
)

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
  optionRow: { alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, minHeight: 52, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  optionLabel: { alignItems: 'center', gap: spacing.sm },
  optionText: { fontSize: fontSize.md, fontWeight: '500', color: colors.text },
  langSection: { paddingVertical: spacing.sm },
  langLabel: { fontSize: fontSize.sm, fontWeight: '500', color: colors.textSecondary, marginBottom: spacing.sm },
  langGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  langButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, minHeight: 44, borderRadius: borderRadius.md, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', minWidth: '45%', flex: 1 },
  langButtonSelected: { backgroundColor: 'rgba(168,85,247,0.15)', borderColor: colors.primary },
  langFlag: { fontSize: 18 },
  langText: { fontSize: fontSize.sm, fontWeight: '500', color: colors.textSecondary, flex: 1 },
  langTextSelected: { color: colors.text },
  startButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: 'rgba(239,68,68,0.9)', paddingVertical: spacing.md, minHeight: 48, borderRadius: borderRadius.lg, marginTop: spacing.lg },
  startButtonText: { color: '#fff', fontSize: fontSize.md, fontWeight: '700' },
})
