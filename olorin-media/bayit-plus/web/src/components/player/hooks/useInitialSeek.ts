import { useRef, useEffect } from 'react'
import logger from '@/utils/logger'

interface UseInitialSeekOptions {
  videoRef: React.RefObject<HTMLVideoElement>
  initialSeekTime?: number
  loading: boolean
  duration: number
}

export function useInitialSeek({
  videoRef,
  initialSeekTime,
  loading,
  duration,
}: UseInitialSeekOptions) {
  const initialSeekPerformed = useRef(false)

  useEffect(() => {
    if (
      initialSeekTime != null &&
      initialSeekTime > 0 &&
      !initialSeekPerformed.current &&
      videoRef.current &&
      !loading &&
      duration > 0
    ) {
      if (initialSeekTime < duration) {
        videoRef.current.currentTime = initialSeekTime
        initialSeekPerformed.current = true
        logger.info('Initial seek performed', 'useInitialSeek', { seekTime: initialSeekTime })
      }
    }
  }, [initialSeekTime, loading, duration, videoRef])
}
