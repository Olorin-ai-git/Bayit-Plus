/**
 * useAudiobookDetail Hook
 * Manages loading and caching of single audiobook detail
 */

import { useState, useEffect, useCallback } from 'react'
import logger from '@/utils/logger'
import audiobookService from '@/services/audiobookService'
import type { Audiobook } from '@/types/audiobook'

interface UseAudiobookDetailState {
  audiobook: Audiobook | null
  loading: boolean
  error: string | null
}

interface UseAudiobookDetailReturn extends UseAudiobookDetailState {
  refresh: () => Promise<void>
  retry: () => Promise<void>
}

export function useAudiobookDetail(audiobookId: string | null): UseAudiobookDetailReturn {
  const [audiobook, setAudiobook] = useState<Audiobook | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAudiobook = useCallback(async () => {
    if (!audiobookId) {
      setError('Invalid audiobook ID')
      setLoading(false)
      return
    }

    try {
      setError(null)
      setLoading(true)
      const data = await audiobookService.getAudiobookDetail(audiobookId)
      setAudiobook(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load audiobook'
      logger.error(msg, 'useAudiobookDetail', err)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [audiobookId])

  useEffect(() => {
    fetchAudiobook()
  }, [fetchAudiobook])

  const refresh = useCallback(async () => {
    setLoading(true)
    await fetchAudiobook()
  }, [fetchAudiobook])

  const retry = useCallback(async () => {
    setLoading(true)
    await fetchAudiobook()
  }, [fetchAudiobook])

  return {
    audiobook,
    loading,
    error,
    refresh,
    retry,
  }
}
