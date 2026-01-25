import { useState, useCallback, useEffect, useMemo } from 'react'
import { adminContentService, adminPodcastsService, adminRadioStationsService } from '@/services/adminApi'
import { useNotifications } from '@olorin/glass-ui/hooks'
import { useTranslation } from 'react-i18next'
import logger from '@/utils/logger'
import type { HierarchicalTableRow } from '@bayit/shared/ui'

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
  review_issue_type?: string
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
  content_type: 'all' | 'series' | 'movies' | 'podcasts' | 'radio' | ''
}

export function useContentData() {
  const { t } = useTranslation()
  const notifications = useNotifications()

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

  // Episode caching for hierarchical display
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set())
  const [episodeCache, setEpisodeCache] = useState<Record<string, Episode[]>>({})
  const [loadingEpisodes, setLoadingEpisodes] = useState<Set<string>>(new Set())

  // Selection state for batch operations
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectedItemsData, setSelectedItemsData] = useState<ContentItem[]>([])
  const [isBatchProcessing, setIsBatchProcessing] = useState(false)

  const loadContent = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      if (filters.content_type === 'podcasts' || filters.content_type === 'radio') {
        const fetchFn = filters.content_type === 'podcasts'
          ? adminPodcastsService.getPodcasts
          : adminRadioStationsService.getAll

        const response = await fetchFn({
          page: pagination.page,
          page_size: pagination.pageSize,
          search: filters.search,
        })

        setItems(response.items)
        setPagination(prev => ({ ...prev, total: response.total }))
      } else {
        const response = await adminContentService.getContent({
          page: pagination.page,
          pageSize: pagination.pageSize,
          search: filters.search,
          is_published: filters.is_published,
          content_type: filters.content_type === 'series' ? 'series'
                        : filters.content_type === 'movies' ? 'movies'
                        : undefined,
        })

        setItems(response.items)
        setPagination(prev => ({ ...prev, total: response.total }))
      }

      logger.info('Content loaded successfully', {
        itemCount: items.length,
        total: pagination.total,
        filters
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load content'
      setError(errorMessage)
      logger.error('Failed to load content', { error: err, filters })
    } finally {
      setIsLoading(false)
    }
  }, [pagination.page, pagination.pageSize, filters])

  useEffect(() => {
    loadContent()
  }, [loadContent])

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
          logger.info('Episodes loaded', { seriesId: rowId, count: response.episodes.length })
        } catch (err) {
          logger.error('Failed to load episodes', { error: err, seriesId: rowId })
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
    logger.debug('Selection changed', { count: ids.length })
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
      logger.error('Merge failed', { error: err })
      setError(msg)
    } finally {
      setIsBatchProcessing(false)
    }
  }

  const handleBatchDelete = useCallback(() => {
    if (selectedIds.length === 0) return

    notifications.show({
      level: 'warning',
      message: t('admin.content.confirmBatchDelete', { count: selectedIds.length }),
      dismissable: true,
      action: {
        label: t('common.delete'),
        type: 'action',
        onPress: async () => {
          setIsBatchProcessing(true)
          try {
            await adminContentService.batchDeleteContent(selectedIds)
            setSelectedIds([])
            setSelectedItemsData([])
            await loadContent()
            logger.info('Batch delete successful', { count: selectedIds.length })
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to delete content'
            logger.error('Batch delete failed', { error: err })
            setError(msg)
          } finally {
            setIsBatchProcessing(false)
          }
        },
      },
    })
  }, [selectedIds, notifications, t, loadContent])

  const handleBatchFeature = useCallback(async (featured: boolean) => {
    if (selectedIds.length === 0) return

    setIsBatchProcessing(true)
    try {
      await adminContentService.batchFeatureContent(selectedIds, featured)
      setSelectedIds([])
      setSelectedItemsData([])
      await loadContent()
      logger.info('Batch feature update successful', { featured, count: selectedIds.length })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update content'
      logger.error('Batch feature failed', { error: err })
      setError(msg)
    } finally {
      setIsBatchProcessing(false)
    }
  }, [selectedIds, loadContent])

  // Transform data to hierarchical table format
  const hierarchicalData = useMemo<HierarchicalTableRow<ContentItem | Episode>[]>(() => {
    const filtered = showOnlyWithSubtitles
      ? items.filter(item => item.available_subtitles && item.available_subtitles.length > 0)
      : items

    return filtered.map(item => {
      let children: HierarchicalTableRow<Episode>[] | undefined = undefined

      if (item.is_series) {
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
  }, [items, showOnlyWithSubtitles, expandedSeries, episodeCache])

  return {
    items,
    isLoading,
    error,
    pagination,
    filters,
    showOnlyWithSubtitles,
    expandedSeries,
    episodeCache,
    loadingEpisodes,
    selectedIds,
    selectedItemsData,
    isBatchProcessing,
    hierarchicalData,
    setFilters,
    setShowOnlyWithSubtitles,
    setPagination,
    setSelectedItemsData,
    handleExpandToggle,
    handleSelectionChange,
    handleBatchMerge,
    handleBatchDelete,
    handleBatchFeature,
    refresh: loadContent,
    clearSelection: () => {
      setSelectedIds([])
      setSelectedItemsData([])
    },
  }
}
