import { useEffect } from 'react'

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

    const handlePlay = () => onPlay()
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

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('volumechange', handleVolumeChange)

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
    }
  }, [videoRef, onTimeUpdate, onPlay, onPause, onEnded, onVolumeChange])
}
