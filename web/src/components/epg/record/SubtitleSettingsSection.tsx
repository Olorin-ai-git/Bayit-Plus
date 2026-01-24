/**
 * Subtitle settings section for EPG recording modal
 * Includes subtitle toggle and language selector
 * @module epg/record/SubtitleSettingsSection
 */

import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { GlassToggle } from '@bayit/shared/ui'
import { useDirection } from '@/hooks/useDirection'
import LanguageSelector from './LanguageSelector'

/**
 * Props schema
 */
const SubtitleSettingsSectionPropsSchema = z.object({
  enableSubtitles: z.boolean(),
  onEnableSubtitlesChange: z.function().args(z.boolean()).returns(z.void()),
  selectedLanguage: z.string().min(2).max(5),
  onLanguageChange: z.function().args(z.string()).returns(z.void()),
})

type SubtitleSettingsSectionProps = z.infer<typeof SubtitleSettingsSectionPropsSchema>

/**
 * Subtitle settings section component
 */
const SubtitleSettingsSection: React.FC<SubtitleSettingsSectionProps> = ({
  enableSubtitles,
  onEnableSubtitlesChange,
  selectedLanguage,
  onLanguageChange,
}) => {
  const { t } = useTranslation()
  const { isRTL, flexDirection, textAlign } = useDirection()

  return (
    <View style={styles.container}>
      <View style={[styles.toggleRow, { flexDirection }]}>
        <Text style={[styles.toggleLabel, { textAlign }]}>
          {t('epg.enableSubtitles')}
        </Text>
        <GlassToggle
          value={enableSubtitles}
          onValueChange={onEnableSubtitlesChange}
          size="small"
          isRTL={isRTL}
        />
      </View>

      {enableSubtitles && (
        <LanguageSelector
          selectedLanguage={selectedLanguage}
          onLanguageChange={onLanguageChange}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
})

export default SubtitleSettingsSection
