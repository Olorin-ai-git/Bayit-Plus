/**
 * Audiobook Metadata Card
 * Displays audiobook specifications and metadata
 */

import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { NativeIcon } from '@olorin/shared-icons/native'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { GlassCard } from '@bayit/shared/ui'
import type { Audiobook } from '@/types/audiobook'

const styles = StyleSheet.create({
  container: { marginVertical: spacing.lg },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: `${colors.border}33`,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.border}33`,
  },
  spec: { flex: 1, minWidth: 150 },
  specLabel: { fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  specValue: { fontSize: 14, fontWeight: '500', color: colors.text, marginTop: spacing.xs },
  ratingContainer: { backgroundColor: `${colors.primary.DEFAULT}11`, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: borderRadius.md, marginTop: spacing.lg },
  ratingLabel: { fontSize: 12, color: colors.textMuted, marginBottom: spacing.xs },
  rating: { fontSize: 16, fontWeight: '600', color: colors.accent },
})

interface AudiobookMetadataCardProps {
  audiobook: Audiobook
}

export default function AudiobookMetadataCard({ audiobook }: AudiobookMetadataCardProps) {
  const { t } = useTranslation()

  const specs = [
    { label: 'duration', value: audiobook.duration },
    { label: 'quality', value: audiobook.audio_quality },
    { label: 'isbn', value: audiobook.isbn },
    { label: 'publisher', value: audiobook.publisher_name },
    { label: 'year', value: audiobook.year?.toString() },
  ].filter(s => s.value)

  return (
    <View style={styles.container}>
      {specs.length > 0 && (
        <View style={styles.specsGrid}>
          {specs.map((spec) => (
            <View key={spec.label} style={styles.spec}>
              <Text style={styles.specLabel}>{t(`audiobooks.${spec.label}`, spec.label)}</Text>
              <Text style={styles.specValue}>{spec.value}</Text>
            </View>
          ))}
        </View>
      )}

      {audiobook.avg_rating > 0 && (
        <GlassCard style={styles.ratingContainer}>
          <Text style={styles.ratingLabel}>{t('audiobooks.averageRating', 'Average Rating')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <NativeIcon name="info" size="sm" color={colors.accent} />
            <Text style={styles.rating}>{audiobook.avg_rating.toFixed(1)} / 5.0</Text>
          </View>
        </GlassCard>
      )}
    </View>
  )
}
