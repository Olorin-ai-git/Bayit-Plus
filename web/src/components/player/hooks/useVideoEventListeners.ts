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

    // Buffering events for diagnostics
    const handleWaiting = () => {
      logger.info('Video buffering (waiting)', 'useVideoEventListeners', {
        currentTime: video.currentTime,
        buffered: video.buffered.length > 0 ? video.buffered.end(video.buffered.length - 1) : 0,
        readyState: video.readyState,
        networkState: video.networkState,
      })
    }

    const handleStalled = () => {
      logger.warn('Video stalled', 'useVideoEventListeners', {
        currentTime: video.currentTime,
        readyState: video.readyState,
        networkState: video.networkState,
      })
    }

    const handleProgress = () => {
      logger.debug('Video download progress', 'useVideoEventListeners', {
        buffered: video.buffered.length > 0 ? video.buffered.end(video.buffered.length - 1) : 0,
        duration: video.duration,
        networkState: video.networkState,
      })
    }

    const handlePlaying = () => {
      logger.info('Video playing (buffering complete)', 'useVideoEventListeners', {
        currentTime: video.currentTime,
        readyState: video.readyState,
      })
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('volumechange', handleVolumeChange)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('waiting', handleWaiting)
    video.addEventListener('stalled', handleStalled)
    video.addEventListener('progress', handleProgress)
    video.addEventListener('playing', handlePlaying)

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
      video.removeEventListener('waiting', handleWaiting)
      video.removeEventListener('stalled', handleStalled)
      video.removeEventListener('progress', handleProgress)
      video.removeEventListener('playing', handlePlaying)
    }
  }, [videoRef, onTimeUpdate, onPlay, onPause, onEnded, onVolumeChange])
}
