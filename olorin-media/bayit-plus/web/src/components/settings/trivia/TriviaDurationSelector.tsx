/**
 * TriviaDurationSelector Component
 * Display duration selection for trivia facts using Glass design system
 */

import React from 'react'
import { View, Text, Platform } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Timer } from 'lucide-react-native'
import { GlassButton } from '@bayit/shared/components/ui/GlassButton'
import { triviaSettingsStyles as styles, getTvStyles } from './triviaSettingsStyles'

interface TriviaDurationSelectorProps {
  duration: number
  isLoading: boolean
  isHebrew: boolean
  onDurationChange: (duration: number) => void
}

const DURATION_OPTIONS = [5, 10, 15, 20]

export function TriviaDurationSelector({
  duration,
  isLoading,
  isHebrew,
  onDurationChange,
}: TriviaDurationSelectorProps) {
  const { t } = useTranslation()
  const isTV = Platform.isTV || Platform.OS === 'tvos'
  const tvStyles = getTvStyles(isTV)

  return (
    <View style={styles.settingSection}>
      <View style={[styles.sectionHeader, isHebrew && styles.sectionHeaderRTL]}>
        <Timer size={isTV ? 20 : 16} color="#9CA3AF" />
        <Text style={[styles.sectionTitle, isHebrew && styles.textRTL, tvStyles.smallText]}>
          {t('trivia.settings.displayDuration')}
        </Text>
      </View>
      <View style={styles.optionsRow} accessibilityRole="radiogroup">
        {DURATION_OPTIONS.map((dur) => (
          <GlassButton
            key={dur}
            title={`${dur}s`}
            onPress={() => onDurationChange(dur)}
            disabled={isLoading}
            variant={duration === dur ? 'info' : 'ghost'}
            size={isTV ? 'md' : 'sm'}
            accessibilityLabel={`${dur} ${t('trivia.settings.seconds')}`}
            accessibilityHint={t('trivia.settings.durationHint')}
            accessibilityState={{ selected: duration === dur }}
            hasTVPreferredFocus={duration === dur}
          />
        ))}
      </View>
    </View>
  )
}

export default TriviaDurationSelector
