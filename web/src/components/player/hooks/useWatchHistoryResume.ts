import { useEffect, useRef, RefObject } from 'react'
import { useNotifications } from '@olorin/glass-ui/hooks'
import { logger } from '@/utils/logger'

interface UseWatchHistoryResumeOptions {
  videoRef: RefObject<HTMLVideoElement>
  savedPosition: number | null
  isLive: boolean
}

/**
 * Hook to handle auto-resume from saved watch position
 *
 * Waits for video 'canplay' event (HLS buffering complete) before seeking
 * to avoid INVALID_STATE_ERR on immediate seeks. Skips resume for positions
 * < 30 seconds to avoid annoying micro-resumes.
 */
export function useWatchHistoryResume({
  videoRef,
  savedPosition,
  isLive,
}: UseWatchHistoryResumeOptions) {
  const notifications = useNotifications()
  const hasResumed = useRef(false)

  useEffect(() => {
    logger.info('useWatchHistoryResume effect triggered', 'useWatchHistoryResume', {
      savedPosition,
      isLive,
      hasResumed: hasResumed.current,
      hasVideoRef: !!videoRef.current,
    })

    // Skip if no saved position, live content, or already resumed
    if (!savedPosition || isLive || hasResumed.current) {
      logger.info('Skipping auto-resume', 'useWatchHistoryResume', {
        reason: !savedPosition ? 'no saved position' : isLive ? 'live content' : 'already resumed',
        savedPosition,
        isLive,
        hasResumed: hasResumed.current,
      })
      return
    }

    // Skip micro-resumes (< 30 seconds)
    if (savedPosition < 30) {
      logger.info('Skipping auto-resume for short position', 'useWatchHistoryResume', {
        savedPosition,
      })
      hasResumed.current = true
      return
    }

    const video = videoRef.current
    if (!video) {
      logger.warn('No video element available', 'useWatchHistoryResume')
      return
    }

    logger.info('Setting up canplay listener', 'useWatchHistoryResume', {
      savedPosition,
      videoReadyState: video.readyState,
      videoNetworkState: video.networkState,
    })

    const handleCanPlay = () => {
      logger.info('canplay event fired', 'useWatchHistoryResume', {
        hasResumed: hasResumed.current,
        savedPosition,
        currentTime: video.currentTime,
        readyState: video.readyState,
      })

      // Only seek once
      if (hasResumed.current) {
        logger.info('Already resumed, skipping', 'useWatchHistoryResume')
        return
      }

      logger.info('Auto-resuming from saved position', 'useWatchHistoryResume', {
        savedPosition,
        currentTime: video.currentTime,
      })

      try {
        video.currentTime = savedPosition
        hasResumed.current = true

        // Format time for user notification (MM:SS)
        const minutes = Math.floor(savedPosition / 60)
        const seconds = Math.floor(savedPosition % 60)
        const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`

        notifications.show({
          level: 'info',
          title: `Resumed from ${timeStr}`,
          dismissable: true,
        })
      } catch (error) {
        logger.error('Failed to seek to saved position', 'useWatchHistoryResume', {
          error: error instanceof Error ? error.message : 'Unknown error',
          savedPosition,
        })
      }
    }

    // Wait for video to be ready before seeking
    // Check if video is already ready (readyState >= 3 means HAVE_FUTURE_DATA or better)
    if (video.readyState >= 3) {
      logger.info('Video already ready, seeking immediately', 'useWatchHistoryResume', {
        readyState: video.readyState,
        savedPosition,
      })
      handleCanPlay()
    } else {
      logger.info('Video not ready, waiting for canplay', 'useWatchHistoryResume', {
        readyState: video.readyState,
        savedPosition,
      })
      video.addEventListener('canplay', handleCanPlay, { once: true })
    }

    return () => {
      video.removeEventListener('canplay', handleCanPlay)
    }
  }, [videoRef, savedPosition, isLive, notifications])
}
