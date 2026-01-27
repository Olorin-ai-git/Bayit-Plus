/**
 * useAudiobooksList Hook
 * Manages pagination, filtering, and loading for audiobooks list
 */

import { useState, useCallback, useEffect } from 'react'
import logger from '@/utils/logger'
import audiobookService from '@/services/audiobookService'
import type { Audiobook, AudiobookFilters } from '@/types/audiobook'

interface UseAudiobooksListState {
  audiobooks: Audiobook[]
  loading: boolean
  error: string | null
  page: number
  pageSize: number
  total: number
  hasMore: boolean
}

interface UseAudiobooksListReturn extends UseAudiobooksListState {
  loadMore: () => Promise<void>
  refresh: () => Promise<void>
  setFilters: (filters: AudiobookFilters) => void
  retry: () => Promise<void>
}

export function useAudiobooksList(initialFilters?: AudiobookFilters): UseAudiobooksListReturn {
  const [audiobooks, setAudiobooks] = useState<Audiobook[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [filters, setCurrentFilters] = useState<AudiobookFilters>(initialFilters || { page: 1, page_size: 20 })

  const hasMore = (page * pageSize) < total

  const fetchAudiobooks = useCallback(async (pageNum: number, isRefresh: boolean) => {
    try {
      setError(null)
      const response = await audiobookService.getAudiobooks({ ...filters, page: pageNum, page_size: pageSize })
      if (isRefresh) {
        setAudiobooks(response.items || [])
        setPage(1)
      } else {
        setAudiobooks(prev => [...prev, ...(response.items || [])])
        setPage(pageNum)
      }
      setTotal(response.total || 0)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load audiobooks'
      logger.error(msg, 'useAudiobooksList', err)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [filters, pageSize])

  useEffect(() => {
    setLoading(true)
    fetchAudiobooks(1, true)
  }, [filters])

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return
    await fetchAudiobooks(page + 1, false)
  }, [page, hasMore, loading, fetchAudiobooks])

  const refresh = useCallback(async () => {
    setLoading(true)
    await audiobookService.clearCache()
    await fetchAudiobooks(1, true)
  }, [fetchAudiobooks])

  const setFilters = useCallback((newFilters: AudiobookFilters) => {
    setCurrentFilters(newFilters)
    setPage(1)
    setAudiobooks([])
  }, [])

  const retry = useCallback(async () => {
    setLoading(true)
    await fetchAudiobooks(1, true)
  }, [fetchAudiobooks])

  return {
    audiobooks,
    loading,
    error,
    page,
    pageSize,
    total,
    hasMore,
    loadMore,
    refresh,
    setFilters,
    retry,
  }
}
