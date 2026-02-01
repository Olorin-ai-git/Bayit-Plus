/**
 * TranscriptSegmentCard Component
 * Displays a single transcript segment with timestamp and language indicator
 */

import React from 'react'
import { View, Text, Pressable, Platform } from 'react-native'
import { Clock } from 'lucide-react-native'
import type { TranscriptSegment } from '@/services/liveCatchupApi'
import { catchupStyles as styles, getTvStyles, LANGUAGE_COLORS } from './catchupStyles'
import { formatISOTimestamp, getLanguageLabel } from '../utils/formatters'

interface TranscriptSegmentCardProps {
  segment: TranscriptSegment
  onPress?: (timestamp: string) => void
  isRTL?: boolean
}

function getLanguageColor(lang: string): string {
  return LANGUAGE_COLORS[lang] || LANGUAGE_COLORS.default
}

export function TranscriptSegmentCard({
  segment,
  onPress,
  isRTL = false,
}: TranscriptSegmentCardProps) {
  const isTV = Platform.isTV || Platform.OS === 'tvos'
  const tvStyles = getTvStyles(isTV)
  const langColor = getLanguageColor(segment.language)

  const handlePress = () => {
    if (onPress) {
      onPress(segment.timestamp)
    }
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.segmentCard,
        isTV && styles.segmentCardTV,
        pressed && styles.segmentCardPressed,
      ]}
      onPress={handlePress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`Transcript at ${formatISOTimestamp(segment.timestamp, isRTL)}`}
    >
      <View style={[styles.segmentHeader, isRTL && styles.segmentHeaderRTL]}>
        <View style={[styles.timestampContainer, isRTL && styles.timestampContainerRTL]}>
          <Clock size={isTV ? 16 : 12} color={langColor} />
          <Text style={[styles.timestampText, tvStyles.timestampText, { color: langColor }]}>
            {formatISOTimestamp(segment.timestamp, isRTL)}
          </Text>
        </View>

        <View style={[styles.languageBadge, { backgroundColor: `${langColor}20` }]}>
          <Text style={[styles.languageText, { color: langColor }]}>
            {getLanguageLabel(segment.language)}
          </Text>
        </View>
      </View>

      <Text
        style={[
          styles.segmentText,
          tvStyles.bodyText,
          isRTL && styles.segmentTextRTL,
        ]}
        numberOfLines={3}
      >
        {segment.text}
      </Text>
    </Pressable>
  )
}

export default TranscriptSegmentCard
