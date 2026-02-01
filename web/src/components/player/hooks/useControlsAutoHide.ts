import { useEffect, useRef, useCallback } from 'react'

interface UseControlsAutoHideOptions {
  containerRef: React.RefObject<HTMLDivElement>
  isPlaying: boolean
  isFullscreen: boolean
  onShowControls: () => void
  onHideControls: () => void
}

export function useControlsAutoHide({
  containerRef,
  isPlaying,
  isFullscreen,
  onShowControls,
  onHideControls,
}: UseControlsAutoHideOptions) {
  // Use refs for callbacks to avoid effect re-running on every render
  const onShowRef = useRef(onShowControls)
  const onHideRef = useRef(onHideControls)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Keep refs updated
  useEffect(() => {
    onShowRef.current = onShowControls
    onHideRef.current = onHideControls
  }, [onShowControls, onHideControls])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const hideDelay = isFullscreen ? 2000 : 3000

    const hideControls = () => {
      if (!isPlaying) return
      onHideRef.current()
      container.style.cursor = 'none'
    }

    const showControls = () => {
      onShowRef.current()
      container.style.cursor = 'default'
    }

    const resetTimer = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (isPlaying) {
        timeoutRef.current = setTimeout(hideControls, hideDelay)
      }
    }

    const handleMouseMove = () => {
      showControls()
      resetTimer()
    }

    const handleMouseLeave = () => {
      if (isPlaying) {
        hideControls()
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
      }
    }

    // Start timer if playing
    if (isPlaying) {
      resetTimer()
    } else {
      showControls()
    }

    container.addEventListener('mousemove', handleMouseMove)
    container.addEventListener('touchstart', handleMouseMove)
    container.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      container.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('touchstart', handleMouseMove)
      container.removeEventListener('mouseleave', handleMouseLeave)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [isPlaying, isFullscreen, containerRef])
}
