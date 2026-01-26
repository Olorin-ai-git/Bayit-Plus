import { View, Text, Pressable, StyleSheet } from 'react-native'
import { X, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { GlassView, GlassCheckbox } from '@bayit/shared/ui'
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

  const contentTypeOptions = [
    { value: 'all', label: t('common.all') },
    { value: 'series', label: t('admin.content.filters.series') },
    { value: 'movies', label: t('admin.content.filters.movies') },
    { value: 'podcasts', label: t('admin.content.filters.podcasts') },
    { value: 'radio', label: t('admin.content.filters.radioStations') },
  ]

  const statusOptions = [
    { value: '', label: t('admin.content.filters.allStatus') },
    { value: 'published', label: t('admin.content.status.published') },
    { value: 'draft', label: t('admin.content.status.draft') },
  ]

  const handleContentTypeChange = (value: string) => {
    console.log('[ContentFiltersDropdown] Content type changed:', value)
    onFiltersChange({
      ...filters,
      content_type: value as ContentFilters['content_type'],
    })
  }

  const handleStatusChange = (value: string) => {
    console.log('[ContentFiltersDropdown] Status changed:', value)
    const newFilters = {
      ...filters,
      is_published: value === '' ? undefined : value === 'published',
    }
    console.log('[ContentFiltersDropdown] New filters:', newFilters)
    onFiltersChange(newFilters)
  }

  const currentStatusValue = filters.is_published === undefined ? '' : filters.is_published ? 'published' : 'draft'

  return (
    <Pressable style={styles.overlay} onPress={onClose}>
      <Pressable
        style={[
          styles.dropdown,
          isRTL ? styles.dropdownRTL : styles.dropdownLTR
        ]}
        onPress={(e) => e.stopPropagation()}
      >
        <View style={[styles.header, isRTL && styles.headerRTL]}>
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
            <View style={styles.optionsList}>
              {contentTypeOptions.map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.optionItem,
                    (filters.content_type || 'all') === option.value && styles.optionItemSelected,
                    isRTL && styles.optionItemRTL,
                  ]}
                  onPress={() => handleContentTypeChange(option.value)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      (filters.content_type || 'all') === option.value && styles.optionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {(filters.content_type || 'all') === option.value && (
                    <Check size={16} color={colors.primary.DEFAULT} />
                  )}
                </Pressable>
              ))}
            </View>
          </View>

          {/* Status Filter */}
          <View style={styles.section}>
            <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>
              {t('admin.content.columns.status')}
            </Text>
            <View style={styles.optionsList}>
              {statusOptions.map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.optionItem,
                    currentStatusValue === option.value && styles.optionItemSelected,
                    isRTL && styles.optionItemRTL,
                  ]}
                  onPress={() => handleStatusChange(option.value)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      currentStatusValue === option.value && styles.optionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {currentStatusValue === option.value && (
                    <Check size={16} color={colors.primary.DEFAULT} />
                  )}
                </Pressable>
              ))}
            </View>
          </View>

          {/* Subtitles Filter */}
          <View style={styles.section}>
            <GlassCheckbox
              checked={showOnlyWithSubtitles}
              onCheckedChange={(checked) => {
                console.log('[ContentFiltersDropdown] Subtitles filter changed:', checked)
                onSubtitlesChange(checked)
              }}
              label={t('admin.content.showOnlyWithSubtitles')}
            />
          </View>
        </View>
      </Pressable>
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
    backgroundColor: 'rgba(15, 15, 25, 0.95)', // Darker, more opaque background
    backdropFilter: 'blur(20px)', // Glassmorphism blur effect
    // @ts-ignore - web-only property
    WebkitBackdropFilter: 'blur(20px)', // Safari support
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)', // Subtle border
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  dropdownLTR: {
    right: spacing.lg,
  },
  dropdownRTL: {
    left: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
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
    marginBottom: spacing.xs,
  },
  optionsList: {
    gap: spacing.xs,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  optionItemRTL: {
    flexDirection: 'row-reverse',
  },
  optionItemSelected: {
    backgroundColor: 'rgba(124, 58, 237, 0.2)', // primary color with transparency
    borderColor: colors.primary.DEFAULT,
  },
  optionText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  optionTextSelected: {
    color: colors.text,
    fontWeight: '600',
  },
})
