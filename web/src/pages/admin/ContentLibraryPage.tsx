import { useState, useEffect, useCallback } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Download, Search, X, AlertCircle } from 'lucide-react'
import HierarchicalContentTable from '@/components/admin/HierarchicalContentTable'
import { adminContentService } from '@/services/adminApi'
import { GlassButton, GlassInput, GlassSelect, GlassCard } from '@bayit/shared/ui'
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
      const response = await adminContentService.getContentHierarchical({
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
    <ScrollView className="flex-1">
      <View className="p-6">
        {/* Header */}
        <View className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center justify-between mb-6 gap-6`}>
          <View>
            <Text className={`text-2xl font-bold text-white ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('admin.titles.content', { defaultValue: 'Content Library' })}
            </Text>
            <Text className={`text-sm text-white/60 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('admin.content.subtitle', { defaultValue: 'Manage movies, series, and video content' })}
            </Text>
          </View>
          <View className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} gap-3 items-center`}>
            <GlassButton
              title={t('admin.content.importFree', { defaultValue: 'Import Free Content' })}
              variant="secondary"
              icon={<Download size={18} color="white" />}
              onPress={() => setShowImportWizard(true)}
              className="bg-white/10 backdrop-blur-xl hover:bg-white/20"
            />
            <Link to="/admin/content/new" style={{ textDecoration: 'none' }}>
              <GlassButton
                title={t('admin.actions.new', { defaultValue: 'New' })}
                variant="primary"
                icon={<Plus size={18} color="white" />}
                className="bg-purple-600/80 backdrop-blur-xl hover:bg-purple-600/90"
              />
            </Link>
          </View>
        </View>

        {/* Search and Filters */}
        <View className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} gap-4 mb-6`}>
          <View className="flex-1 max-w-md">
            <GlassInput
              placeholder={t('admin.content.searchPlaceholder', { defaultValue: 'Search content...' })}
              value={searchQuery}
              onChangeText={handleSearch}
              icon={<Search size={18} color="rgba(255,255,255,0.6)" />}
              className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-xl"
            />
          </View>
          <View className="min-w-[180px]">
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
              className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-xl"
            />
          </View>
        </View>

        {/* Error Message */}
        {error && (
          <View className="flex flex-row items-center gap-4 p-4 mb-6 bg-red-500/20 backdrop-blur-xl border border-red-500/40 rounded-2xl">
            <AlertCircle size={18} color="#ef4444" />
            <Text className="flex-1 text-red-500 text-sm">{error}</Text>
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
      </View>
    </ScrollView>
  )
}
