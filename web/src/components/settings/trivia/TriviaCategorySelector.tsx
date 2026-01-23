/**
 * TriviaCategorySelector Component
 * Category selection for trivia facts using Glass design system
 */

import React from 'react'
import { View, Text, Platform } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Folder } from 'lucide-react-native'
import { GlassButton } from '@bayit/shared/components/ui/GlassButton'
import { TriviaCategory, TRIVIA_CATEGORIES } from '@bayit/shared-types/trivia'
import { triviaSettingsStyles as styles, getTvStyles } from './triviaSettingsStyles'

interface TriviaCategorySelectorProps {
  categories: TriviaCategory[]
  isLoading: boolean
  isHebrew: boolean
  onCategoryToggle: (category: TriviaCategory) => void
}

export function TriviaCategorySelector({
  categories,
  isLoading,
  isHebrew,
  onCategoryToggle,
}: TriviaCategorySelectorProps) {
  const { t } = useTranslation()
  const isTV = Platform.isTV || Platform.OS === 'tvos'
  const tvStyles = getTvStyles(isTV)

  return (
    <View style={styles.settingSection}>
      <View style={[styles.sectionHeader, isHebrew && styles.sectionHeaderRTL]}>
        <Folder size={isTV ? 20 : 16} color="#9CA3AF" />
        <Text style={[styles.sectionTitle, isHebrew && styles.textRTL, tvStyles.smallText]}>
          {t('trivia.settings.categories')}
        </Text>
      </View>
      <View style={styles.optionsRow} accessibilityRole="group">
        {TRIVIA_CATEGORIES.map((cat) => {
          const isSelected = categories.includes(cat.id)
          const isOnlySelected = isSelected && categories.length === 1
          return (
            <GlassButton
              key={cat.id}
              title={isHebrew ? cat.label_he : cat.label_en}
              onPress={() => onCategoryToggle(cat.id)}
              disabled={isLoading || isOnlySelected}
              variant={isSelected ? 'warning' : 'ghost'}
              size={isTV ? 'md' : 'sm'}
              accessibilityLabel={`${isHebrew ? cat.label_he : cat.label_en} ${t('trivia.settings.category')}`}
              accessibilityHint={isSelected ? t('trivia.settings.deselectCategory') : t('trivia.settings.selectCategory')}
              accessibilityState={{ selected: isSelected }}
              hasTVPreferredFocus={isSelected && categories.indexOf(cat.id) === 0}
            />
          )
        })}
      </View>
    </View>
  )
}

export default TriviaCategorySelector
