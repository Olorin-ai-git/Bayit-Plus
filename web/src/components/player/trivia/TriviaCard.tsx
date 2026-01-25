/**
 * TriviaCard Component
 * Card content for trivia facts - header, category, text, related person
 * Uses Glass design system with proper touch targets and tvOS support
 */

import React from 'react'
import { View, Text, Platform } from 'react-native'
import { useTranslation } from 'react-i18next'
import { X, Lightbulb, ChevronRight } from 'lucide-react-native'
import { GlassButton } from '@bayit/shared/components/ui/GlassButton'
import { TriviaFact, getCategoryInfo } from '@bayit/shared-types/trivia'
import { useTriviaStore } from '@bayit/shared/stores/trivia'
import { MultilingualTextDisplay } from '@bayit/shared/components/player/trivia/MultilingualTextDisplay'
import { triviaStyles as styles, getTvStyles } from './triviaStyles'

interface TriviaCardProps {
  fact: TriviaFact
  onDismiss: () => void
  isRTL?: boolean
}

export function TriviaCard({ fact, onDismiss, isRTL = false }: TriviaCardProps) {
  const { t, i18n } = useTranslation()
  const isTV = Platform.isTV || Platform.OS === 'tvos'
  const tvStyles = getTvStyles(isTV)

  // NEW: Get user's language display preferences
  const displayLanguages = useTriviaStore(state =>
    state.preferences.display_languages || ['he', 'en']
  )

  const categoryInfo = getCategoryInfo(fact.category)
  const isHebrew = i18n.language === 'he' || isRTL

  return (
    <View style={[styles.glassCard, isTV && styles.glassCardTV]}>
      {/* Header */}
      <View style={[styles.header, isHebrew && styles.headerRTL]}>
        <View style={[styles.iconContainer, isHebrew && styles.iconContainerRTL]}>
          <Lightbulb size={isTV ? 24 : 16} color="#FCD34D" />
          <Text style={[styles.headerText, tvStyles.headerText]}>
            {t('trivia.didYouKnow')}
          </Text>
        </View>
        <GlassButton
          title=""
          icon={<X size={isTV ? 24 : 14} color="#9CA3AF" />}
          onPress={onDismiss}
          variant="ghost"
          size={isTV ? 'md' : 'sm'}
          style={styles.dismissButton}
          accessibilityLabel={t('common.dismiss')}
          accessibilityHint={t('trivia.dismissHint')}
          hasTVPreferredFocus={isTV}
        />
      </View>

      {/* Category Badge */}
      {categoryInfo && (
        <View style={[styles.categoryBadge, isHebrew && styles.categoryBadgeRTL]}>
          <Text style={[styles.categoryText, tvStyles.categoryText]}>
            {isHebrew ? categoryInfo.label_he : categoryInfo.label_en}
          </Text>
        </View>
      )}

      {/* UPDATED: Multilingual Fact Text */}
      <MultilingualTextDisplay
        fact={fact}
        displayLanguages={displayLanguages}
        isTV={isTV}
      />

      {/* Related Person */}
      {fact.related_person && (
        <View style={[styles.relatedPerson, isHebrew && styles.relatedPersonRTL]}>
          <ChevronRight size={isTV ? 18 : 14} color="#60A5FA" />
          <Text style={[styles.relatedPersonText, tvStyles.relatedPersonText]}>
            {fact.related_person}
          </Text>
        </View>
      )}

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={styles.progressFill} />
        </View>
      </View>
    </View>
  )
}

export default TriviaCard
