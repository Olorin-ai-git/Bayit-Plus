import { View, Text, Pressable, StyleSheet } from 'react-native'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { GlassSelect, GlassCheckbox } from '@bayit/shared/ui'
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens'

interface ContentFilters {
  search: string
  is_published?: boolean
  content_type: 'all' | 'series' | 'movies' | 'podcasts' | 'radio' | ''
}

interface ContentFiltersDropdownProps {
  visible: boolean
  filters: ContentFilters
  showOnlyWithSubtitles: boolean
  onFiltersChange: (filters: ContentFilters) => void
  onSubtitlesChange: (value: boolean) => void
  onClose: () => void
  isRTL: boolean
}

export default function ContentFiltersDropdown({
  visible,
  filters,
  showOnlyWithSubtitles,
  onFiltersChange,
  onSubtitlesChange,
  onClose,
  isRTL,
}: ContentFiltersDropdownProps) {
  const { t } = useTranslation()

  if (!visible) return null

  return (
    <Pressable style={styles.overlay} onPress={onClose}>
      <View style={[styles.dropdown, { [isRTL ? 'left' : 'right']: spacing.lg }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t('common.filters')}
          </Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <X size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.content}>
          {/* Content Type Filter */}
          <View style={styles.section}>
            <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>
              {t('admin.content.filters.contentType')}
            </Text>
            <GlassSelect
              value={filters.content_type || 'all'}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  content_type: value as ContentFilters['content_type'],
                })
              }
              options={[
                { value: 'all', label: t('common.all') },
                { value: 'series', label: t('admin.content.filters.series') },
                { value: 'movies', label: t('admin.content.filters.movies') },
                { value: 'podcasts', label: t('admin.content.filters.podcasts') },
                { value: 'radio', label: t('admin.content.filters.radioStations') },
              ]}
            />
          </View>

          {/* Status Filter */}
          <View style={styles.section}>
            <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>
              {t('admin.content.columns.status')}
            </Text>
            <GlassSelect
              value={
                filters.is_published === undefined ? '' : filters.is_published ? 'published' : 'draft'
              }
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  is_published: value === '' ? undefined : value === 'published',
                })
              }
              options={[
                { value: '', label: t('admin.content.filters.allStatus') },
                { value: 'published', label: t('admin.content.status.published') },
                { value: 'draft', label: t('admin.content.status.draft') },
              ]}
            />
          </View>

          {/* Subtitles Filter */}
          <View style={styles.section}>
            <GlassCheckbox
              checked={showOnlyWithSubtitles}
              onCheckedChange={onSubtitlesChange}
              label={t('admin.content.showOnlyWithSubtitles')}
            />
          </View>
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  dropdown: {
    position: 'absolute',
    top: 80,
    width: 320,
    maxHeight: '80%',
    backgroundColor: colors.glass.bg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textSecondary,
  },
})
