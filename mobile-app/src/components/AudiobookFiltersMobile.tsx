/**
 * Audiobook Filters (Mobile)
 * Expandable filter panel for mobile
 */

import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import { GlassSelect, GlassButton } from '@bayit/shared/ui'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import type { AudiobookFilters } from '@/types/audiobook'

const AUDIO_QUALITIES = ['8-bit', '16-bit', '24-bit', '32-bit', 'high-fidelity', 'standard', 'premium', 'lossless']
const SUBSCRIPTION_TIERS = ['free', 'basic', 'premium', 'family']
const SORT_OPTIONS = ['title', 'newest', 'views', 'rating']

interface AudiobookFiltersMobileProps {
  filters: AudiobookFilters
  onChange: (filters: AudiobookFilters) => void
  isRTL: boolean
}

export default function AudiobookFiltersMobile({ filters, onChange, isRTL }: AudiobookFiltersMobileProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  const updateFilter = (key: string, value: any) => {
    onChange({ ...filters, [key]: value, page: 1 })
  }

  const handleClear = () => {
    onChange({ page: 1, page_size: 20 })
  }

  return (
    <View style={styles.container}>
      <Pressable style={styles.header} onPress={() => setExpanded(!expanded)}>
        <Text style={styles.headerText}>{t('common.filters', 'Filters')}</Text>
        <ChevronDown size={20} color={colors.text} style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }} />
      </Pressable>

      {expanded && (
        <ScrollView style={styles.panel} showsVerticalScrollIndicator={false}>
          <GlassSelect
            label={t('audiobooks.quality', 'Audio Quality')}
            options={AUDIO_QUALITIES.map(q => ({ label: q, value: q }))}
            value={(filters as any).audio_quality || ''}
            onChange={(quality) => updateFilter('audio_quality', quality)}
            containerStyle={styles.filterItem}
          />

          <GlassSelect
            label={t('audiobooks.subscription', 'Subscription')}
            options={SUBSCRIPTION_TIERS.map(t => ({ label: t, value: t }))}
            value={filters.requires_subscription || ''}
            onChange={(tier) => updateFilter('requires_subscription', tier)}
            containerStyle={styles.filterItem}
          />

          <GlassSelect
            label={t('audiobooks.sortBy', 'Sort By')}
            options={SORT_OPTIONS.map(s => ({ label: s, value: s }))}
            value={(filters as any).sort_by || 'title'}
            onChange={(sortBy) => updateFilter('sort_by', sortBy)}
            containerStyle={styles.filterItem}
          />

          <View style={styles.actions}>
            <GlassButton variant="secondary" style={styles.actionButton} onPress={handleClear}>
              {t('common.clear', 'Clear')}
            </GlassButton>
            <GlassButton variant="primary" style={styles.actionButton} onPress={() => setExpanded(false)}>
              {t('common.apply', 'Apply')}
            </GlassButton>
          </View>
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { backgroundColor: 'rgba(255,255,255,0.03)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, paddingHorizontal: spacing.lg },
  headerText: { fontSize: 14, fontWeight: '600', color: colors.text },
  panel: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, maxHeight: 400 },
  filterItem: { marginBottom: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionButton: { flex: 1 },
})
