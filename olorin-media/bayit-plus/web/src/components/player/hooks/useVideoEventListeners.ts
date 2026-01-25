import { useEffect } from 'react'

interface UseVideoEventListenersOptions {
  videoRef: React.RefObject<HTMLVideoElement>
  onTimeUpdate: (currentTime: number, duration: number) => void
  onPlay: () => void
  onPause: () => void
  onEnded?: () => void
}

export function useVideoEventListeners({
  videoRef,
  onTimeUpdate,
  onPlay,
  onPause,
  onEnded,
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

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
    }
  }, [videoRef, onTimeUpdate, onPlay, onPause, onEnded])
}
