/**
 * tvOS Spatial Navigation Hints
 *
 * Provides visual and behavioral hints for Apple TV remote navigation
 * Implements tvOS-specific spatial navigation patterns
 */

import { useEffect, useState, useCallback } from 'react'
import { Platform, AccessibilityInfo } from 'react-native'
import { isTV } from '@bayit/shared/utils/platform'

export interface SpatialNavigationHints {
  canGoUp: boolean
  canGoDown: boolean
  canGoLeft: boolean
  canGoRight: boolean
  currentFocusIndex: number
  totalItems: number
}

/**
 * Hook to manage tvOS spatial navigation hints
 */
export function useTVOSSpatialNavigation(props: {
  itemCount: number
  currentIndex: number
  onNavigate?: (direction: 'up' | 'down' | 'left' | 'right') => void
}) {
  const { itemCount, currentIndex, onNavigate } = props

  const [hints, setHints] = useState<SpatialNavigationHints>({
    canGoUp: currentIndex > 0,
    canGoDown: currentIndex < itemCount - 1,
    canGoLeft: false,
    canGoRight: false,
    currentFocusIndex: currentIndex,
    totalItems: itemCount,
  })

  useEffect(() => {
    setHints({
      canGoUp: currentIndex > 0,
      canGoDown: currentIndex < itemCount - 1,
      canGoLeft: false,
      canGoRight: false,
      currentFocusIndex: currentIndex,
      totalItems: itemCount,
    })
  }, [currentIndex, itemCount])

  const announceNavigation = useCallback((direction: string, available: boolean) => {
    if (!isTV) return

    const message = available
      ? `Can navigate ${direction}. ${itemCount - currentIndex - 1} items remaining`
      : `End of list. ${currentIndex + 1} of ${itemCount}`

    // Announce to tvOS VoiceOver
    AccessibilityInfo.announceForAccessibility(message)
  }, [currentIndex, itemCount])

  return {
    hints,
    announceNavigation,
  }
}

/**
 * tvOS-specific focus boundary detection
 */
export function isFocusBoundary(element: HTMLElement | null): boolean {
  if (!element || Platform.OS !== 'web') return false

  // Check if element is at edge of focusable container
  const rect = element.getBoundingClientRect()
  const container = element.closest('[data-focus-container]')

  if (!container) return false

  const containerRect = container.getBoundingClientRect()

  return (
    rect.top <= containerRect.top + 10 ||
    rect.bottom >= containerRect.bottom - 10
  )
}

/**
 * Get next focusable element in direction (for tvOS D-pad)
 */
export function getNextFocusableElement(
  current: HTMLElement,
  direction: 'up' | 'down' | 'left' | 'right'
): HTMLElement | null {
  if (Platform.OS !== 'web') return null

  const focusables = Array.from(
    document.querySelectorAll('[focusable="true"], button, a, input')
  ) as HTMLElement[]

  const currentIndex = focusables.indexOf(current)
  if (currentIndex === -1) return null

  switch (direction) {
    case 'up':
      return currentIndex > 0 ? focusables[currentIndex - 1] : null
    case 'down':
      return currentIndex < focusables.length - 1 ? focusables[currentIndex + 1] : null
    case 'left':
    case 'right':
      // Horizontal navigation not typically used in vertical lists
      return null
    default:
      return null
  }
}
