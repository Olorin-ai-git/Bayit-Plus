/**
 * useAudiobooksFeatured Hook
 * Manages featured audiobooks grouped by section for tvOS
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import logger from '../utils/logger'
import { audiobookService } from '../services/audiobookService'
import type { AudiobookFeaturedSection } from '../types/audiobook'

interface UseAudiobooksFeaturedState {
  sections: AudiobookFeaturedSection[]
  loading: boolean
  error: string | null
}

interface UseAudiobooksFeaturedReturn extends UseAudiobooksFeaturedState {
  refetch: () => Promise<void>
  retry: () => Promise<void>
}

export function useAudiobooksFeatured(): UseAudiobooksFeaturedReturn {
  const { t } = useTranslation()
  const [sections, setSections] = useState<AudiobookFeaturedSection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSections = useCallback(async () => {
    try {
      setError(null)
      setLoading(true)
      const data = await audiobookService.getFeaturedBySection()
      setSections(data.sort((a, b) => (a.order || 0) - (b.order || 0)))
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('errors.failedToLoad', 'Failed to load audiobooks')
      logger.error(msg, 'useAudiobooksFeatured', err)
      setError(msg)
      setSections([])
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchSections()

    // Preload images for faster focus transitions
    sections.forEach((section) => {
      section.audiobooks.forEach((audiobook) => {
        if (audiobook.thumbnail) {
          const img = new Image()
          img.src = audiobook.thumbnail
        }
      })
    })
  }, [])

  const refetch = useCallback(async () => {
    await fetchSections()
  }, [fetchSections])

  const retry = useCallback(async () => {
    await fetchSections()
  }, [fetchSections])

  return {
    sections,
    loading,
    error,
    refetch,
    retry,
  }
}

export default useAudiobooksFeatured
