/**
 * CatchUpSummaryCard Component
 * Glass overlay card displaying the AI-generated catch-up summary
 * with program info, key points, window info, and credit usage.
 */

import React, { useState } from 'react'
import { View, Text, Pressable, StyleSheet, ScrollView, I18nManager } from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors, spacing, borderRadius, fontSize, glass } from '@olorin/design-tokens'
import { X, Clock, ChevronRight, Sparkles } from 'lucide-react'
import type { CatchUpSummary } from '../hooks/useCatchUp'

interface CatchUpSummaryCardProps {
  summary: CatchUpSummary
  onClose: () => void
}

function formatWindowDuration(start: string, end: string): string {
  const startDate = new Date(start)
  const endDate = new Date(end)
  const diffMs = endDate.getTime() - startDate.getTime()
  return Math.max(1, Math.round(diffMs / 60000)).toString()
}

export default function CatchUpSummaryCard({ summary, onClose }: CatchUpSummaryCardProps) {
  const { t } = useTranslation()
  const [isHovered, setIsHovered] = useState(false)
  const windowMinutes = formatWindowDuration(summary.windowStart, summary.windowEnd)
  const programTitle = summary.programInfo?.title
  const genre = summary.programInfo?.genre

  return (
    <View style={styles.container}>
      <Pressable
        onHoverIn={() => setIsHovered(true)}
        onHoverOut={() => setIsHovered(false)}
        accessible
        accessibilityRole="none"
      >
        <View
          style={[styles.card, isHovered && styles.cardHovered]}
          accessibilityRole="alert"
          accessibilityLabel={t('catchup.summary.title')}
        >
          {/* Header */}
          <View style={styles.header}>
            <Sparkles size={18} color={colors.primary[400]} />
            <Text style={styles.headerTitle}>{t('catchup.summary.title')}</Text>
            <Pressable onPress={onClose} accessibilityLabel={t('common.close')} style={styles.closeButton}>
              <X size={16} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Program Info */}
          {(programTitle || genre) && (
            <View style={styles.programRow}>
              {programTitle && <Text style={styles.programTitle}>{programTitle}</Text>}
              {genre && (
                <View style={styles.genreBadge}>
                  <Text style={styles.genreText}>{genre}</Text>
                </View>
              )}
            </View>
          )}

          {/* Summary Text */}
          <ScrollView style={styles.scrollArea} nestedScrollEnabled>
            <Text style={styles.summaryText}>{summary.summary}</Text>

            {/* Key Points */}
            {summary.keyPoints.length > 0 && (
              <View style={styles.keyPointsSection}>
                <Text style={styles.keyPointsLabel}>{t('catchup.summary.keyPoints')}</Text>
                {summary.keyPoints.map((point, index) => (
                  <View key={`kp-${index}`} style={styles.keyPointRow}>
                    <ChevronRight size={14} color={colors.primary[400]} />
                    <Text style={styles.keyPointText}>{point}</Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Footer: window info + credits */}
          <View style={styles.footer}>
            <View style={styles.footerLeft}>
              <Clock size={12} color={colors.textMuted} />
              <Text style={styles.footerText}>
                {t('catchup.summary.window', { minutes: windowMinutes })}
              </Text>
            </View>
            <View style={styles.footerRight}>
              <Text style={styles.creditsUsed}>
                {t('catchup.summary.creditsUsed', { credits: summary.creditsUsed })}
              </Text>
              <Text style={styles.creditsRemaining}>
                {t('catchup.summary.remaining', { balance: summary.remainingCredits })}
              </Text>
            </View>
          </View>

          {summary.cached && (
            <Text style={styles.cachedIndicator}>{t('catchup.summary.cached')}</Text>
          )}
        </View>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: spacing.lg,
    ...(I18nManager.isRTL ? { left: spacing.lg } : { right: spacing.lg }),
    zIndex: 100,
    width: '90%',
    maxWidth: 400,
  },
  card: {
    backgroundColor: glass.bgStrong, borderRadius: borderRadius.lg, padding: spacing.md,
    borderWidth: 1, borderColor: glass.border,
    // @ts-expect-error backdropFilter is web-only
    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
  },
  cardHovered: { borderColor: glass.borderFocus },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  headerTitle: { flex: 1, color: colors.text, fontSize: fontSize.base, fontWeight: '600' },
  closeButton: { padding: spacing.xs, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  programRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  programTitle: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600' },
  genreBadge: {
    backgroundColor: glass.purpleLight, borderRadius: borderRadius.sm, paddingHorizontal: spacing.xs, paddingVertical: 2,
  },
  genreText: { color: colors.primary[300], fontSize: fontSize.xs, fontWeight: '500' },
  scrollArea: { maxHeight: 200, marginBottom: spacing.sm },
  summaryText: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 20 },
  keyPointsSection: { marginTop: spacing.sm },
  keyPointsLabel: { color: colors.textMuted, fontSize: fontSize.xs, fontWeight: '600', marginBottom: spacing.xs, textTransform: 'uppercase' },
  keyPointRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, marginBottom: spacing.xs },
  keyPointText: { flex: 1, color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 20 },
  footer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: colors.glassBorderWhite, paddingTop: spacing.sm,
  },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  footerText: { color: colors.textMuted, fontSize: fontSize.xs },
  footerRight: { alignItems: 'flex-end' },
  creditsUsed: { color: colors.primary[400], fontSize: fontSize.xs, fontWeight: '600' },
  creditsRemaining: { color: colors.textMuted, fontSize: 10 },
  cachedIndicator: { color: colors.success.DEFAULT, fontSize: 10, marginTop: spacing.xs, fontWeight: '500' },
})
