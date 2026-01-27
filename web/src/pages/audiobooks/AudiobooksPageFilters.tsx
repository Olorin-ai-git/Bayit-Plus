/**
 * Audiobooks Page Filters
 * Filter panel for discovery page with options
 */

import { useState } from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import { colors, spacing } from '@olorin/design-tokens'
import { GlassSelect, GlassButton, GlassView } from '@bayit/shared/ui'
import type { AudiobookFilters, AudioQuality, SubscriptionTier } from '@/types/audiobook'

const AUDIO_QUALITIES: AudioQuality[] = ['8-bit', '16-bit', '24-bit', '32-bit', 'high-fidelity', 'standard', 'premium', 'lossless']
const SUBSCRIPTION_TIERS: SubscriptionTier[] = ['free', 'basic', 'premium', 'family']
const SORT_OPTIONS = ['title', 'newest', 'views', 'rating'] as const

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: `${colors.border}33` },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  title: { fontSize: 14, fontWeight: '600', color: colors.text },
  content: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  selectContainer: { flex: 1, minWidth: 150 },
  buttonGroup: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: `${colors.border}33` },
  button: { flex: 1 },
})

interface AudiobooksPageFiltersProps {
  filters: AudiobookFilters
  onChange: (filters: AudiobookFilters) => void
  isRTL?: boolean
}

export default function AudiobooksPageFilters({
  filters,
  onChange,
}: AudiobooksPageFiltersProps) {
  const { t } = useTranslation()
  const [isExpanded, setIsExpanded] = useState(false)

  const handleQualityChange = (quality: AudioQuality) => {
    onChange({ ...filters, audio_quality: quality !== filters.audio_quality ? quality : undefined })
  }

  const handleSubscriptionChange = (tier: SubscriptionTier) => {
    onChange({ ...filters, requires_subscription: tier !== filters.requires_subscription ? tier : undefined })
  }

  const handleSortChange = (sort: string) => {
    onChange({ ...filters, sort_by: (sort as any) || 'newest' })
  }

  const handleClear = () => {
    onChange({ page: 1, page_size: 50 })
  }

  return (
    <GlassView style={styles.container}>
      <Pressable
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <Text style={styles.title}>
          {t('audiobooks.filters', 'Filters')}
        </Text>
        <View
          style={[
            styles.toggleButton,
            isExpanded && { transform: [{ rotate: '180deg' }] },
          ]}
        >
          <ChevronDown size={20} color={colors.text} />
        </View>
      </Pressable>

      {isExpanded && (
        <View style={styles.content}>
          {/* Audio Quality Filter */}
          <View style={styles.selectContainer}>
            <GlassSelect
              label={t('audiobooks.quality', 'Audio Quality')}
              value={filters.audio_quality || ''}
              onChangeText={handleQualityChange}
              options={AUDIO_QUALITIES.map((q) => ({
                label: q,
                value: q,
              }))}
            />
          </View>

          {/* Subscription Tier Filter */}
          <View style={styles.selectContainer}>
            <GlassSelect
              label={t('audiobooks.subscription', 'Subscription')}
              value={filters.requires_subscription || ''}
              onChangeText={handleSubscriptionChange}
              options={SUBSCRIPTION_TIERS.map((tier) => ({
                label: t(`audiobooks.tier.${tier}`, tier),
                value: tier,
              }))}
            />
          </View>

          {/* Sort Filter */}
          <View style={styles.selectContainer}>
            <GlassSelect
              label={t('audiobooks.sortBy', 'Sort By')}
              value={filters.sort_by || 'newest'}
              onChangeText={handleSortChange}
              options={SORT_OPTIONS.map((opt) => ({
                label: t(`audiobooks.sort.${opt}`, opt),
                value: opt,
              }))}
            />
          </View>

          {/* Sort Order */}
          <View style={styles.selectContainer}>
            <GlassSelect
              label={t('audiobooks.sortOrder', 'Order')}
              value={filters.sort_order || 'desc'}
              onChangeText={(val) =>
                onChange({
                  ...filters,
                  sort_order: (val as 'asc' | 'desc') || 'desc',
                })
              }
              options={[
                { label: t('common.descending', 'Newest First'), value: 'desc' },
                { label: t('common.ascending', 'Oldest First'), value: 'asc' },
              ]}
            />
          </View>

          {/* Buttons */}
          <View style={styles.buttonGroup}>
            <GlassButton
              style={styles.button}
              variant="secondary"
              onPress={handleClear}
            >
              {t('common.clear', 'Clear')}
            </GlassButton>
            <GlassButton
              style={styles.button}
              onPress={() => setIsExpanded(false)}
            >
              {t('common.apply', 'Apply')}
            </GlassButton>
          </View>
        </View>
      )}
    </GlassView>
  )
}
