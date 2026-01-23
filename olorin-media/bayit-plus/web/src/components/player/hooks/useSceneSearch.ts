/**
 * Custom hook for scene search within video content
 *
 * Enables searching for specific scenes/moments within a video or series
 * using natural language queries. Returns timestamped results for deep-linking.
 */

import { useState, useCallback, useRef } from 'react'
import { sceneSearchService } from '@/services/api'
import logger from '@/utils/logger'

export interface SceneSearchResult {
  content_id: string
  title: string
  title_en?: string
  episode_info?: string
  thumbnail_url?: string
  matched_text: string
  context_text?: string
  relevance_score: number
  timestamp_seconds: number
  timestamp_formatted: string
  deep_link: string
}

interface UseSceneSearchOptions {
  contentId?: string
  seriesId?: string
  language?: string
}

interface SearchMetrics {
  startTime: number
  endTime: number
  resultCount: number
}

export function useSceneSearch({
  contentId,
  seriesId,
  language = 'he',
}: UseSceneSearchOptions) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SceneSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const metricsRef = useRef<SearchMetrics>({ startTime: 0, endTime: 0, resultCount: 0 })

  const search = useCallback(
    async (searchQuery?: string) => {
      const queryToSearch = searchQuery ?? query
      if (!queryToSearch.trim() || queryToSearch.length < 2) {
        setError(null)
        setResults([])
        return
      }

      setLoading(true)
      setError(null)
      metricsRef.current.startTime = performance.now()

      try {
        const response = await sceneSearchService.search(
          queryToSearch,
          contentId,
          seriesId,
          language,
          20,
          0.5
        )

        metricsRef.current.endTime = performance.now()
        metricsRef.current.resultCount = response.results?.length || 0

        const latency = metricsRef.current.endTime - metricsRef.current.startTime
        logger.debug('Scene search completed', 'useSceneSearch', {
          query: queryToSearch,
          resultCount: metricsRef.current.resultCount,
          latencyMs: latency.toFixed(0),
        })

        setResults(response.results || [])
        setCurrentIndex(0)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Search failed'
        logger.error('Scene search failed', 'useSceneSearch', err)
        setError(errorMessage)
        setResults([])
      } finally {
        setLoading(false)
      }
    },
    [query, contentId, seriesId, language]
  )

  const goToResult = useCallback(
    (index: number) => {
      if (index >= 0 && index < results.length) {
        setCurrentIndex(index)
      }
    },
    [results.length]
  )

  const goToNext = useCallback(() => {
    if (currentIndex < results.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    }
  }, [currentIndex, results.length])

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
    }
  }, [currentIndex])

  const clearResults = useCallback(() => {
    setQuery('')
    setResults([])
    setError(null)
    setCurrentIndex(0)
  }, [])

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    currentIndex,
    currentResult: results[currentIndex] || null,
    hasResults: results.length > 0,
    search,
    goToResult,
    goToNext,
    goToPrevious,
    clearResults,
  }
}
