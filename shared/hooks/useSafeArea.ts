/**
 * useSafeArea Hook
 * Provides safe area insets for iOS devices with notches
 */

import { useMemo } from 'react'
import { Platform, StatusBar } from 'react-native'

/**
 * Safe area insets interface
 */
export interface SafeAreaInsets {
  top: number
  right: number
  bottom: number
  left: number
}

/**
 * Get static safe area insets
 * On web, we use CSS env() variables
 * On React Native, we use react-native-safe-area-context if available
 */
export function useSafeAreaInsets(): SafeAreaInsets {
  return useMemo(() => {
    if (Platform.OS === 'web') {
      // For web, safe areas are handled by CSS
      return {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      }
    }

    // For React Native, try to use safe-area-context if available
    // Fallback to estimated values based on device
    try {
      // If react-native-safe-area-context is available, use it
      // Otherwise, provide sensible defaults
      const statusBarHeight = StatusBar.currentHeight || 0

      return {
        top: Platform.OS === 'ios' ? 44 : statusBarHeight,
        right: 0,
        bottom: Platform.OS === 'ios' ? 34 : 0, // iPhone X and later have 34pt bottom inset
        left: 0,
      }
    } catch (error) {
      return {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      }
    }
  }, [])
}

/**
 * Get safe area padding for a specific edge
 */
export function useSafeAreaPadding(edge: 'top' | 'right' | 'bottom' | 'left'): number {
  const insets = useSafeAreaInsets()
  return insets[edge]
}

/**
 * Get safe area padding for multiple edges
 */
export function useSafeAreaPaddingMultiple(
  edges: Array<'top' | 'right' | 'bottom' | 'left'>
): Partial<SafeAreaInsets> {
  const insets = useSafeAreaInsets()

  return useMemo(() => {
    const result: Partial<SafeAreaInsets> = {}
    edges.forEach((edge) => {
      result[edge] = insets[edge]
    })
    return result
  }, [insets, edges])
}

/**
 * Get style object with safe area padding
 */
export function useSafeAreaStyle(
  edges: Array<'top' | 'right' | 'bottom' | 'left'> = ['top', 'bottom']
): object {
  const insets = useSafeAreaInsets()

  return useMemo(() => {
    const style: any = {}

    if (edges.includes('top')) {
      style.paddingTop = insets.top
    }
    if (edges.includes('right')) {
      style.paddingRight = insets.right
    }
    if (edges.includes('bottom')) {
      style.paddingBottom = insets.bottom
    }
    if (edges.includes('left')) {
      style.paddingLeft = insets.left
    }

    return style
  }, [insets, edges])
}

/**
 * Check if device has notch (iPhone X and later)
 */
export function hasNotch(): boolean {
  if (Platform.OS !== 'ios') return false

  // iPhone X and later have safe area bottom inset of 34
  const insets = useSafeAreaInsets()
  return insets.bottom > 20
}

/**
 * Get bottom tab bar height including safe area
 */
export function getTabBarHeight(): number {
  const baseHeight = 49 // Standard iOS tab bar height
  const insets = useSafeAreaInsets()
  return baseHeight + insets.bottom
}

/**
 * Get subtitle position accounting for safe area
 * Subtitles should be above the bottom safe area but with padding
 */
export function getSubtitleBottomPosition(additionalPadding: number = 16): number {
  const insets = useSafeAreaInsets()
  return insets.bottom + additionalPadding
}
