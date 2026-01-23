/**
 * Custom hook for scene search within video content
 *
 * Enables searching for specific scenes/moments within a video or series
 * using natural language queries. Returns timestamped results for deep-linking.
 * Includes TTS audio feedback for accessibility.
 */

import { useState, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { sceneSearchService } from '@/services/api'
import logger from '@/utils/logger'
import { ttsService } from '@bayit/shared/services/ttsService'
import { useVoiceSettingsStore } from '@bayit/shared-stores/voiceSettingsStore'

// Scene search configuration
const SCENE_SEARCH_CONFIG = {
  minQueryLength: 2,
  defaultLimit: 20,
  defaultMinScore: 0.3,
}

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
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SceneSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const metricsRef = useRef<SearchMetrics>({ startTime: 0, endTime: 0, resultCount: 0 })

  // Get voice settings for TTS feedback
  const { preferences } = useVoiceSettingsStore()
  const isTTSEnabled = preferences.tts_enabled && preferences.voice_feedback_enabled

  /**
   * Announce text via TTS if voice feedback is enabled
   */
  const announceWithTTS = useCallback(
    (text: string, priority: 'high' | 'normal' | 'low' = 'normal') => {
      if (!isTTSEnabled) return

      ttsService.speak(text, priority).catch((err) => {
        logger.warn('TTS announcement failed', 'useSceneSearch', { error: err.message })
      })
    },
    [isTTSEnabled]
  )

  const search = useCallback(
    async (searchQuery?: string) => {
      const queryToSearch = searchQuery ?? query
      if (!queryToSearch.trim() || queryToSearch.length < SCENE_SEARCH_CONFIG.minQueryLength) {
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
          SCENE_SEARCH_CONFIG.defaultLimit,
          SCENE_SEARCH_CONFIG.defaultMinScore
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

        // TTS audio feedback for results
        const resultCount = response.results?.length || 0
        if (resultCount > 0) {
          announceWithTTS(t('player.sceneSearch.resultsFound', { count: resultCount }))
        } else {
          announceWithTTS(t('player.sceneSearch.noResults'), 'high')
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Search failed'
        logger.error('Scene search failed', 'useSceneSearch', err)
        setError(errorMessage)
        setResults([])

        // TTS audio feedback for errors
        announceWithTTS(t('player.sceneSearch.searchError'), 'high')
      } finally {
        setLoading(false)
      }
    },
    [query, contentId, seriesId, language, announceWithTTS, t]
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
    setCurrentIndex((prev) => {
      const maxIndex = results.length - 1
      return prev < maxIndex ? prev + 1 : prev
    })
  }, [results.length])

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev))
  }, [])

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
