import { useState, useEffect, useCallback } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Search, X, AlertCircle, RefreshCw } from 'lucide-react'
import HierarchicalContentTable from '@/components/admin/HierarchicalContentTable'
import { adminContentService } from '@/services/adminApi'
import { GlassInput, GlassSelect, GlassButton } from '@bayit/shared/ui'
import { useDirection } from '@/hooks/useDirection'
import { useModal } from '@/contexts/ModalContext'
import logger from '@/utils/logger'
import { spacing } from '@bayit/shared/theme'

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
  const [filters, setFilters] = useState({
    search: '',
    is_published: undefined as boolean | undefined,
  })

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
      await adminContentService.publishContent(id)
      await loadContent()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update content'
      logger.error(msg, 'ContentLibraryPage', err)
      setError(msg)
    }
  }

  const handleToggleFeatured = async (id: string) => {
    try {
      await adminContentService.featureContent(id)
      await loadContent()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update content'
      logger.error(msg, 'ContentLibraryPage', err)
      setError(msg)
    }
  }

  return (
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

        {/* Hierarchical Content Table */}
        <HierarchicalContentTable
          items={items}
          loading={isLoading}
          onTogglePublish={handleTogglePublish}
          onToggleFeatured={handleToggleFeatured}
          onDelete={handleDeleteContent}
          pagination={pagination}
          onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
          emptyMessage={t('admin.content.emptyMessage', { defaultValue: 'No content found' })}
        />
      </View>
    </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    gap: spacing.lg,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
  },
  refreshButton: {
    minWidth: 44,
    alignSelf: 'flex-start',
  },
  filtersContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  searchWrapper: {
    flex: 1,
    maxWidth: 400,
  },
  filterWrapper: {
    minWidth: 180,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 16,
    // @ts-ignore - Web CSS
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
  } as any,
  errorText: {
    flex: 1,
    color: '#ef4444',
    fontSize: 14,
  },
})
