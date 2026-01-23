/**
 * SceneSearchPanel Utility Functions
 * Screen reader and focus management helpers
 */

import { Platform, AccessibilityInfo } from 'react-native'

/**
 * Announce message to screen readers
 */
export function announceToScreenReader(message: string) {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const el = document.createElement('div')
    el.setAttribute('role', 'status')
    el.setAttribute('aria-live', 'polite')
    el.setAttribute('aria-atomic', 'true')
    Object.assign(el.style, {
      position: 'absolute',
      left: '-10000px',
      width: '1px',
      height: '1px',
      overflow: 'hidden',
    })
    el.textContent = message
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 1000)
  } else {
    AccessibilityInfo.announceForAccessibility(message)
  }
}

/**
 * Handle focus trap within the panel
 */
export function handleFocusTrap(e: KeyboardEvent) {
  const panel = document.querySelector('[data-testid="scene-search-panel"]')
  if (!panel) return

  const focusableElements = panel.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  const first = focusableElements[0]
  const last = focusableElements[focusableElements.length - 1]

  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last?.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first?.focus()
  }
}
