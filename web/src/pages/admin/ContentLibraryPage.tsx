import { useState, useMemo } from 'react'
import { View, StyleSheet, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { RefreshCw, Search, Filter, Merge } from 'lucide-react'
import MergeWizard from '@/components/admin/content/MergeWizard'
import { adminContentService } from '@/services/adminApi'
import {
  GlassInput,
  GlassButton,
  GlassPageHeader,
  GlassHierarchicalTable,
  GlassModal,
} from '@bayit/shared/ui'
import { ADMIN_PAGE_CONFIG } from '../../../../shared/utils/adminConstants'
import { useDirection } from '@/hooks/useDirection'
import { useContentData } from '@/hooks/admin/useContentData'
import ContentBatchActions from '@/components/admin/content/ContentBatchActions'
import ContentFiltersDropdown from '@/components/admin/content/ContentFiltersDropdown'
import { getContentTableColumns } from '@/components/admin/content/getContentTableColumns'
import logger from '@/utils/logger'
import { spacing } from '@olorin/design-tokens'

export default function ContentLibraryPage() {
  const { t } = useTranslation()
  const { isRTL } = useDirection()

  const {
    items,
    isLoading,
    error,
    pagination,
    filters,
    showOnlyWithSubtitles,
    selectedIds,
    selectedItemsData,
    isBatchProcessing,
    hierarchicalData,
    sortBy,
    sortDirection,
    showDeleteConfirm,
    setFilters,
    setShowOnlyWithSubtitles,
    setPagination,
    setSelectedItemsData,
    handleExpandToggle,
    handleSelectionChange,
    handleBatchMerge,
    handleBatchDelete,
    handleBatchFeature,
    handleSort,
    confirmBatchDelete,
    cancelBatchDelete,
    refresh,
    clearSelection,
  } = useContentData()

  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false)
  const [showMergeModal, setShowMergeModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null)

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setFilters({ ...filters, search: query })
  }

  const handleToggleFeatured = async (id: string) => {
    try {
      const updatedContent = await adminContentService.featureContent(id)
      refresh()
      logger.info('Content featured status toggled', { id, featured: updatedContent.is_featured })
    } catch (err) {
      logger.error('Failed to toggle featured', { error: err, id })
    }
  }

  const handleDeleteContent = (id: string) => {
    setDeleteItemId(id)
  }

  const confirmSingleDelete = async () => {
    if (!deleteItemId) return

    try {
      await adminContentService.deleteContent(deleteItemId)
      setDeleteItemId(null)
      refresh()
      logger.info('Content deleted', { id: deleteItemId })
    } catch (err) {
      logger.error('Failed to delete content', { error: err, id: deleteItemId })
      setDeleteItemId(null)
    }
  }

  const cancelSingleDelete = () => {
    setDeleteItemId(null)
  }

  const openMergeWizard = async () => {
    if (selectedIds.length < 2) return

    try {
      const itemDetails = await Promise.all(
        selectedIds.map(id => adminContentService.getContentById(id))
      )
      setSelectedItemsData(itemDetails)
      setShowMergeModal(true)
      logger.info('Merge wizard opened', { itemCount: itemDetails.length })
    } catch (err) {
      logger.error('Failed to load items for merge', { error: err })
    }
  }

  const columns = useMemo(
    () => getContentTableColumns(t, handleToggleFeatured, handleDeleteContent),
    [t]
  )

  const pageConfig = ADMIN_PAGE_CONFIG['content-library']
  const IconComponent = pageConfig.icon

  return (
    <>
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          {/* Page Header */}
          <GlassPageHeader
            title={t('admin.titles.content')}
            subtitle={t('admin.content.subtitle')}
            icon={<IconComponent size={24} color={pageConfig.iconColor} strokeWidth={2} />}
            iconColor={pageConfig.iconColor}
            iconBackgroundColor={pageConfig.iconBackgroundColor}
            badge={pagination.total}
            isRTL={isRTL}
            action={
              <GlassButton
                title=""
                onPress={refresh}
                variant="ghost"
                icon={<RefreshCw size={20} />}
                disabled={isLoading}
              />
            }
          />

          {/* Search and Filters */}
          <View style={[styles.filtersRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={styles.searchWrapper}>
              <GlassInput
                placeholder={t('admin.content.searchPlaceholder')}
                value={searchQuery}
                onChangeText={handleSearch}
                icon={<Search size={18} />}
              />
            </View>
            <GlassButton
              title={t('common.filters')}
              onPress={() => setShowFiltersDropdown(true)}
              variant={
                filters.content_type || filters.is_published !== undefined || showOnlyWithSubtitles
                  ? 'primary'
                  : 'secondary'
              }
              icon={<Filter size={16} />}
              badge={
                [
                  filters.content_type && filters.content_type !== '',
                  filters.is_published !== undefined,
                  showOnlyWithSubtitles,
                ].filter(Boolean).length || undefined
              }
            />
          </View>

          {/* Batch Actions */}
          {selectedIds.length > 0 && (
            <ContentBatchActions
              selectedIds={selectedIds}
              onClearSelection={clearSelection}
              onMerge={openMergeWizard}
              onBatchFeature={() => handleBatchFeature(true)}
              onBatchUnfeature={() => handleBatchFeature(false)}
              onBatchDelete={handleBatchDelete}
              isRTL={isRTL}
            />
          )}

          {/* Content Table */}
          <GlassHierarchicalTable
            columns={columns}
            rows={hierarchicalData}
            loading={isLoading}
            pagination={pagination}
            onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
            emptyMessage={t('admin.content.emptyMessage')}
            isRTL={isRTL}
            selectable
            selectedIds={selectedIds}
            onSelectionChange={handleSelectionChange}
            onExpandToggle={handleExpandToggle}
            expandable
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSort={handleSort}
          />

          {/* Merge Wizard */}
          {showMergeModal && (
            <MergeWizard
              visible={showMergeModal}
              selectedItems={selectedItemsData.filter(item => selectedIds.includes(item.id))}
              onClose={() => {
                setShowMergeModal(false)
                clearSelection()
              }}
              onConfirm={handleBatchMerge}
            />
          )}
        </View>
      </ScrollView>

      {/* Filters Dropdown Overlay */}
      <ContentFiltersDropdown
        visible={showFiltersDropdown}
        filters={filters}
        showOnlyWithSubtitles={showOnlyWithSubtitles}
        onFiltersChange={setFilters}
        onSubtitlesChange={setShowOnlyWithSubtitles}
        onClose={() => setShowFiltersDropdown(false)}
        isRTL={isRTL}
      />

      {/* Batch Delete Confirmation Modal */}
      <GlassModal
        visible={showDeleteConfirm}
        type="confirm"
        title={t('common.confirmDelete')}
        message={t('admin.content.confirmBatchDelete', { count: selectedIds.length })}
        buttons={[
          {
            text: t('common.cancel'),
            style: 'cancel',
            onPress: cancelBatchDelete,
          },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: confirmBatchDelete,
          },
        ]}
        onClose={cancelBatchDelete}
      />

      {/* Single Item Delete Confirmation Modal */}
      <GlassModal
        visible={!!deleteItemId}
        type="confirm"
        title={t('common.confirmDelete')}
        message={t('admin.content.confirmDeleteSingle')}
        buttons={[
          {
            text: t('common.cancel'),
            style: 'cancel',
            onPress: cancelSingleDelete,
          },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: confirmSingleDelete,
          },
        ]}
        onClose={cancelSingleDelete}
      />
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  searchWrapper: {
    flex: 1,
  },
})
