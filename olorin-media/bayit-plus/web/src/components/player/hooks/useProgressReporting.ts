import { useRef, useEffect } from 'react'

interface UseProgressReportingOptions {
  videoRef: React.RefObject<HTMLVideoElement>
  isPlaying: boolean
  isLive: boolean
  onProgress?: (currentTime: number, duration: number) => void
}

export function useProgressReporting({
  videoRef,
  isPlaying,
  isLive,
  onProgress,
}: UseProgressReportingOptions) {
  const progressInterval = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (onProgress && isPlaying && !isLive) {
      progressInterval.current = setInterval(() => {
        if (videoRef.current && videoRef.current.duration && isFinite(videoRef.current.duration)) {
          onProgress(videoRef.current.currentTime, videoRef.current.duration)
        }
      }, 10000)
    }
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current)
      }
    }
  }, [isPlaying, isLive, onProgress, videoRef])
}
