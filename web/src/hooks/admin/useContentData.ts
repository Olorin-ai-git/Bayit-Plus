import { useState, useCallback, useEffect, useMemo } from 'react'
import { adminContentService, adminPodcastsService, adminRadioStationsService } from '@/services/adminApi'
import { adminAudiobookService } from '@/services/adminAudiobookService'
import { useNotifications } from '@olorin/glass-ui/hooks'
import { useTranslation } from 'react-i18next'
import logger from '@/utils/logger'
import type { HierarchicalTableRow } from '@bayit/shared/ui'
import { isSeriesContent } from '@/utils/contentHelpers'

interface ContentItem {
  id: string
  title: string
  description?: string
  thumbnail?: string
  category_name?: string
  year?: number
  /** @deprecated Use isSeriesContent() helper instead */
  is_series?: boolean
  is_published: boolean
  is_featured: boolean
  is_beta_content?: boolean
  episode_count?: number
  view_count?: number
  avg_rating?: number
  available_subtitles?: string[]
  review_issue_type?: string
  content_type?: 'movie' | 'series' | 'podcast' | 'radio' | 'audiobook'
  author?: string  // For audiobooks
  narrator?: string  // For audiobooks
}

interface Episode {
  id: string
  title: string
  thumbnail?: string
  duration?: string
  season?: number
  episode?: number
  is_published: boolean
  is_featured: boolean
  view_count?: number
}

interface Filters {
  search: string
  is_published?: boolean
  content_type: 'all' | 'series' | 'movies' | 'podcasts' | 'radio' | 'audiobooks' | ''
}

export function useContentData() {
  const { t } = useTranslation()
  const notifications = useNotifications()
  const log = logger.scope('ContentData')

  const [items, setItems] = useState<ContentItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 })
  const [filters, setFilters] = useState<Filters>({
    search: '',
    is_published: undefined,
    content_type: '',
  })
  const [showOnlyWithSubtitles, setShowOnlyWithSubtitles] = useState(false)
  const [showOnlyBetaContent, setShowOnlyBetaContent] = useState(false)
  const [sortBy, setSortBy] = useState<string>('title')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // Episode caching for hierarchical display
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set())
  const [episodeCache, setEpisodeCache] = useState<Record<string, Episode[]>>({})
  const [loadingEpisodes, setLoadingEpisodes] = useState<Set<string>>(new Set())

  // Selection state for batch operations
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectedItemsData, setSelectedItemsData] = useState<ContentItem[]>([])
  const [isBatchProcessing, setIsBatchProcessing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const loadContent = useCallback(async () => {
    log.debug('Loading content with filters', filters)
    setIsLoading(true)
    setError(null)
    try {
      if (filters.content_type === 'podcasts' || filters.content_type === 'radio' || filters.content_type === 'audiobooks') {
        log.debug('Loading podcasts/radio/audiobooks content')

        let response
        if (filters.content_type === 'audiobooks') {
          response = await adminAudiobookService.getAudiobooksList({
            page: pagination.page,
            page_size: pagination.pageSize,
            search_query: filters.search,
            is_published: filters.is_published,
          } as any)
        } else {
          const fetchFn = filters.content_type === 'podcasts'
            ? adminPodcastsService.getPodcasts
            : adminRadioStationsService.getAll

          response = await fetchFn({
            page: pagination.page,
            page_size: pagination.pageSize,
            search: filters.search,
          })
        }

        log.debug('Podcasts/Radio/Audiobooks loaded', { count: response.items.length })

        // Add content_type to each item for proper labeling
        const itemsWithType = response.items.map(item => ({
          ...item,
          content_type: filters.content_type === 'podcasts' ? 'podcast'
                        : filters.content_type === 'radio' ? 'radio'
                        : 'audiobook'
        }))

        setItems(itemsWithType)
        setPagination(prev => ({ ...prev, total: response.total }))
      } else {
        const apiFilters = {
          page: pagination.page,
          page_size: pagination.pageSize,
          search: filters.search,
          is_published: filters.is_published,
          is_beta_content: showOnlyBetaContent ? true : undefined,
          content_type: filters.content_type === 'series' ? 'series'
                        : filters.content_type === 'movies' ? 'movies'
                        : undefined,
          sort_by: sortBy,
          sort_direction: sortDirection,
        }
        log.debug('Loading VOD content with API filters', apiFilters)

        const response = await adminContentService.getContentHierarchical(apiFilters)

        log.debug('VOD content loaded', {
          count: response.items.length,
          total: response.total,
          firstItems: response.items.slice(0, 3).map(item => ({ id: item.id, title: item.title })),
          response
        })

        // Add content_type to each item for proper labeling
        const itemsWithType = response.items.map(item => ({
          ...item,
          content_type: isSeriesContent(item as any) ? 'series' : 'movie'
        }))

        setItems(itemsWithType as any)
        setPagination(prev => ({ ...prev, total: response.total }))

        log.debug('State updated', { itemsLength: response.items.length })
      }

      log.info('Content loaded successfully', {
        itemCount: items.length,
        total: pagination.total,
        filters
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load content'
      setError(errorMessage)
      log.error('Failed to load content', err)
    } finally {
      setIsLoading(false)
    }
  }, [pagination.page, pagination.pageSize, filters, showOnlyBetaContent, sortBy, sortDirection])

  useEffect(() => {
    log.debug('Filters or pagination changed, reloading content')
    loadContent()
  }, [loadContent])

  // Debug: Log when filters change
  useEffect(() => {
    log.debug('Filters state updated', filters)
  }, [filters])

  // Debug: Log when showOnlyWithSubtitles changes
  useEffect(() => {
    log.debug('showOnlyWithSubtitles changed', { showOnlyWithSubtitles })
  }, [showOnlyWithSubtitles])

  const handleExpandToggle = useCallback(async (rowId: string, expanded: boolean) => {
    const newExpanded = new Set(expandedSeries)

    if (!expanded) {
      newExpanded.delete(rowId)
      setExpandedSeries(newExpanded)
    } else {
      newExpanded.add(rowId)
      setExpandedSeries(newExpanded)

      if (!episodeCache[rowId]) {
        try {
          setLoadingEpisodes(prev => new Set(prev).add(rowId))
          const response = await adminContentService.getSeriesEpisodes(rowId)
          setEpisodeCache(prev => ({
            ...prev,
            [rowId]: response.episodes || [],
          }))
          log.info('Episodes loaded', { seriesId: rowId, count: response.episodes.length })
        } catch (err) {
          log.error('Failed to load episodes', err)
        } finally {
          setLoadingEpisodes(prev => {
            const next = new Set(prev)
            next.delete(rowId)
            return next
          })
        }
      }
    }
  }, [expandedSeries, episodeCache])

  const handleSelectionChange = useCallback((ids: string[]) => {
    setSelectedIds(ids)
    log.debug('Selection changed', { count: ids.length })
  }, [])

  const handleBatchMerge = async (baseId: string, mergeIds: string[], mergeConfig: any) => {
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
        const baseItem = selectedItemsData.find(item => item.id === baseId)
        notifications.showSuccess(
          t('admin.content.merge.mergeSuccess'),
          t('admin.content.merge.successMessage', {
            count: result.items_merged,
            title: baseItem?.title || 'Unknown',
          })
        )

        setSelectedIds([])
        setSelectedItemsData([])
        await loadContent()
      } else {
        setError(result.errors.join(', ') || 'Merge failed')
      }
    } catch (err: any) {
      const msg = err?.detail || err?.message || 'Failed to merge content'
      log.error('Merge failed', err)
      setError(msg)
    } finally {
      setIsBatchProcessing(false)
    }
  }

  const handleBatchDelete = useCallback(() => {
    if (selectedIds.length === 0) return
    setShowDeleteConfirm(true)
  }, [selectedIds])

  const confirmBatchDelete = useCallback(async () => {
    setShowDeleteConfirm(false)
    setIsBatchProcessing(true)
    try {
      const result = await adminContentService.batchDeleteContent(selectedIds)

      // Handle partial success or complete failure
      if (result.errors && result.errors.length > 0) {
        if (result.deleted_count > 0) {
          // Partial success
          notifications.showWarning(
            t('common.partialSuccess'),
            t('admin.content.batchDeletePartial', {
              success: result.deleted_count,
              failed: result.errors.length
            })
          )
          log.warn('Batch delete partially succeeded', {
            deleted: result.deleted_count,
            errors: result.errors
          })
        } else {
          // Complete failure
          notifications.showError(
            t('common.error'),
            result.errors.join(', ')
          )
          log.error('Batch delete failed', { errors: result.errors })
        }
      } else {
        // Complete success
        notifications.showSuccess(
          t('common.success'),
          t('admin.content.batchDeleteSuccess', { count: result.deleted_count })
        )
        log.info('Batch delete successful', { count: result.deleted_count })
      }

      setSelectedIds([])
      setSelectedItemsData([])
      await loadContent()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete content'
      log.error('Batch delete request failed', err)
      notifications.showError(t('common.error'), msg)
    } finally {
      setIsBatchProcessing(false)
    }
  }, [selectedIds, notifications, t, loadContent])

  const cancelBatchDelete = useCallback(() => {
    setShowDeleteConfirm(false)
  }, [])

  const handleBatchFeature = useCallback(async (featured: boolean) => {
    if (selectedIds.length === 0) return

    setIsBatchProcessing(true)
    try {
      await adminContentService.batchFeatureContent(selectedIds, featured)
      setSelectedIds([])
      setSelectedItemsData([])
      await loadContent()
      log.info('Batch feature update successful', { featured, count: selectedIds.length })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update content'
      log.error('Batch feature failed', err)
      setError(msg)
    } finally {
      setIsBatchProcessing(false)
    }
  }, [selectedIds, loadContent])

  const handleBatchBeta = useCallback(async (beta: boolean) => {
    if (selectedIds.length === 0) return

    setIsBatchProcessing(true)
    try {
      await adminContentService.batchBetaContent(selectedIds, beta)
      setSelectedIds([])
      setSelectedItemsData([])
      await loadContent()
      log.info('Batch beta update successful', { beta, count: selectedIds.length })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update content'
      log.error('Batch beta failed', err)
      setError(msg)
    } finally {
      setIsBatchProcessing(false)
    }
  }, [selectedIds, loadContent])

  const handleSort = useCallback((columnKey: string, direction: 'asc' | 'desc') => {
    log.debug('Sort changed', { columnKey, direction })
    setSortBy(columnKey)
    setSortDirection(direction)
    // Reset to first page when sorting changes
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [])

  // Transform data to hierarchical table format
  const hierarchicalData = useMemo<HierarchicalTableRow[]>(() => {
    log.debug('hierarchicalData memo running', { itemsLength: items.length })

    const filtered = showOnlyWithSubtitles
      ? items.filter(item => item.available_subtitles && item.available_subtitles.length > 0)
      : items

    log.debug('After subtitle filter', {
      filteredLength: filtered.length,
      itemTitles: filtered.slice(0, 5).map(item => item.title)
    })

    const result = filtered.map(item => {
      let children: HierarchicalTableRow[] | undefined = undefined

      if (isSeriesContent(item)) {
        if (expandedSeries.has(item.id)) {
          children = (episodeCache[item.id] || []).map(episode => ({
            id: episode.id,
            data: episode,
          }))
        } else {
          children = [] // Empty array shows chevron
        }
      }

      return {
        id: item.id,
        data: item,
        children,
        isExpanded: expandedSeries.has(item.id),
      }
    })

    log.debug('hierarchicalData created', { rowCount: result.length })
    return result
  }, [items, showOnlyWithSubtitles, expandedSeries, episodeCache])

  return {
    items,
    isLoading,
    error,
    pagination,
    filters,
    showOnlyWithSubtitles,
    showOnlyBetaContent,
    expandedSeries,
    episodeCache,
    loadingEpisodes,
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
    refresh: loadContent,
    clearSelection: () => {
      setSelectedIds([])
      setSelectedItemsData([])
    },
  }
}
