import { useState, useMemo, useCallback } from 'react'
import { View, StyleSheet, ScrollView, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { RefreshCw, Search, Filter, Merge } from 'lucide-react'
import MergeWizard from '@/components/admin/content/MergeWizard'
import HebrewModePickerModal from '@/components/player/subtitle/HebrewModePickerModal'
import EnglishModePickerModal from '@/components/player/subtitle/EnglishModePickerModal'
import { adminContentService } from '@/services/adminApi'
import { subtitlesService } from '@/services/api'
import type { HebrewMode, EnglishMode } from '@/types/subtitle'
import { colors, fontSize } from '@olorin/design-tokens'
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
    showOnlyBetaContent,
    selectedIds,
    selectedItemsData,
    isBatchProcessing,
    hierarchicalData,
    sortBy,
    sortDirection,
    showDeleteConfirm,
    setFilters,
    setShowOnlyWithSubtitles,
    setShowOnlyBetaContent,
    setPagination,
    setSelectedItemsData,
    handleExpandToggle,
    handleSelectionChange,
    handleBatchMerge,
    handleBatchDelete,
    handleBatchFeature,
    handleBatchBeta,
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
  const [subtitleAIContent, setSubtitleAIContent] = useState<{
    id: string
    title: string
    isLoading: boolean
    hasHebrew: boolean
    hasNikud: boolean
    hasShoresh: boolean
    hasEnglish: boolean
    hasHeblish: boolean
  } | null>(null)
  const [subtitleAITab, setSubtitleAITab] = useState<'hebrew' | 'english'>('hebrew')

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

  const handleToggleBeta = async (id: string) => {
    try {
      const updatedContent = await adminContentService.toggleBetaContent(id)
      refresh()
      logger.info('Content beta status toggled', { id, beta: updatedContent.is_beta_content })
    } catch (err) {
      logger.error('Failed to toggle beta', { error: err, id })
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

  const handleSubtitleAI = useCallback((id: string, title: string) => {
    logger.info('Opening Subtitle AI modal', 'ContentLibraryPage', { id, title })

    // Open modal immediately with loading state
    setSubtitleAIContent({
      id,
      title,
      isLoading: true,
      hasHebrew: false,
      hasNikud: false,
      hasShoresh: false,
      hasEnglish: false,
      hasHeblish: false,
    })

    // Fetch subtitle tracks in background
    subtitlesService.getTracks(id)
      .then(response => {
        const hebrewTrack = response.tracks.find((track: { language: string }) => track.language === 'he')
        const englishTrack = response.tracks.find((track: { language: string }) => track.language === 'en')
        setSubtitleAIContent(prev => prev?.id === id ? {
          ...prev,
          isLoading: false,
          hasHebrew: !!hebrewTrack,
          hasNikud: hebrewTrack?.has_nikud_version || false,
          hasShoresh: hebrewTrack?.has_shoresh_version || false,
          hasEnglish: !!englishTrack,
          hasHeblish: englishTrack?.has_heblish_version || false,
        } : prev)
        // Auto-select tab based on available tracks
        if (!hebrewTrack && englishTrack) {
          setSubtitleAITab('english')
        } else {
          setSubtitleAITab('hebrew')
        }
      })
      .catch(err => {
        logger.error('Failed to fetch subtitle tracks', 'ContentLibraryPage', { id, error: err })
        setSubtitleAIContent(prev => prev?.id === id ? {
          ...prev,
          isLoading: false,
          hasHebrew: false,
          hasNikud: false,
          hasShoresh: false,
          hasEnglish: false,
          hasHeblish: false,
        } : prev)
      })
  }, [])

  const columns = useMemo(
    () => getContentTableColumns(t, handleToggleFeatured, handleDeleteContent, handleSubtitleAI, handleToggleBeta),
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
                filters.content_type || filters.is_published !== undefined || showOnlyWithSubtitles || showOnlyBetaContent
                  ? 'primary'
                  : 'secondary'
              }
              icon={<Filter size={16} />}
              badge={
                [
                  filters.content_type && filters.content_type !== '',
                  filters.is_published !== undefined,
                  showOnlyWithSubtitles,
                  showOnlyBetaContent,
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
              onBatchBeta={() => handleBatchBeta(true)}
              onBatchUnbeta={() => handleBatchBeta(false)}
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
        showOnlyBetaContent={showOnlyBetaContent}
        onFiltersChange={setFilters}
        onSubtitlesChange={setShowOnlyWithSubtitles}
        onBetaContentChange={setShowOnlyBetaContent}
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

      {/* Subtitle AI Modal - Hebrew Mode */}
      {subtitleAIContent && subtitleAITab === 'hebrew' && (
        <HebrewModePickerModal
          visible={!!subtitleAIContent}
          currentMode="regular"
          isLoading={subtitleAIContent.isLoading}
          hasHebrew={subtitleAIContent.hasHebrew}
          hasNikud={subtitleAIContent.hasNikud}
          hasShoresh={subtitleAIContent.hasShoresh}
          contentId={subtitleAIContent.id}
          onClose={() => setSubtitleAIContent(null)}
          onModeSelect={() => {
            // Mode selection is not used in admin context
          }}
          onGenerationComplete={async () => {
            logger.info('Hebrew AI features generated', 'ContentLibraryPage', { contentId: subtitleAIContent.id })
            // Refresh subtitle track info
            try {
              const response = await subtitlesService.getTracks(subtitleAIContent.id)
              const hebrewTrack = response.tracks.find((track: { language: string }) => track.language === 'he')
              const englishTrack = response.tracks.find((track: { language: string }) => track.language === 'en')
              setSubtitleAIContent(prev => prev ? {
                ...prev,
                isLoading: false,
                hasHebrew: !!hebrewTrack,
                hasNikud: hebrewTrack?.has_nikud_version || false,
                hasShoresh: hebrewTrack?.has_shoresh_version || false,
                hasEnglish: !!englishTrack,
                hasHeblish: englishTrack?.has_heblish_version || false,
              } : null)
            } catch (err) {
              logger.error('Failed to refresh subtitle tracks', 'ContentLibraryPage', { error: err })
            }
          }}
          adminTabSwitcher={
            <View style={styles.tabContainer}>
              <Pressable
                style={[styles.tab, styles.tabActive]}
                onPress={() => {}}
              >
                <Text style={[styles.tabText, styles.tabTextActive]}>
                  {t('subtitles.hebrewMode.title', 'Hebrew')}
                </Text>
              </Pressable>
              <Pressable
                style={styles.tab}
                onPress={() => setSubtitleAITab('english')}
              >
                <Text style={styles.tabText}>
                  {t('subtitles.englishMode.title', 'English')}
                </Text>
              </Pressable>
            </View>
          }
        />
      )}

      {/* Subtitle AI Modal - English Mode */}
      {subtitleAIContent && subtitleAITab === 'english' && (
        <EnglishModePickerModal
          visible={!!subtitleAIContent}
          currentMode="regular"
          isLoading={subtitleAIContent.isLoading}
          hasEnglish={subtitleAIContent.hasEnglish}
          hasHeblish={subtitleAIContent.hasHeblish}
          contentId={subtitleAIContent.id}
          onClose={() => setSubtitleAIContent(null)}
          onModeSelect={() => {
            // Mode selection is not used in admin context
          }}
          onGenerationComplete={async () => {
            logger.info('English AI features generated', 'ContentLibraryPage', { contentId: subtitleAIContent.id })
            // Refresh subtitle track info
            try {
              const response = await subtitlesService.getTracks(subtitleAIContent.id)
              const hebrewTrack = response.tracks.find((track: { language: string }) => track.language === 'he')
              const englishTrack = response.tracks.find((track: { language: string }) => track.language === 'en')
              setSubtitleAIContent(prev => prev ? {
                ...prev,
                isLoading: false,
                hasHebrew: !!hebrewTrack,
                hasNikud: hebrewTrack?.has_nikud_version || false,
                hasShoresh: hebrewTrack?.has_shoresh_version || false,
                hasEnglish: !!englishTrack,
                hasHeblish: englishTrack?.has_heblish_version || false,
              } : null)
            } catch (err) {
              logger.error('Failed to refresh subtitle tracks', 'ContentLibraryPage', { error: err })
            }
          }}
          adminTabSwitcher={
            <View style={styles.tabContainer}>
              <Pressable
                style={styles.tab}
                onPress={() => setSubtitleAITab('hebrew')}
              >
                <Text style={styles.tabText}>
                  {t('subtitles.hebrewMode.title', 'Hebrew')}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.tab, styles.tabActive]}
                onPress={() => {}}
              >
                <Text style={[styles.tabText, styles.tabTextActive]}>
                  {t('subtitles.englishMode.title', 'English')}
                </Text>
              </Pressable>
            </View>
          }
        />
      )}
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
  tabContainer: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  tab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary.DEFAULT,
  },
  tabText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary.DEFAULT,
    fontWeight: '600',
  },
})
