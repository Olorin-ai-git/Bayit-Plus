/**
 * AddContentModal - Add content items to featured sections
 * Modal for searching, filtering, and selecting content to add to featured sections
 * Matches Glass design system and admin content page styling
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Image,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { Search, Plus, Film } from 'lucide-react'
import { GlassModal, GlassButton, GlassInput, GlassCheckbox } from '@bayit/shared/ui'
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens'
import { useDirection } from '@/hooks/useDirection'
import { useSelection } from '@/hooks/admin/useSelection'
import { adminContentService, Content } from '@/services/adminApi'
import logger from '@/utils/logger'

interface AddContentModalProps {
  visible: boolean
  sectionId: string
  sectionSlug: string
  existingContentIds: string[]
  onClose: () => void
  onAdd: (contentIds: string[]) => Promise<void>
}

type FilterType = 'all' | 'movies' | 'series' | 'audiobooks' | 'podcasts'

// Map section slugs to content types
const getSectionContentType = (slug: string): FilterType | null => {
  const slugLower = slug.toLowerCase()
  if (slugLower.includes('movie') || slugLower === 'films') return 'movies'
  if (slugLower.includes('series') || slugLower.includes('show') || slugLower === 'tv') return 'series'
  if (slugLower.includes('audiobook') || slugLower.includes('audio-book')) return 'audiobooks'
  if (slugLower.includes('podcast')) return 'podcasts'
  // Generic sections like 'trending', 'new-releases', 'featured' show all content
  return null
}

export default function AddContentModal({
  visible,
  sectionId,
  sectionSlug,
  existingContentIds,
  onClose,
  onAdd,
}: AddContentModalProps) {
  const { t } = useTranslation()
  const { isRTL } = useDirection()
  const { selectedIds, handleSelect, clearSelection } = useSelection()

  // Determine if section is category-specific
  const sectionContentType = useMemo(() => getSectionContentType(sectionSlug), [sectionSlug])
  const isCategoryLocked = sectionContentType !== null

  const [searchQuery, setSearchQuery] = useState('')
  // Use section's content type if locked, otherwise allow user selection
  const [filterType, setFilterType] = useState<FilterType>(sectionContentType || 'all')
  const [publishedOnly, setPublishedOnly] = useState(true)
  const [items, setItems] = useState<Content[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 })

  const loadContent = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Use locked content type if section is category-specific, otherwise use user selection
      const effectiveFilter = isCategoryLocked ? sectionContentType : filterType

      // Map filter type to API content_type parameter
      const getContentTypeParam = (filter: FilterType | null): string | undefined => {
        switch (filter) {
          case 'movies': return 'movies'
          case 'series': return 'series'
          case 'audiobooks': return 'audiobook'
          case 'podcasts': return 'podcast'
          default: return undefined
        }
      }

      const apiFilters = {
        page: pagination.page,
        page_size: pagination.pageSize,
        search: searchQuery,
        is_published: publishedOnly,
        content_type: getContentTypeParam(effectiveFilter),
      }

      const response = await adminContentService.getContentHierarchical(apiFilters)

      const filtered = (response.items || []).filter(
        (item: Content) => !existingContentIds.includes(item.id)
      )

      setItems(filtered)
      setPagination((prev) => ({ ...prev, total: response.total }))
      logger.info('Content loaded for featured selection', {
        count: filtered.length,
        filters: apiFilters,
      })
    } catch (err) {
      let msg = 'Failed to load content'
      if (err instanceof Error) {
        msg = err.message
      }
      logger.error('Failed to load content for modal', { error: err })
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [pagination.page, pagination.pageSize, searchQuery, filterType, publishedOnly, existingContentIds, isCategoryLocked, sectionContentType])

  // Reset filter type when section changes
  useEffect(() => {
    setFilterType(sectionContentType || 'all')
  }, [sectionContentType])

  useEffect(() => {
    if (visible) {
      loadContent()
    }
  }, [visible, loadContent])

  const handleAddSelected = useCallback(async () => {
    if (selectedIds.length === 0) return

    setIsAdding(true)
    try {
      await onAdd(selectedIds)
      clearSelection()
      setSearchQuery('')
      setFilterType(sectionContentType || 'all')
      setPagination({ page: 1, pageSize: 20, total: 0 })
      setItems([])
      onClose()
      logger.info('Content added to featured section', { count: selectedIds.length })
    } catch (err) {
      logger.error('Failed to add content', { error: err })
    } finally {
      setIsAdding(false)
    }
  }, [selectedIds, onAdd, clearSelection, onClose, sectionContentType])

  const handleClose = useCallback(() => {
    clearSelection()
    setSearchQuery('')
    setFilterType(sectionContentType || 'all')
    setError(null)
    setPagination({ page: 1, pageSize: 20, total: 0 })
    setItems([])
    onClose()
  }, [clearSelection, onClose, sectionContentType])

  const filteredItems = useMemo(() => items, [items])

  const totalPages = Math.ceil(pagination.total / pagination.pageSize)
  const canGoNext = pagination.page < totalPages
  const canGoPrev = pagination.page > 1

  return (
    <GlassModal
      visible={visible}
      title={t('admin.featured.addContentToSection', {
        section: sectionSlug,
        defaultValue: `Add Content to ${sectionSlug}`,
      })}
      onClose={handleClose}
      dismissable
      buttons={[]}
    >
      <View style={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={18} color={colors.textSecondary} />
          <GlassInput
            placeholder={t('common.search')}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
        </View>

        {/* Filter Tabs - Hidden when category is locked to section type */}
        <View style={[styles.filterTabs, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {isCategoryLocked ? (
            // Show locked category indicator
            <View style={[styles.filterButton, styles.filterButtonActive, styles.categoryLocked]}>
              <Text style={[styles.filterText, styles.filterTextActive]}>
                {sectionContentType === 'movies' && t('admin.content.movies', { defaultValue: 'Movies' })}
                {sectionContentType === 'series' && t('admin.content.series', { defaultValue: 'Series' })}
                {sectionContentType === 'audiobooks' && t('admin.content.audiobooks', { defaultValue: 'Audiobooks' })}
                {sectionContentType === 'podcasts' && t('admin.content.podcasts', { defaultValue: 'Podcasts' })}
              </Text>
            </View>
          ) : (
            // Show filter tabs for generic sections
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
              <View style={[styles.filterButtonRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {(['all', 'movies', 'series', 'audiobooks', 'podcasts'] as FilterType[]).map((type) => (
                  <Pressable
                    key={type}
                    style={[
                      styles.filterButton,
                      filterType === type && styles.filterButtonActive,
                    ]}
                    onPress={() => {
                      setFilterType(type)
                      setPagination({ page: 1, pageSize: 20, total: 0 })
                    }}
                  >
                    <Text style={[styles.filterText, filterType === type && styles.filterTextActive]}>
                      {type === 'all' && t('common.all')}
                      {type === 'movies' && t('admin.content.movies', { defaultValue: 'Movies' })}
                      {type === 'series' && t('admin.content.series', { defaultValue: 'Series' })}
                      {type === 'audiobooks' && t('admin.content.audiobooks', { defaultValue: 'Audiobooks' })}
                      {type === 'podcasts' && t('admin.content.podcasts', { defaultValue: 'Podcasts' })}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          )}

          <View style={{ flex: 1 }} />

          <GlassCheckbox
            checked={publishedOnly}
            onCheckedChange={setPublishedOnly}
            label={t('admin.content.publishedOnly', { defaultValue: 'Published' })}
          />
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Content Grid */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
            <Text style={styles.loadingText}>{t('common.loading')}</Text>
          </View>
        ) : filteredItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Film size={48} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyText}>
              {searchQuery ? t('common.noResults') : t('admin.featured.noContentAvailable')}
            </Text>
            {!searchQuery && (
              <Text style={styles.emptySubtext}>{t('admin.featured.selectContentToAdd')}</Text>
            )}
          </View>
        ) : (
          <ScrollView style={styles.contentList} contentContainerStyle={styles.contentGrid}>
            {filteredItems.map((item) => {
              const isSelected = selectedIds.includes(item.id)
              return (
              <Pressable
                key={item.id}
                style={[
                  styles.contentCard,
                  isSelected && styles.contentCardSelected,
                ]}
                onPress={() => handleSelect(item.id, !isSelected)}
              >
                <View style={styles.checkboxOverlay} pointerEvents="none">
                  <GlassCheckbox
                    checked={isSelected}
                    onCheckedChange={() => {}}
                  />
                </View>
                {item.thumbnail ? (
                  <Image
                    source={{ uri: item.thumbnail }}
                    style={styles.thumbnailImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.thumbnailPlaceholder}>
                    <Text style={styles.placeholderText}>{item.title}</Text>
                  </View>
                )}
              </Pressable>
            )})}
          </ScrollView>
        )}

        {/* Pagination */}
        {!isLoading && filteredItems.length > 0 && (
          <View style={[styles.paginationContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <GlassButton
              title={t('common.previous')}
              onPress={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              disabled={!canGoPrev}
              variant="outline"
              style={{ flex: 1 }}
            />
            <Text style={styles.paginationText}>
              {t('common.pageOf', {
                page: pagination.page,
                total: totalPages,
              })}
            </Text>
            <GlassButton
              title={t('common.next')}
              onPress={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              disabled={!canGoNext}
              variant="outline"
              style={{ flex: 1 }}
            />
          </View>
        )}

        {/* Footer Buttons */}
        <View style={[styles.footer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <GlassButton
            title={t('common.cancel')}
            onPress={handleClose}
            variant="ghost"
            style={{ flex: 1 }}
          />
          <GlassButton
            title={t('admin.featured.addSelected', {
              count: selectedIds.length,
              defaultValue: `Add Selected (${selectedIds.length})`,
            })}
            onPress={handleAddSelected}
            disabled={selectedIds.length === 0}
            loading={isAdding}
            variant="primary"
            icon={<Plus size={18} />}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </GlassModal>
  )
}

const styles = StyleSheet.create({
  container: {
    minHeight: 500,
    maxHeight: 700,
    gap: spacing.md,
    display: 'flex',
    flexDirection: 'column',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchInput: {
    flex: 1,
  },
  filterTabs: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  filterScrollView: {
    flexGrow: 0,
    maxWidth: '70%',
  },
  filterButtonRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  filterButtonActive: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  categoryLocked: {
    cursor: 'default' as any,
    opacity: 0.9,
  },
  filterText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.text,
    fontWeight: '600',
  },
  errorBanner: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.error.DEFAULT + '20',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.error.DEFAULT + '40',
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.error.DEFAULT,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 300,
    paddingVertical: spacing.xl,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
    minHeight: 300,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary.DEFAULT + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  contentList: {
    flex: 1,
    minHeight: 200,
  },
  contentGrid: {
    display: 'grid' as any,
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' as any,
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  contentCard: {
    position: 'relative',
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    aspectRatio: 3 / 4,
    cursor: 'pointer' as any,
    transition: 'all 0.2s ease' as any,
  },
  contentCardSelected: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary.DEFAULT + '20',
  },
  checkboxOverlay: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 10,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.md,
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(107, 33, 168, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  placeholderText: {
    fontSize: fontSize.xs,
    color: colors.text,
    textAlign: 'center',
  },
  paginationContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  paginationText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.lg,
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
})
