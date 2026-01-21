import { useState, useEffect, useCallback } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next'
import { Search, X, AlertCircle, RefreshCw, Trash2, Star, StarOff } from 'lucide-react'
import HierarchicalContentTable from '@/components/admin/HierarchicalContentTable'
import { adminContentService } from '@/services/adminApi'
import { GlassInput, GlassSelect, GlassButton, GlassCheckbox } from '@bayit/shared/ui'
import { useDirection } from '@/hooks/useDirection'
import { useModal } from '@/contexts/ModalContext'
import logger from '@/utils/logger'
import { spacing, borderRadius } from '@bayit/shared/theme'

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
  const { showConfirm } = useModal()
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
  const [isBatchProcessing, setIsBatchProcessing] = useState(false)

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
      await loadContent()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update content'
      logger.error(msg, 'ContentLibraryPage', err)
      setError(msg)
    } finally {
      setIsBatchProcessing(false)
    }
  }

  const handleClearSelection = () => {
    setSelectedIds([])
  }

  return (
    <ScrollView className="flex-1">
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
          <View style={styles.filterWrapper}>
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
          <View style={styles.checkboxWrapper}>
            <GlassCheckbox
              label={t('admin.content.showOnlyWithSubtitles', 'Show only with subtitles')}
              checked={showOnlyWithSubtitles}
              onChange={setShowOnlyWithSubtitles}
            />
          </View>
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <AlertCircle size={18} color="#ef4444" />
            <Text className="flex-1 text-red-500 text-sm">{error}</Text>
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
          onSelectionChange={setSelectedIds}
        />
      </View>
    </ScrollView>
  )
}

