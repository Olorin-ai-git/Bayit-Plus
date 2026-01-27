import { useEffect } from 'react'
import logger from '@/utils/logger'

interface UseVideoEventListenersOptions {
  videoRef: React.RefObject<HTMLVideoElement>
  onTimeUpdate: (currentTime: number, duration: number) => void
  onPlay: () => void
  onPause: () => void
  onEnded?: () => void
  onVolumeChange?: (volume: number, muted: boolean) => void
}

export function useVideoEventListeners({
  videoRef,
  onTimeUpdate,
  onPlay,
  onPause,
  onEnded,
  onVolumeChange,
}: UseVideoEventListenersOptions) {
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      onTimeUpdate(video.currentTime, video.duration || 0)
    }

    const handlePlay = () => {
      // Log audio state when play starts for debugging
      logger.debug('Video play event', 'useVideoEventListeners', {
        muted: video.muted,
        volume: video.volume,
        defaultMuted: video.defaultMuted,
      })
      onPlay()
    }

    const handlePause = () => onPause()
    const handleEnded = () => {
      onPause()
      if (onEnded) onEnded()
    }
    const handleVolumeChange = () => {
      if (onVolumeChange) {
        onVolumeChange(video.volume, video.muted)
      }
    }

    // When video can play, ensure proper audio state
    const handleCanPlay = () => {
      logger.debug('Video canplay event', 'useVideoEventListeners', {
        muted: video.muted,
        volume: video.volume,
        defaultMuted: video.defaultMuted,
      })
      // Sync current state to parent
      if (onVolumeChange) {
        onVolumeChange(video.volume, video.muted)
      }
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('volumechange', handleVolumeChange)
    video.addEventListener('canplay', handleCanPlay)

    // Sync initial volume state when video element is ready
    if (onVolumeChange) {
      onVolumeChange(video.volume, video.muted)
    }

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('volumechange', handleVolumeChange)
      video.removeEventListener('canplay', handleCanPlay)
    }
  }, [videoRef, onTimeUpdate, onPlay, onPause, onEnded, onVolumeChange])
}
