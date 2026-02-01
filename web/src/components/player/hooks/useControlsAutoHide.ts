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
  // Track if mouse is over a control panel that should keep controls visible
  const isOverPanelRef = useRef(false)

  // Keep refs updated
  useEffect(() => {
    onShowRef.current = onShowControls
    onHideRef.current = onHideControls
  }, [onShowControls, onHideControls])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const hideDelay = isFullscreen ? 2000 : 3000

    // Check if mouse is currently over a panel that should keep controls visible
    // Panels should have data-controls-panel="true" attribute
    const isMouseOverPanel = (): boolean => {
      const panels = container.querySelectorAll('[data-controls-panel="true"]')
      return isOverPanelRef.current || panels.length > 0 && Array.from(panels).some(panel => {
        const rect = panel.getBoundingClientRect()
        // Check if any panel is being hovered (has :hover pseudo-class)
        return panel.matches(':hover')
      })
    }

    const hideControls = () => {
      if (!isPlaying) return
      // Don't hide if mouse is over a control panel (like subtitle menu)
      if (isMouseOverPanel()) return
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
      // Only hide controls on mouse leave when in fullscreen mode
      // In windowed mode, keep controls visible
      if (isPlaying && isFullscreen) {
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
