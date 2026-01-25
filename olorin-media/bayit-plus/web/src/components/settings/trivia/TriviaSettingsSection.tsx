/**
 * TriviaSettingsSection Component
 * Settings panel for trivia feature configuration
 *
 * Migration Status: Refactored - split into sub-components
 */

import React from 'react'
import { View, Text, Platform } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Lightbulb } from 'lucide-react-native'
import { useTriviaStore } from '@bayit/shared-stores'
import { TriviaFrequency, TriviaCategory } from '@bayit/shared-types/trivia'
import { TriviaToggleRow } from './TriviaToggleRow'
import { TriviaFrequencySelector } from './TriviaFrequencySelector'
import { TriviaCategorySelector } from './TriviaCategorySelector'
import { TriviaDurationSelector } from './TriviaDurationSelector'
import { TriviaLanguageSettings } from './TriviaLanguageSettings'
import { triviaSettingsStyles as styles, getTvStyles } from './triviaSettingsStyles'

interface TriviaSettingsSectionProps {
  isRTL?: boolean
}

export function TriviaSettingsSection({ isRTL = false }: TriviaSettingsSectionProps) {
  const { t, i18n } = useTranslation()
  const { preferences, updatePreferences, isLoading } = useTriviaStore()

  const isTV = Platform.isTV || Platform.OS === 'tvos'
  const tvStyles = getTvStyles(isTV)
  const isHebrew = i18n.language === 'he' || isRTL

  const handleToggleEnabled = async () => {
    await updatePreferences({ enabled: !preferences.enabled })
  }

  const handleFrequencyChange = async (frequency: TriviaFrequency) => {
    await updatePreferences({ frequency })
  }

  const handleCategoryToggle = async (category: TriviaCategory) => {
    const current = preferences.categories
    const newCategories = current.includes(category)
      ? current.filter((c) => c !== category)
      : [...current, category]

    if (newCategories.length > 0) {
      await updatePreferences({ categories: newCategories })
    }
  }

  const handleDisplayDurationChange = async (duration: number) => {
    await updatePreferences({ display_duration: duration })
  }

  const handleLanguageToggle = async (langCode: string) => {
    const current = [...preferences.display_languages]
    const index = current.indexOf(langCode)

    if (index > -1) {
      // Remove language (keep at least one)
      if (current.length > 1) {
        current.splice(index, 1)
      }
    } else {
      // Add language (max 3)
      if (current.length < 3) {
        current.push(langCode)
      }
    }

    await updatePreferences({ display_languages: current })
  }

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={[styles.header, isHebrew && styles.headerRTL]}>
        <View style={[styles.headerIcon, isHebrew && styles.headerIconRTL]}>
          <Lightbulb size={isTV ? 28 : 20} color="#FCD34D" />
          <Text style={[styles.headerTitle, tvStyles.text]}>
            {t('trivia.settings.title')}
          </Text>
        </View>
      </View>

      {/* Enable Toggle */}
      <TriviaToggleRow
        enabled={preferences.enabled}
        isLoading={isLoading}
        isHebrew={isHebrew}
        onToggle={handleToggleEnabled}
      />

      {/* Expanded Settings (when enabled) */}
      {preferences.enabled && (
        <>
          <View style={styles.divider} />
          <TriviaFrequencySelector
            frequency={preferences.frequency}
            isLoading={isLoading}
            isHebrew={isHebrew}
            onFrequencyChange={handleFrequencyChange}
          />

          <View style={styles.divider} />
          <TriviaCategorySelector
            categories={preferences.categories}
            isLoading={isLoading}
            isHebrew={isHebrew}
            onCategoryToggle={handleCategoryToggle}
          />

          <View style={styles.divider} />
          <TriviaDurationSelector
            duration={preferences.display_duration}
            isLoading={isLoading}
            isHebrew={isHebrew}
            onDurationChange={handleDisplayDurationChange}
          />

          <View style={styles.divider} />
          <TriviaLanguageSettings
            displayLanguages={preferences.display_languages}
            isLoading={isLoading}
            isHebrew={isHebrew}
            onLanguageToggle={handleLanguageToggle}
          />
        </>
      )}
    </View>
  )
}

export default TriviaSettingsSection
