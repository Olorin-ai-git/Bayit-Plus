import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { GlassSelect } from '@bayit/shared/ui'
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens'

type ContentType = 'all' | 'movie' | 'series'

interface FeaturedFiltersProps {
  filterType: ContentType
  itemCount: number
  onFilterChange: (type: ContentType) => void
  isRTL: boolean
}

export default function FeaturedFilters({
  filterType,
  itemCount,
  onFilterChange,
  isRTL,
}: FeaturedFiltersProps) {
  const { t } = useTranslation()

  return (
    <View style={[styles.container, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <View style={styles.selectWrapper}>
        <GlassSelect
          value={filterType}
          onValueChange={(value) => onFilterChange(value as ContentType)}
          options={[
            { value: 'all', label: t('common.all') },
            { value: 'movie', label: t('vod.movies') },
            { value: 'series', label: t('vod.series') },
          ]}
        />
      </View>
      <View style={styles.countBadge}>
        <Text style={styles.countText}>
          {t('admin.featured.count', { count: itemCount })}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
    alignItems: 'center',
    zIndex: 1000,
  },
  selectWrapper: {
    flex: 1,
    maxWidth: 300,
    zIndex: 1000,
    position: 'relative',
  },
  countBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary + '20',
    borderRadius: borderRadius.full,
  },
  countText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
})
