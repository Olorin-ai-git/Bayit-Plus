/**
 * usePictureInPicture Hook
 * Manages browser Picture-in-Picture API state and controls
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import logger from '@/utils/logger'

interface UsePictureInPictureOptions {
  videoRef: React.RefObject<HTMLVideoElement>
  /** Disable PiP even if the browser supports it */
  disabled?: boolean
}

export interface UsePictureInPictureReturn {
  /** Whether the browser supports PiP */
  isSupported: boolean
  /** Whether PiP is currently active */
  isPiP: boolean
  /** Toggle PiP on/off */
  togglePiP: () => Promise<void>
}

/**
 * Hook that provides Picture-in-Picture functionality using the browser API.
 * Handles feature detection, state tracking, and error handling.
 */
export function usePictureInPicture({
  videoRef,
  disabled = false,
}: UsePictureInPictureOptions): UsePictureInPictureReturn {
  const [isPiP, setIsPiP] = useState(false)

  // Check browser PiP support (static after mount)
  const isSupported = useMemo(() => {
    if (disabled) return false
    if (typeof document === 'undefined') return false
    return 'pictureInPictureEnabled' in document && document.pictureInPictureEnabled
  }, [disabled])

  // Listen for PiP enter/leave events on the video element
  useEffect(() => {
    const video = videoRef.current
    if (!video || !isSupported) return

    const handleEnterPiP = () => {
      logger.info('Entered Picture-in-Picture mode', 'usePictureInPicture')
      setIsPiP(true)
    }

    const handleLeavePiP = () => {
      logger.info('Left Picture-in-Picture mode', 'usePictureInPicture')
      setIsPiP(false)
    }

    video.addEventListener('enterpictureinpicture', handleEnterPiP)
    video.addEventListener('leavepictureinpicture', handleLeavePiP)

    // Sync state if PiP was somehow already active
    if (document.pictureInPictureElement === video) {
      setIsPiP(true)
    }

    return () => {
      video.removeEventListener('enterpictureinpicture', handleEnterPiP)
      video.removeEventListener('leavepictureinpicture', handleLeavePiP)
    }
  }, [videoRef, isSupported])

  // Exit PiP when the component unmounts to prevent orphaned PiP windows
  useEffect(() => {
    return () => {
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture().catch((error) => {
          logger.warn('Failed to exit PiP during cleanup', 'usePictureInPicture', error)
        })
      }
    }
  }, [])

  const togglePiP = useCallback(async () => {
    const video = videoRef.current
    if (!video || !isSupported) return

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
        logger.info('Exited Picture-in-Picture', 'usePictureInPicture')
      } else {
        await video.requestPictureInPicture()
        logger.info('Requested Picture-in-Picture', 'usePictureInPicture')
      }
    } catch (error) {
      logger.error('Failed to toggle Picture-in-Picture', 'usePictureInPicture', error)
    }
  }, [videoRef, isSupported])

  return { isSupported, isPiP, togglePiP }
}
