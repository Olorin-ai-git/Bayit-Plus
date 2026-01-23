/**
 * TriviaFrequencySelector Component
 * Frequency options for trivia display using Glass design system
 */

import React from 'react'
import { View, Text, Platform } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Clock } from 'lucide-react-native'
import { GlassButton } from '@bayit/shared/components/ui/GlassButton'
import { TriviaFrequency, TRIVIA_FREQUENCIES } from '@bayit/shared-types/trivia'
import { triviaSettingsStyles as styles, getTvStyles } from './triviaSettingsStyles'

interface TriviaFrequencySelectorProps {
  frequency: TriviaFrequency
  isLoading: boolean
  isHebrew: boolean
  onFrequencyChange: (frequency: TriviaFrequency) => void
}

export function TriviaFrequencySelector({
  frequency,
  isLoading,
  isHebrew,
  onFrequencyChange,
}: TriviaFrequencySelectorProps) {
  const { t } = useTranslation()
  const isTV = Platform.isTV || Platform.OS === 'tvos'
  const tvStyles = getTvStyles(isTV)

  return (
    <View style={styles.settingSection}>
      <View style={[styles.sectionHeader, isHebrew && styles.sectionHeaderRTL]}>
        <Clock size={isTV ? 20 : 16} color="#9CA3AF" />
        <Text style={[styles.sectionTitle, isHebrew && styles.textRTL, tvStyles.smallText]}>
          {t('trivia.settings.frequency')}
        </Text>
      </View>
      <View style={styles.optionsRow} accessibilityRole="radiogroup">
        {TRIVIA_FREQUENCIES.filter((f) => f.id !== 'off').map((freq) => (
          <GlassButton
            key={freq.id}
            title={isHebrew ? freq.label_he : freq.label_en}
            onPress={() => onFrequencyChange(freq.id)}
            disabled={isLoading}
            variant={frequency === freq.id ? 'primary' : 'ghost'}
            size={isTV ? 'md' : 'sm'}
            accessibilityLabel={`${isHebrew ? freq.label_he : freq.label_en} ${t('trivia.settings.frequency')}`}
            accessibilityHint={t('trivia.settings.frequencyHint')}
            accessibilityState={{ selected: frequency === freq.id }}
            hasTVPreferredFocus={frequency === freq.id}
          />
        ))}
      </View>
    </View>
  )
}

export default TriviaFrequencySelector
