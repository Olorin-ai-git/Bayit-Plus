import { useEffect, useCallback } from 'react'
import { Platform } from 'react-native'
import { widgetService } from '../services/widgetService'
import { log } from '@bayit/shared-services/logger.native'

interface PlaybackUpdate {
  contentId: string
  title: string
  type: 'movie' | 'series' | 'audiobook' | 'podcast'
  coverUrl?: string
  position: number
  duration: number
}

/**
 * Hook to sync playback progress with iOS widget
 * Automatically updates widget when playback position changes
 */
export function useWidgetSync() {
  /**
   * Update widget with current playback progress
   * Throttled to avoid excessive updates (max once per 10 seconds)
   */
  const updateWidgetProgress = useCallback(
    async (update: PlaybackUpdate) => {
      if (Platform.OS !== 'ios') return

      try {
        await widgetService.updateContinueWatchingFromPlayback(
          update.contentId,
          update.title,
          update.type,
          update.coverUrl,
          update.position,
          update.duration
        )

        log.debug('Widget sync: Progress updated', {
          contentId: update.contentId,
          position: update.position,
          duration: update.duration,
        })
      } catch (error: unknown) {
        log.error('Widget sync: Failed to update progress', { error })
      }
    },
    []
  )

  /**
   * Share auth token with widget
   * Call this after successful login
   */
  const shareAuthToken = useCallback(async (token: string) => {
    if (Platform.OS !== 'ios') return

    try {
      await widgetService.shareAuthToken(token)
      log.info('Widget sync: Auth token shared')
    } catch (error: unknown) {
      log.error('Widget sync: Failed to share auth token', { error })
    }
  }, [])

  /**
   * Clear widget data on logout
   */
  const clearWidgetData = useCallback(async () => {
    if (Platform.OS !== 'ios') return

    try {
      await widgetService.clearWidgetData()
      log.info('Widget sync: Data cleared')
    } catch (error: unknown) {
      log.error('Widget sync: Failed to clear data', { error })
    }
  }, [])

  return {
    updateWidgetProgress,
    shareAuthToken,
    clearWidgetData,
  }
}

/**
 * Hook to auto-sync playback progress at intervals
 * Useful for long-form content like audiobooks
 */
export function usePlaybackSync(
  contentId: string,
  title: string,
  type: 'movie' | 'series' | 'audiobook' | 'podcast',
  coverUrl: string | undefined,
  getCurrentPosition: () => number,
  duration: number,
  isPlaying: boolean
) {
  const { updateWidgetProgress } = useWidgetSync()

  useEffect(() => {
    if (!isPlaying || Platform.OS !== 'ios') return

    // Update widget every 30 seconds during playback
    const interval = setInterval(() => {
      const position = getCurrentPosition()

      // Only update if significant progress (>10 seconds)
      if (position > 10) {
        updateWidgetProgress({
          contentId,
          title,
          type,
          coverUrl,
          position,
          duration,
        })
      }
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [
    isPlaying,
    contentId,
    title,
    type,
    coverUrl,
    duration,
    getCurrentPosition,
    updateWidgetProgress,
  ])

  // Update on unmount (when user exits player)
  useEffect(() => {
    return () => {
      const position = getCurrentPosition()
      if (position > 10) {
        updateWidgetProgress({
          contentId,
          title,
          type,
          coverUrl,
          position,
          duration,
        })
      }
    }
  }, [contentId, title, type, coverUrl, duration, getCurrentPosition, updateWidgetProgress])
}
