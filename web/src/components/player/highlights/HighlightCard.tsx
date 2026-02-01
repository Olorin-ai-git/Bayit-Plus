/**
 * HighlightCard Component
 * Displays a single detected highlight with type, confidence, and transcript
 */

import React from 'react'
import { View, Text, Pressable, Platform } from 'react-native'
import { useTranslation } from 'react-i18next'
import { X, Zap, Users, Hash, Drama, Clock } from 'lucide-react-native'
import type { Highlight } from '@/services/liveHighlightsApi'
import { highlightStyles as styles, getTvStyles, HIGHLIGHT_COLORS } from './highlightStyles'
import { formatISOTimestamp, formatConfidence } from '../utils/formatters'

interface HighlightCardProps {
  highlight: Highlight
  onDismiss?: () => void
  isRTL?: boolean
}

const HIGHLIGHT_ICONS = {
  emotional: Zap,
  entity: Users,
  keyword: Hash,
  dramatic: Drama,
}

export function HighlightCard({ highlight, onDismiss, isRTL = false }: HighlightCardProps) {
  const { t, i18n } = useTranslation()
  const isTV = Platform.isTV || Platform.OS === 'tvos'
  const tvStyles = getTvStyles(isTV)

  const isHebrew = i18n.language === 'he' || isRTL
  const colors = HIGHLIGHT_COLORS[highlight.highlight_type]
  const Icon = HIGHLIGHT_ICONS[highlight.highlight_type] || Zap

  return (
    <View style={[styles.highlightCard, isTV && styles.highlightCardTV]}>
      {/* Header */}
      <View style={[styles.cardHeader, isHebrew && styles.cardHeaderRTL]}>
        <View style={[styles.typeContainer, isHebrew && styles.typeContainerRTL]}>
          <Icon size={isTV ? 20 : 14} color={colors.icon} />
          <View style={[styles.typeBadge, { backgroundColor: colors.bg }]}>
            <Text style={[styles.typeText, tvStyles.typeText, { color: colors.text }]}>
              {t(`highlights.types.${highlight.highlight_type}`)}
            </Text>
          </View>
        </View>

        <View style={styles.confidenceContainer}>
          <Text style={styles.confidenceText}>
            {formatConfidence(highlight.confidence)}
          </Text>
          {onDismiss && (
            <Pressable
              onPress={onDismiss}
              style={styles.dismissButton}
              accessibilityLabel={t('common.dismiss')}
            >
              <X size={isTV ? 20 : 12} color="#9CA3AF" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Transcript */}
      <Text
        style={[
          styles.transcriptText,
          tvStyles.transcriptText,
          isHebrew && styles.transcriptTextRTL,
        ]}
        numberOfLines={3}
      >
        {highlight.transcript_text}
      </Text>

      {/* Timestamp */}
      <View style={[styles.timestampContainer, isHebrew && styles.timestampContainerRTL]}>
        <Clock size={isTV ? 14 : 10} color="rgba(255, 255, 255, 0.5)" />
        <Text style={[styles.timestampText, tvStyles.timestampText]}>
          {formatISOTimestamp(highlight.created_at, isHebrew, false)}
        </Text>
      </View>
    </View>
  )
}

export default HighlightCard
