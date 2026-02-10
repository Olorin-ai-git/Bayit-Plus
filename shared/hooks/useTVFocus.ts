/**
 * useTVFocus Hook
 * Handles focus management for tvOS Apple TV remote navigation
 */

import { useRef, useEffect, useCallback, type ElementRef } from 'react'
import { Platform, TVFocusGuideView, findNodeHandle } from 'react-native'

interface TVFocusOptions {
  /** Auto-focus this element when mounted */
  autoFocus?: boolean
  /** Callback when element gains focus */
  onFocus?: () => void
  /** Callback when element loses focus */
  onBlur?: () => void
  /** Preferred focus destinations */
  destinations?: {
    up?: any
    down?: any
    left?: any
    right?: any
  }
}

/**
 * Hook for managing tvOS focus
 * Returns ref and focus state
 */
export function useTVFocus(options: TVFocusOptions = {}) {
  const {
    autoFocus = false,
    onFocus,
    onBlur,
    destinations,
  } = options

  const ref = useRef<any>(null)
  const isFocused = useRef(false)

  // Auto-focus on mount if requested
  useEffect(() => {
    if (Platform.isTV && autoFocus && ref.current) {
      // Request focus on mount
      const nodeHandle = findNodeHandle(ref.current)
      if (nodeHandle) {
        ref.current.focus?.()
      }
    }
  }, [autoFocus])

  // Handle focus events
  const handleFocus = useCallback(() => {
    isFocused.current = true
    onFocus?.()
  }, [onFocus])

  const handleBlur = useCallback(() => {
    isFocused.current = false
    onBlur?.()
  }, [onBlur])

  // Focus management functions
  const focus = useCallback(() => {
    if (ref.current && Platform.isTV) {
      ref.current.focus?.()
    }
  }, [])

  const blur = useCallback(() => {
    if (ref.current && Platform.isTV) {
      ref.current.blur?.()
    }
  }, [])

  // tvOS-specific props to spread on component
  const tvFocusProps = Platform.isTV
    ? {
        hasTVPreferredFocus: autoFocus,
        onFocus: handleFocus,
        onBlur: handleBlur,
        tvParallaxProperties: {
          enabled: true,
          shiftDistanceX: 2.0,
          shiftDistanceY: 2.0,
          tiltAngle: 0.05,
          magnification: 1.1,
          pressMagnification: 1.0,
          pressDuration: 0.3,
        },
      }
    : {}

  return {
    ref,
    isFocused: isFocused.current,
    focus,
    blur,
    tvFocusProps,
  }
}

/**
 * Hook for creating focus groups with preferred destinations
 * Useful for creating grid layouts with predictable navigation
 */
export function useTVFocusGroup(items: any[]) {
  const focusGuideRef = useRef<any>(null)

  const setPreferredDestination = useCallback((index: number) => {
    if (Platform.isTV && focusGuideRef.current && items[index]) {
      const nodeHandle = findNodeHandle(items[index])
      if (nodeHandle) {
        // Set as preferred focus destination
        focusGuideRef.current.setNativeProps?.({
          destinations: [nodeHandle],
        })
      }
    }
  }, [items])

  return {
    focusGuideRef,
    setPreferredDestination,
  }
}

/**
 * Hook for handling tvOS menu button press
 * Returns whether the press was handled
 */
export function useTVMenuButton(onPress: () => boolean) {
  useEffect(() => {
    if (!Platform.isTV) return

    // Note: tvOS menu button handling is typically done via
    // TVMenuControl in React Native, but this provides a hook-based API
    const handleMenuPress = (event: any) => {
      const handled = onPress()
      if (handled) {
        event?.preventDefault()
      }
    }

    // Menu button events would be registered here
    // This is a placeholder for the actual implementation
    // which would depend on the React Native version

    return () => {
      // Cleanup
    }
  }, [onPress])
}

/**
 * Check if running on tvOS
 */
export function isTVOS(): boolean {
  return Platform.isTV && Platform.OS === 'ios'
}

/**
 * Get tvOS-optimized spacing values
 * tvOS requires larger spacing for 10-foot UI
 */
export function getTVOSSpacing(webSpacing: number): number {
  return Platform.isTV ? webSpacing * 1.5 : webSpacing
}

/**
 * Get tvOS-optimized font size
 * tvOS requires larger text for 10-foot viewing
 */
export function getTVOSFontSize(webFontSize: number): number {
  return Platform.isTV ? webFontSize * 1.3 : webFontSize
}
