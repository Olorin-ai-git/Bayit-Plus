/**
 * SearchResultCard Component
 * Displays a single transcript search result with timestamp and highlighting
 */

import React from 'react'
import { View, Text, Pressable, Platform } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Clock } from 'lucide-react-native'
import type { TranscriptMatch } from '@/services/liveSearchApi'
import { searchStyles as styles, getTvStyles } from './searchStyles'
import { formatISOTimestamp, getLanguageLabel } from '../utils/formatters'

interface SearchResultCardProps {
  result: TranscriptMatch
  query?: string
  onPress?: (timestamp: string) => void
  isRTL?: boolean
}

export function SearchResultCard({ result, query, onPress, isRTL = false }: SearchResultCardProps) {
  const { i18n } = useTranslation()
  const isTV = Platform.isTV || Platform.OS === 'tvos'
  const tvStyles = getTvStyles(isTV)

  const isHebrew = i18n.language === 'he' || isRTL

  const handlePress = () => {
    if (onPress) {
      onPress(result.timestamp)
    }
  }

  return (
    <Pressable
      style={[styles.resultCard, isTV && styles.resultCardTV]}
      onPress={handlePress}
      disabled={!onPress}
    >
      {/* Header */}
      <View style={[styles.resultHeader, isHebrew && styles.resultHeaderRTL]}>
        <View style={[styles.timestampContainer, isHebrew && styles.timestampContainerRTL]}>
          <Clock size={isTV ? 16 : 12} color="#60A5FA" />
          <Text style={[styles.timestampText, tvStyles.timestampText]}>
            {formatISOTimestamp(result.timestamp, isHebrew)}
          </Text>
        </View>

        <View style={styles.languageBadge}>
          <Text style={styles.languageText}>
            {getLanguageLabel(result.source_lang)}
          </Text>
        </View>
      </View>

      {/* Text */}
      <Text
        style={[
          styles.resultText,
          tvStyles.resultText,
          isHebrew && styles.resultTextRTL,
        ]}
        numberOfLines={3}
      >
        {result.text}
      </Text>
    </Pressable>
  )
}

export default SearchResultCard
