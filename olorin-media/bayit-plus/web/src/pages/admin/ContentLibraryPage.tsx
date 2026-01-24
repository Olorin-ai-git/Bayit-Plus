import { useState, useEffect, useCallback, useRef } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next'
import { Search, X, AlertCircle, RefreshCw, Trash2, Star, StarOff, Filter, Merge } from 'lucide-react'
import HierarchicalContentTable from '@/components/admin/HierarchicalContentTable'
import MergeWizard from '@/components/admin/content/MergeWizard'
import { adminContentService } from '@/services/adminApi'
import { GlassInput, GlassSelect, GlassButton, GlassCheckbox } from '@bayit/shared/ui'
import { useDirection } from '@/hooks/useDirection'
import { useModal } from '@/contexts/ModalContext'
import logger from '@/utils/logger'
import { spacing, borderRadius, colors } from '@bayit/shared/theme'

interface ContentItem {
  id: string
  title: string
  description?: string
  thumbnail?: string
  category_name?: string
  year?: number
  is_series: boolean
  is_published: boolean
  is_featured: boolean
  episode_count?: number
  view_count?: number
  avg_rating?: number
  available_subtitles?: string[]
}

interface Pagination {
  page: number
  pageSize: number
  total: number
}

export default function ContentLibraryPage() {
  const { t } = useTranslation()
  const { isRTL, textAlign, flexDirection } = useDirection()
  const { showConfirm, showSuccess } = useModal()
  const [items, setItems] = useState<ContentItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0 })
  const [searchQuery, setSearchQuery] = useState('')
  const [showOnlyWithSubtitles, setShowOnlyWithSubtitles] = useState(false)
  const [filters, setFilters] = useState({
    search: '',
    is_published: undefined as boolean | undefined,
  })

  // Selection state for batch operations
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectedItemsData, setSelectedItemsData] = useState<ContentItem[]>([])
  const [isBatchProcessing, setIsBatchProcessing] = useState(false)
  const [showMergeModal, setShowMergeModal] = useState(false)

  // Debug merge modal state
  useEffect(() => {
    console.log('[ContentLibraryPage] showMergeModal changed:', showMergeModal)
    console.log('[ContentLibraryPage] selectedIds:', selectedIds.length, selectedIds)
    console.log('[ContentLibraryPage] selectedItemsData:', selectedItemsData.length, selectedItemsData.map(i => i.id))
    console.log('[ContentLibraryPage] items available:', items.length)
  }, [showMergeModal, selectedIds, selectedItemsData, items])

  // Filters dropdown state
  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false)
  const filtersButtonRef = useRef<View>(null)

  const loadContent = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Use hierarchical endpoint - returns only parent items (series/movies) with episode counts
      const response = await adminContentService.getContentHierarchical({
        page: pagination.page,
        page_size: pagination.pageSize,
        search: filters.search || undefined,
        is_published: filters.is_published,
      })
      setItems(response.items || [])
      setPagination((prev) => ({ ...prev, total: response.total || 0 }))
    } catch (err: any) {
      // Extract meaningful error message
      let msg = 'Failed to load content'
      if (err?.detail) {
        msg = err.detail // API error response
      } else if (err?.message) {
        msg = err.message // Error object
      } else if (typeof err === 'string') {
        msg = err
      }

      logger.error(msg, 'ContentLibraryPage', err)
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [pagination.page, pagination.pageSize, filters])

  useEffect(() => {
    loadContent()
  }, [loadContent])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setFilters({ ...filters, search: query })
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handleDeleteContent = (id: string) => {
    showConfirm(
      t('admin.content.confirmDelete'),
      async () => {
        try {
          await adminContentService.deleteContent(id)
          // Reload content to reflect the deletion
          await loadContent()
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Failed to delete content'
          logger.error(msg, 'ContentLibraryPage', err)
          setError(msg)
        }
      },
      { destructive: true, confirmText: t('common.delete', 'Delete') }
    )
  }

  const handleTogglePublish = async (id: string) => {
    try {
      const updatedContent = await adminContentService.publishContent(id)
      // Update local state instead of reloading entire collection
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === id ? { ...item, is_published: updatedContent.is_published ?? !item.is_published } : item
        )
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update content'
      logger.error(msg, 'ContentLibraryPage', err)
      setError(msg)
    }
  }

  const handleToggleFeatured = async (id: string) => {
    try {
      const updatedContent = await adminContentService.featureContent(id)
      // Update local state instead of reloading entire collection
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === id ? { ...item, is_featured: updatedContent.is_featured ?? !item.is_featured } : item
        )
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update content'
      logger.error(msg, 'ContentLibraryPage', err)
      setError(msg)
    }
  }

  // Batch operations
  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return

    showConfirm(
      t('admin.content.confirmBatchDelete', {
        count: selectedIds.length,
        defaultValue: `Are you sure you want to delete ${selectedIds.length} item(s)?`,
      }),
      async () => {
        setIsBatchProcessing(true)
        try {
          await adminContentService.batchDeleteContent(selectedIds)
          setSelectedIds([])
          setSelectedItemsData([])
          await loadContent()
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Failed to delete content'
          logger.error(msg, 'ContentLibraryPage', err)
          setError(msg)
        } finally {
          setIsBatchProcessing(false)
        }
      },
      { destructive: true, confirmText: t('common.delete', 'Delete') }
    )
  }

  const handleBatchFeature = async (featured: boolean) => {
    if (selectedIds.length === 0) return

    setIsBatchProcessing(true)
    try {
      await adminContentService.batchFeatureContent(selectedIds, featured)
      setSelectedIds([])
      setSelectedItemsData([])
      await loadContent()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update content'
      logger.error(msg, 'ContentLibraryPage', err)
      setError(msg)
    } finally {
      setIsBatchProcessing(false)
    }
  }

  const handleBatchMerge = async (
    baseId: string,
    mergeIds: string[],
    mergeConfig: any
  ) => {
    setIsBatchProcessing(true)
    try {
      const result = await adminContentService.mergeContent({
        base_id: baseId,
        merge_ids: mergeIds,
        transfer_seasons: mergeConfig.transferSeasons,
        transfer_episodes: mergeConfig.transferEpisodes,
        preserve_metadata: mergeConfig.preserveMetadata,
        dry_run: false
      })

      if (result.success) {
        // Get base item name for success message
        const baseItem = selectedItemsData.find(item => item.id === baseId)
        const mergedCount = result.items_merged

        let message = t('admin.merge.successMessage', {
          count: mergedCount,
          title: baseItem?.title || 'Unknown',
          defaultValue: `Successfully merged ${mergedCount} item(s) into "${baseItem?.title}".`
        })

        // Add transfer information for series
        if (baseItem?.is_series) {
          const episodesTransferred = result.episodes_transferred || 0
          const seasonsTransferred = result.seasons_transferred || 0

          if (episodesTransferred === 0 && seasonsTransferred === 0) {
            message += '\n\n' + t('admin.merge.noEpisodesNote', {
              defaultValue: 'Note: No episodes or seasons were transferred because they have not been created yet in the database.'
            })
          } else {
            message += '\n\n' + t('admin.merge.transferredInfo', {
              seasons: seasonsTransferred,
              episodes: episodesTransferred,
              defaultValue: `Transferred: ${seasonsTransferred} season(s), ${episodesTransferred} episode(s).`
            })
          }
        }

        showSuccess(
          message,
          t('admin.merge.mergeSuccess', 'Merge Successful')
        )

        setSelectedIds([])
        setSelectedItemsData([])
        setShowMergeModal(false)
        await loadContent()
      } else {
        setError(result.errors.join(', ') || 'Merge failed')
      }
    } catch (err: any) {
      const msg = err?.detail || err?.message || 'Failed to merge content'
      logger.error(msg, 'ContentLibraryPage', err)
      setError(msg)
    } finally {
      setIsBatchProcessing(false)
    }
  }

  const handleClearSelection = () => {
    setSelectedIds([])
    setSelectedItemsData([])
  }

  const handleSelectionChange = useCallback((ids: string[]) => {
    console.log('[handleSelectionChange] ids:', ids)
    setSelectedIds(ids)
  }, [])

  return (
    <>
      <ScrollView style={styles.container}>
        <View style={styles.content}>
        {/* Header */}
        <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.pageTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
              {t('admin.titles.content', { defaultValue: 'Content Library' })}
            </Text>
            <Text style={[styles.subtitle, { textAlign: isRTL ? 'right' : 'left' }]}>
              {t('admin.content.subtitle', { defaultValue: 'Manage movies, series, and video content' })}
            </Text>
          </View>
          <GlassButton
            title=""
            onPress={loadContent}
            variant="ghost"
            icon={<RefreshCw size={20} color="rgba(255,255,255,0.8)" />}
            disabled={isLoading}
            style={styles.refreshButton}
          />
        </View>

        {/* Search and Filters */}
        <View style={[styles.filtersContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={styles.searchWrapper}>
            <GlassInput
              placeholder={t('admin.content.searchPlaceholder', { defaultValue: 'Search content...' })}
              value={searchQuery}
              onChangeText={handleSearch}
              icon={<Search size={18} color="rgba(255,255,255,0.6)" />}
            />
          </View>
          <View ref={filtersButtonRef} style={styles.filtersButtonWrapper}>
            <GlassButton
              title={t('admin.content.filters.title', { defaultValue: 'Filters' })}
              onPress={() => setShowFiltersDropdown(!showFiltersDropdown)}
              variant="secondary"
              icon={<Filter size={18} color="rgba(255,255,255,0.8)" />}
              style={styles.filtersButton}
            />
          </View>
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <AlertCircle size={18} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => setError(null)}>
              <X size={18} color="#ef4444" />
            </Pressable>
          </View>
        )}

        {/* Batch Action Bar - shows when items are selected */}
        {selectedIds.length > 0 && (
          <View style={[styles.batchActionBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.batchActionInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.batchSelectedText, { textAlign: isRTL ? 'right' : 'left' }]}>
                {t('admin.content.selectedItems', {
                  count: selectedIds.length,
                  defaultValue: `${selectedIds.length} item(s) selected`,
                })}
              </Text>
              <Pressable onPress={handleClearSelection} style={styles.clearSelectionButton}>
                <X size={16} color="rgba(255,255,255,0.7)" />
                <Text style={styles.clearSelectionText}>
                  {t('common.clearSelection', 'Clear')}
                </Text>
              </Pressable>
            </View>
            <View style={[styles.batchActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {selectedIds.length >= 2 && (
                <GlassButton
                  title={t('admin.content.batchMerge', 'Merge')}
                  onPress={async () => {
                    console.log('Merge button clicked, selectedIds:', selectedIds)
                    // Fetch full item details for all selected IDs
                    setIsBatchProcessing(true)
                    try {
                      const itemDetails = await Promise.all(
                        selectedIds.map(id => adminContentService.getContentById(id))
                      )
                      console.log('Fetched item details:', itemDetails)
                      setSelectedItemsData(itemDetails)
                      setShowMergeModal(true)
                    } catch (err) {
                      console.error('Error fetching item details:', err)
                      setError('Failed to load selected items')
                    } finally {
                      setIsBatchProcessing(false)
                    }
                  }}
                  variant="secondary"
                  icon={<Merge size={16} color="#8b5cf6" />}
                  disabled={isBatchProcessing}
                  style={styles.batchButton}
                />
              )}
              <GlassButton
                title={t('admin.content.batchFeature', 'Feature')}
                onPress={() => handleBatchFeature(true)}
                variant="secondary"
                icon={<Star size={16} color="#f59e0b" />}
                disabled={isBatchProcessing}
                style={styles.batchButton}
              />
              <GlassButton
                title={t('admin.content.batchUnfeature', 'Unfeature')}
                onPress={() => handleBatchFeature(false)}
                variant="ghost"
                icon={<StarOff size={16} color="#9ca3af" />}
                disabled={isBatchProcessing}
                style={styles.batchButton}
              />
              <GlassButton
                title={t('common.delete', 'Delete')}
                onPress={handleBatchDelete}
                variant="danger"
                icon={<Trash2 size={16} color="#ffffff" />}
                disabled={isBatchProcessing}
                style={styles.batchButton}
              />
            </View>
          </View>
        )}

        {/* Hierarchical Content Table */}
        <HierarchicalContentTable
          items={showOnlyWithSubtitles
            ? items.filter(item => item.available_subtitles && item.available_subtitles.length > 0)
            : items
          }
          loading={isLoading}
          onTogglePublish={handleTogglePublish}
          onToggleFeatured={handleToggleFeatured}
          onDelete={handleDeleteContent}
          pagination={pagination}
          onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
          emptyMessage={t('admin.content.emptyMessage', { defaultValue: 'No content found' })}
          selectedIds={selectedIds}
          onSelectionChange={handleSelectionChange}
        />

        {/* Merge Wizard */}
        {showMergeModal && (() => {
          // Filter selectedItemsData to only include currently selected IDs
          const selectedItems = selectedItemsData.filter(item => selectedIds.includes(item.id))
          console.log('[ContentLibraryPage] Rendering MergeWizard with items:', selectedItems)
          try {
            return (
              <MergeWizard
                visible={showMergeModal}
                selectedItems={selectedItems}
                onClose={() => {
                  setShowMergeModal(false)
                  setSelectedIds([])
                  setSelectedItemsData([])
                }}
                onConfirm={handleBatchMerge}
              />
            )
          } catch (error) {
            console.error('[ContentLibraryPage] Error rendering MergeWizard:', error)
            return null
          }
        })()}
      </View>
    </ScrollView>

    {/* Filters Dropdown Overlay - Rendered outside ScrollView for proper z-index */}
    {showFiltersDropdown && (
      <Pressable
        style={styles.filtersOverlay}
        onPress={() => setShowFiltersDropdown(false)}
      >
        <View style={[styles.filtersDropdown, { [isRTL ? 'left' : 'right']: spacing.lg }]}>
          <View style={styles.filtersDropdownHeader}>
            <Text style={[styles.filtersDropdownTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
              {t('admin.content.filters.title', { defaultValue: 'Filters' })}
            </Text>
            <Pressable onPress={() => setShowFiltersDropdown(false)} style={styles.closeButton}>
              <X size={20} color="rgba(255,255,255,0.7)" />
            </Pressable>
          </View>

          <View style={styles.filtersDropdownContent}>
            {/* Status Filter */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
                {t('admin.content.filters.status', { defaultValue: 'Status' })}
              </Text>
              <GlassSelect
                placeholder={t('admin.content.filters.allStatus', { defaultValue: 'All Status' })}
                value={filters.is_published === undefined ? '' : filters.is_published ? 'published' : 'draft'}
                onChange={(value) =>
                  setFilters({
                    ...filters,
                    is_published: value === '' ? undefined : value === 'published',
                  })
                }
                options={[
                  { value: '', label: t('admin.content.filters.allStatus', { defaultValue: 'All Status' }) },
                  { value: 'published', label: t('admin.content.status.published', { defaultValue: 'Published' }) },
                  { value: 'draft', label: t('admin.content.status.draft', { defaultValue: 'Draft' }) },
                ]}
              />
            </View>

            {/* Subtitles Filter */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
                {t('admin.content.filters.subtitles', { defaultValue: 'Subtitles' })}
              </Text>
              <GlassCheckbox
                label={t('admin.content.showOnlyWithSubtitles', 'Show only with subtitles')}
                checked={showOnlyWithSubtitles}
                onChange={setShowOnlyWithSubtitles}
              />
            </View>
          </View>
        </View>
      </Pressable>
    )}
  </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  refreshButton: {
    minWidth: 44,
  },
  filtersContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  searchWrapper: {
    flex: 1,
    minWidth: 250,
  },
  filtersButtonWrapper: {
    position: 'relative',
    zIndex: 10000,
  },
  filtersButton: {
    minWidth: 120,
  },
  filtersOverlay: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  filtersDropdown: {
    position: 'fixed' as any,
    top: 120,
    minWidth: 320,
    maxWidth: 400,
    backgroundColor: colors.glass,
    // @ts-ignore - Web CSS
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    zIndex: 10001,
    // @ts-ignore - Web CSS
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
  },
  filtersDropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  filtersDropdownTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
    // @ts-ignore - Web CSS
    cursor: 'pointer',
  },
  filtersDropdownContent: {
    gap: spacing.lg,
  },
  filterSection: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: spacing.lg,
  },
  errorText: {
    flex: 1,
    color: colors.error,
    fontSize: 14,
  },
  batchActionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginBottom: spacing.lg,
  },
  batchActionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  batchSelectedText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  clearSelectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.xs,
  },
  clearSelectionText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  batchActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  batchButton: {
    minWidth: 100,
  },
});
