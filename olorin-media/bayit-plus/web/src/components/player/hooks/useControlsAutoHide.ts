import { useEffect } from 'react'

interface UseControlsAutoHideOptions {
  containerRef: React.RefObject<HTMLDivElement>
  isPlaying: boolean
  onShowControls: () => void
  onHideControls: () => void
}

export function useControlsAutoHide({
  containerRef,
  isPlaying,
  onShowControls,
  onHideControls,
}: UseControlsAutoHideOptions) {
  useEffect(() => {
    let timeout: NodeJS.Timeout
    const handleMouseMove = () => {
      onShowControls()
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        if (isPlaying) onHideControls()
      }, 3000)
    }

    const container = containerRef.current
    container?.addEventListener('mousemove', handleMouseMove)
    container?.addEventListener('touchstart', handleMouseMove)

    return () => {
      container?.removeEventListener('mousemove', handleMouseMove)
      container?.removeEventListener('touchstart', handleMouseMove)
      clearTimeout(timeout)
    }
  }, [isPlaying, containerRef, onShowControls, onHideControls])
}
