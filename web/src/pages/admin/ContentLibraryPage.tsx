import { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Download, Search, X, AlertCircle } from 'lucide-react'
import HierarchicalContentTable from '@/components/admin/HierarchicalContentTable'
import { contentService } from '@/services/adminApi'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { GlassButton, GlassInput, GlassSelect } from '@bayit/shared/ui'
import { useDirection } from '@/hooks/useDirection'
import { useModal } from '@/contexts/ModalContext'
import logger from '@/utils/logger'
import { FreeContentImportWizard } from '@/components/admin/FreeContentImportWizard'

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
  const [showImportWizard, setShowImportWizard] = useState(false)
  const [filters, setFilters] = useState({
    search: '',
    is_published: undefined as boolean | undefined,
  })

  const loadContent = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Use hierarchical endpoint - returns only parent items (series/movies) with episode counts
      const response = await contentService.getContentHierarchical({
        page: pagination.page,
        page_size: pagination.pageSize,
        search: filters.search || undefined,
        is_published: filters.is_published,
      })
      setItems(response.items || [])
      setPagination((prev) => ({ ...prev, total: response.total || 0 }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load content'
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
          await contentService.deleteContent(id)
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
      await contentService.publishContent(id)
      await loadContent()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update content'
      logger.error(msg, 'ContentLibraryPage', err)
      setError(msg)
    }
  }

  const handleToggleFeatured = async (id: string) => {
    try {
      await contentService.featureContent(id)
      await loadContent()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update content'
      logger.error(msg, 'ContentLibraryPage', err)
      setError(msg)
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={[styles.header, { flexDirection }]}>
        <View>
          <Text style={[styles.pageTitle, { textAlign }]}>{t('admin.titles.content', { defaultValue: 'Content Library' })}</Text>
          <Text style={[styles.subtitle, { textAlign }]}>
            {t('admin.content.subtitle', { defaultValue: 'Manage movies, series, and other video content' })}
          </Text>
        </View>
        <View style={[styles.actionButtons, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <GlassButton
            title={t('admin.content.importFree', { defaultValue: 'Import Free Content' })}
            variant="secondary"
            icon={<Download size={18} color={colors.text} />}
            onPress={() => setShowImportWizard(true)}
          />
          <Link to="/admin/content/new" style={{ textDecoration: 'none' }}>
            <GlassButton
              title={t('admin.actions.new', { defaultValue: 'Add Content' })}
              variant="primary"
              icon={<Plus size={18} color={colors.text} />}
            />
          </Link>
        </View>
      </View>

      {/* Search and Filters */}
      <View style={[styles.filtersContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={styles.searchWrapper}>
          <GlassInput
            placeholder={t('admin.content.searchPlaceholder', { defaultValue: 'Search content...' })}
            value={searchQuery}
            onChangeText={handleSearch}
            icon={<Search size={18} color={colors.textMuted} />}
            containerStyle={styles.searchInputContainer}
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

      {/* Import Wizard Modal */}
      <FreeContentImportWizard
        isOpen={showImportWizard}
        onClose={() => setShowImportWizard(false)}
        onSuccess={() => loadContent()}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
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
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  filtersContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
    alignItems: 'flex-start',
  },
  searchWrapper: {
    flex: 1,
    maxWidth: 400,
  },
  searchInputContainer: {
    marginBottom: 0,
  },
  filterWrapper: {
    minWidth: 180,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: '#ef444420',
    borderWidth: 1,
    borderColor: '#ef444440',
    marginBottom: spacing.lg,
  },
  errorText: {
    flex: 1,
    color: '#ef4444',
    fontSize: 14,
  },
})
