/**
 * TriviaLanguageSettings Component
 * Language selection for multilingual trivia display
 * Allows users to select 1-3 languages to display for each fact
 */

import React from 'react'
import { View, Text, Platform } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Languages } from 'lucide-react-native'
import { GlassButton } from '@bayit/shared/components/ui/GlassButton'
import { TRIVIA_LANGUAGES } from '@bayit/shared-types/trivia'
import { triviaSettingsStyles as styles, getTvStyles } from './triviaSettingsStyles'

interface TriviaLanguageSettingsProps {
  displayLanguages: string[]
  isLoading: boolean
  isHebrew: boolean
  onLanguageToggle: (langCode: string) => void
}

export function TriviaLanguageSettings({
  displayLanguages,
  isLoading,
  isHebrew,
  onLanguageToggle,
}: TriviaLanguageSettingsProps) {
  const { t } = useTranslation()
  const isTV = Platform.isTV || Platform.OS === 'tvos'
  const tvStyles = getTvStyles(isTV)

  return (
    <View style={styles.settingSection}>
      <View style={[styles.sectionHeader, isHebrew && styles.sectionHeaderRTL]}>
        <Languages size={isTV ? 20 : 16} color="#9CA3AF" />
        <Text style={[styles.sectionTitle, isHebrew && styles.textRTL, tvStyles.smallText]}>
          {t('trivia.settings.displayLanguages')}
        </Text>
      </View>
      <Text style={[styles.sectionHint, isHebrew && styles.textRTL, tvStyles.smallText]}>
        {t('trivia.settings.languageHint')}
      </Text>
      <View style={styles.optionsRow} accessibilityRole="group">
        {TRIVIA_LANGUAGES.map((lang) => {
          const isSelected = displayLanguages.includes(lang.code)
          const isOnlySelected = isSelected && displayLanguages.length === 1
          return (
            <GlassButton
              key={lang.code}
              title={`${lang.flag} ${lang.nativeName}`}
              onPress={() => onLanguageToggle(lang.code)}
              disabled={isLoading || isOnlySelected}
              variant={isSelected ? 'success' : 'ghost'}
              size={isTV ? 'md' : 'sm'}
              accessibilityLabel={`${lang.nativeName} ${t('trivia.settings.language')}`}
              accessibilityHint={
                isSelected
                  ? t('trivia.settings.deselectLanguage')
                  : t('trivia.settings.selectLanguage')
              }
              accessibilityState={{ selected: isSelected }}
              hasTVPreferredFocus={isSelected && displayLanguages.indexOf(lang.code) === 0}
            />
          )
        })}
      </View>
    </View>
  )
}

export default TriviaLanguageSettings
