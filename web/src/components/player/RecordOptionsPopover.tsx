/**
 * RecordOptionsPopover
 * Glassmorphic dropdown with dubbing/subtitle toggles + language selectors
 * Appears on long-press/right-click of the RecordButton
 */

import React from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { X, Subtitles, Volume2, Check } from 'lucide-react'
import { colors } from '@olorin/design-tokens'
import { GlassView } from '@bayit/shared/ui'
import { useDirection } from '@/hooks/useDirection'
import { AVAILABLE_LANGUAGES, LanguageOption } from '@/components/epg/record/types'
import { styles } from './RecordOptionsPopover.styles'

export interface RecordingOptions {
  subtitleEnabled: boolean
  subtitleTargetLanguage: string
  dubbingEnabled: boolean
  dubbingTargetLanguage: string
}

interface RecordOptionsPopoverProps {
  visible: boolean
  onClose: () => void
  options: RecordingOptions
  onOptionsChange: (options: RecordingOptions) => void
  onStartRecording: (options: RecordingOptions) => void
}

export const RecordOptionsPopover: React.FC<RecordOptionsPopoverProps> = ({
  visible, onClose, options, onOptionsChange, onStartRecording,
}) => {
  const { t } = useTranslation()
  const { textAlign, flexDirection } = useDirection()

  if (!visible) return null

  const handleToggle = (field: 'subtitleEnabled' | 'dubbingEnabled') => {
    onOptionsChange({ ...options, [field]: !options[field] })
  }

  const handleStart = () => {
    onStartRecording(options)
    onClose()
  }

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <GlassView style={styles.popover}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={[styles.header, { flexDirection }]}>
            <Text style={[styles.headerTitle, { textAlign }]}>
              {t('recordings.recordOptions')}
            </Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ToggleRow
            icon={<Subtitles size={18} color={colors.text} />}
            label={t('recordings.includeSubtitles')}
            enabled={options.subtitleEnabled}
            onToggle={() => handleToggle('subtitleEnabled')}
            flexDirection={flexDirection}
          />
          {options.subtitleEnabled && (
            <LanguageGrid
              selectedCode={options.subtitleTargetLanguage}
              onSelect={(code) => onOptionsChange({ ...options, subtitleTargetLanguage: code })}
              label={t('recordings.subtitleLanguage')}
              textAlign={textAlign}
            />
          )}

          <ToggleRow
            icon={<Volume2 size={18} color={colors.text} />}
            label={t('recordings.includeDubbedAudio')}
            enabled={options.dubbingEnabled}
            onToggle={() => handleToggle('dubbingEnabled')}
            flexDirection={flexDirection}
          />
          {options.dubbingEnabled && (
            <LanguageGrid
              selectedCode={options.dubbingTargetLanguage}
              onSelect={(code) => onOptionsChange({ ...options, dubbingTargetLanguage: code })}
              label={t('recordings.dubbingLanguage')}
              textAlign={textAlign}
            />
          )}

          <Pressable style={styles.startButton} onPress={handleStart}>
            <Text style={styles.startButtonText}>{t('recordings.startRecording')}</Text>
          </Pressable>
        </ScrollView>
      </GlassView>
    </View>
  )
}

interface ToggleRowProps {
  icon: React.ReactNode
  label: string
  enabled: boolean
  onToggle: () => void
  flexDirection: 'row' | 'row-reverse'
}

const ToggleRow: React.FC<ToggleRowProps> = ({ icon, label, enabled, onToggle, flexDirection }) => (
  <Pressable style={[styles.optionRow, { flexDirection }]} onPress={onToggle}>
    <View style={[styles.optionLabel, { flexDirection }]}>
      {icon}
      <Text style={styles.optionText}>{label}</Text>
    </View>
    <View style={[styles.toggle, enabled && styles.toggleActive]}>
      <View style={[styles.toggleThumb, enabled && styles.toggleThumbActive]} />
    </View>
  </Pressable>
)

interface LanguageGridProps {
  selectedCode: string
  onSelect: (code: string) => void
  label: string
  textAlign: 'left' | 'right'
}

const LanguageGrid: React.FC<LanguageGridProps> = ({ selectedCode, onSelect, label, textAlign }) => (
  <View style={styles.languageSection}>
    <Text style={[styles.languageLabel, { textAlign }]}>{label}</Text>
    <View style={styles.languageGrid}>
      {AVAILABLE_LANGUAGES.map((lang: LanguageOption) => {
        const isSelected = selectedCode === lang.code
        return (
          <Pressable
            key={lang.code}
            style={[styles.languageButton, isSelected && styles.languageButtonSelected]}
            onPress={() => onSelect(lang.code)}
          >
            <Text style={styles.flag}>{lang.flag}</Text>
            <Text style={[styles.languageText, isSelected && styles.languageTextSelected]}>
              {lang.label}
            </Text>
            {isSelected && <Check size={14} color={colors.primary} />}
          </Pressable>
        )
      })}
    </View>
  </View>
)
