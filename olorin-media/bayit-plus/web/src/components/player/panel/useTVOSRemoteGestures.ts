/**
 * tvOS Remote Gesture Support
 *
 * Optimizes Siri Remote swipe gestures for scene search navigation
 * Implements velocity-based scrolling and haptic-like feedback
 */

import { useEffect, useCallback, useRef } from 'react'
import { Platform, TVEventHandler } from 'react-native'
import { isTV, isTVOS } from '@bayit/shared/utils/platform'

export interface TVOSRemoteGestureCallbacks {
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSelect?: () => void
  onPlayPause?: () => void
  onMenu?: () => void
}

/**
 * Hook for tvOS Siri Remote gesture handling
 */
export function useTVOSRemoteGestures(callbacks: TVOSRemoteGestureCallbacks) {
  const tvEventHandlerRef = useRef<TVEventHandler | null>(null)
  const lastSwipeTime = useRef<number>(0)
  const swipeVelocity = useRef<number>(0)

  const handleRemoteEvent = useCallback(
    (evt: any) => {
      const { eventType, eventKeyAction } = evt

      // Debounce rapid swipes
      const now = Date.now()
      const timeSinceLastSwipe = now - lastSwipeTime.current

      if (timeSinceLastSwipe < 100) {
        // Fast swipe - increase velocity
        swipeVelocity.current = Math.min(swipeVelocity.current + 1, 5)
      } else {
        // Reset velocity
        swipeVelocity.current = 1
      }

      lastSwipeTime.current = now

      // Handle different event types
      switch (eventType) {
        case 'swipeUp':
          if (eventKeyAction === 0) {
            // Swipe up - navigate to previous result
            callbacks.onSwipeUp?.()
          }
          break

        case 'swipeDown':
          if (eventKeyAction === 0) {
            // Swipe down - navigate to next result
            callbacks.onSwipeDown?.()
          }
          break

        case 'swipeLeft':
          if (eventKeyAction === 0) {
            callbacks.onSwipeLeft?.()
          }
          break

        case 'swipeRight':
          if (eventKeyAction === 0) {
            callbacks.onSwipeRight?.()
          }
          break

        case 'select':
          if (eventKeyAction === 0) {
            // Select button - play/jump to result
            callbacks.onSelect?.()
          }
          break

        case 'playPause':
          if (eventKeyAction === 0) {
            callbacks.onPlayPause?.()
          }
          break

        case 'menu':
          if (eventKeyAction === 0) {
            // Menu button - close panel
            callbacks.onMenu?.()
          }
          break

        default:
          break
      }
    },
    [callbacks]
  )

  useEffect(() => {
    if (!isTV) return

    // Create TV event handler
    tvEventHandlerRef.current = new TVEventHandler()
    tvEventHandlerRef.current.enable(undefined, handleRemoteEvent)

    return () => {
      if (tvEventHandlerRef.current) {
        tvEventHandlerRef.current.disable()
        tvEventHandlerRef.current = null
      }
    }
  }, [handleRemoteEvent])

  return {
    currentVelocity: swipeVelocity.current,
  }
}

/**
 * Utility: Determine if gesture should scroll or navigate
 */
export function shouldScrollOrNavigate(
  scrollPosition: number,
  maxScroll: number,
  direction: 'up' | 'down'
): 'scroll' | 'navigate' {
  if (direction === 'up' && scrollPosition > 0) {
    return 'scroll'
  }

  if (direction === 'down' && scrollPosition < maxScroll) {
    return 'scroll'
  }

  return 'navigate'
}

/**
 * Velocity-based scroll amount for smooth Siri Remote experience
 */
export function getScrollAmount(velocity: number): number {
  // Base scroll: 100px per swipe
  // With velocity: multiply by velocity (max 5x)
  return 100 * Math.min(velocity, 5)
}
