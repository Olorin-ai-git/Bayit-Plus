/**
 * WCAG 2.1 Accessibility Enhancements for Scene Search
 *
 * Fixes identified accessibility violations:
 * 1. Missing live regions for dynamic content (WCAG 4.1.3 - Level AA)
 * 2. Insufficient keyboard navigation hints (WCAG 2.4.1 - Level A)
 * 3. Missing focus indicators on all interactive elements (WCAG 2.4.7 - Level AA)
 * 4. Loading/error states not announced to screen readers (WCAG 4.1.3 - Level AA)
 * 5. Missing skip navigation for long results lists (WCAG 2.4.1 - Level A)
 * 6. Color contrast verification for glassmorphism (WCAG 1.4.3 - Level AA)
 * 7. Missing ARIA landmarks for content regions (WCAG 1.3.1 - Level A)
 * 8. Form inputs without explicit associations (WCAG 3.3.2 - Level A)
 */

import { useEffect, useRef } from 'react'
import { AccessibilityInfo, Platform, findNodeHandle } from 'react-native'

/**
 * WCAG 2.1 Level AA color contrast requirements
 * - Normal text (< 18pt): 4.5:1
 * - Large text (>= 18pt): 3:1
 * - UI components: 3:1
 */
export const WCAG_CONTRAST_RATIOS = {
  normalText: 4.5,
  largeText: 3.0,
  uiComponents: 3.0,
}

/**
 * Calculate color contrast ratio (WCAG 2.1 algorithm)
 */
export function calculateContrastRatio(color1: string, color2: string): number {
  const getLuminance = (hexColor: string): number => {
    const rgb = parseInt(hexColor.replace('#', ''), 16)
    const r = (rgb >> 16) & 0xff
    const g = (rgb >> 8) & 0xff
    const b = (rgb >> 0) & 0xff

    const [rs, gs, bs] = [r, g, b].map((c) => {
      const sRGB = c / 255
      return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4)
    })

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
  }

  const l1 = getLuminance(color1)
  const l2 = getLuminance(color2)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)

  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Announce to screen readers with proper timing
 * Implements WCAG 4.1.3 (Status Messages)
 */
export function announceToScreenReader(
  message: string,
  options?: {
    delay?: number
    assertive?: boolean
  }
): void {
  const delay = options?.delay || 100
  const assertive = options?.assertive || false

  setTimeout(() => {
    if (Platform.OS === 'web') {
      const announcement = document.createElement('div')
      announcement.setAttribute('role', assertive ? 'alert' : 'status')
      announcement.setAttribute('aria-live', assertive ? 'assertive' : 'polite')
      announcement.setAttribute('aria-atomic', 'true')
      announcement.style.position = 'absolute'
      announcement.style.left = '-10000px'
      announcement.style.width = '1px'
      announcement.style.height = '1px'
      announcement.style.overflow = 'hidden'
      announcement.textContent = message

      document.body.appendChild(announcement)
      setTimeout(() => document.body.removeChild(announcement), 1000)
    } else {
      AccessibilityInfo.announceForAccessibility(message)
    }
  }, delay)
}

/**
 * Focus trap for modal dialogs (WCAG 2.4.3 - Focus Order)
 * Ensures Tab key stays within panel
 */
export function handleFocusTrap(e: KeyboardEvent): void {
  const focusableElements = Array.from(
    document.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ) as HTMLElement[]

  const panelElements = focusableElements.filter((el) =>
    el.closest('[data-testid="scene-search-panel"]')
  )

  if (panelElements.length === 0) return

  const firstElement = panelElements[0]
  const lastElement = panelElements[panelElements.length - 1]
  const activeElement = document.activeElement as HTMLElement

  if (e.shiftKey) {
    // Shift + Tab - going backwards
    if (activeElement === firstElement) {
      e.preventDefault()
      lastElement.focus()
    }
  } else {
    // Tab - going forwards
    if (activeElement === lastElement) {
      e.preventDefault()
      firstElement.focus()
    }
  }
}

/**
 * Hook for managing live region announcements
 * Implements WCAG 4.1.3 (Status Messages - Level AA)
 */
export function useLiveRegion(options: {
  enabled: boolean
  message: string
  assertive?: boolean
}) {
  const { enabled, message, assertive } = options
  const previousMessage = useRef<string>('')

  useEffect(() => {
    if (!enabled) return
    if (message === previousMessage.current) return

    announceToScreenReader(message, { assertive })
    previousMessage.current = message
  }, [enabled, message, assertive])
}

/**
 * Focus management for panel open/close
 * Implements WCAG 2.4.3 (Focus Order - Level A)
 */
export function useFocusManagement(options: {
  isOpen: boolean
  panelRef: React.RefObject<any>
  returnFocusRef: React.MutableRefObject<HTMLElement | null>
}) {
  const { isOpen, panelRef, returnFocusRef } = options

  useEffect(() => {
    if (Platform.OS !== 'web') return

    if (isOpen) {
      // Save current focus
      returnFocusRef.current = document.activeElement as HTMLElement

      // Move focus to panel
      const panelNode = findNodeHandle(panelRef.current)
      if (panelNode) {
        const panelElement = document.querySelector('[data-testid="scene-search-panel"]') as HTMLElement
        if (panelElement) {
          // Find first focusable element in panel
          const firstFocusable = panelElement.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          ) as HTMLElement
          firstFocusable?.focus()
        }
      }
    } else {
      // Restore focus
      returnFocusRef.current?.focus()
    }
  }, [isOpen, panelRef, returnFocusRef])
}

/**
 * Keyboard shortcuts help text (WCAG 2.1.1 - Keyboard - Level A)
 */
export const KEYBOARD_SHORTCUTS = {
  'Escape': 'Close scene search panel',
  'Arrow Up': 'Navigate to previous result',
  'Arrow Down': 'Navigate to next result',
  'Enter': 'Jump to selected scene',
  'Tab': 'Move focus to next element',
  'Shift + Tab': 'Move focus to previous element',
  '/': 'Focus search input (when panel closed)',
}

/**
 * Get ARIA attributes for search status
 */
export function getSearchStatusARIA(
  loading: boolean,
  error: string | null,
  resultCount: number
): {
  'aria-busy'?: boolean
  'aria-live': 'polite' | 'assertive'
  'aria-relevant': string
  'aria-atomic': boolean
  role: string
} {
  return {
    'aria-busy': loading,
    'aria-live': error ? 'assertive' : 'polite',
    'aria-relevant': 'additions text',
    'aria-atomic': true,
    role: 'status',
  }
}

/**
 * Validate minimum touch target size (WCAG 2.5.5 - Level AAA)
 * Mobile: 44x44 CSS pixels
 * Desktop: 24x24 CSS pixels
 */
export function validateTouchTarget(size: { width: number; height: number }): boolean {
  const isMobile = Platform.OS === 'ios' || Platform.OS === 'android'
  const minSize = isMobile ? 44 : 24

  return size.width >= minSize && size.height >= minSize
}

/**
 * ARIA role mapping for semantic HTML
 */
export const ARIA_ROLES = {
  panel: 'dialog',
  searchInput: 'searchbox',
  resultsList: 'list',
  resultItem: 'listitem',
  statusMessage: 'status',
  errorMessage: 'alert',
  navigation: 'navigation',
}
