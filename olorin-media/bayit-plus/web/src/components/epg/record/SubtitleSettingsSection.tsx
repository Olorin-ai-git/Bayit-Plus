/**
 * Subtitle settings section for EPG recording modal
 * Includes subtitle toggle and language selector
 * @module epg/record/SubtitleSettingsSection
 */

import React from 'react'
import { View, Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { GlassToggle } from '@bayit/shared/ui'
import { platformClass } from '@/utils/platformClass'
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
    <View className={platformClass('mb-6')}>
      {/* Subtitle Toggle */}
      <View
        className={platformClass('flex items-center justify-between mb-4')}
        style={{ flexDirection }}
      >
        <Text
          className={platformClass('text-base font-medium text-white')}
          style={{ textAlign }}
        >
          {t('epg.enableSubtitles')}
        </Text>
        <GlassToggle
          value={enableSubtitles}
          onValueChange={onEnableSubtitlesChange}
          size="small"
          isRTL={isRTL}
        />
      </View>

      {/* Language Selector (shown when subtitles enabled) */}
      {enableSubtitles && (
        <LanguageSelector
          selectedLanguage={selectedLanguage}
          onLanguageChange={onLanguageChange}
        />
      )}
    </View>
  )
}

export default SubtitleSettingsSection
