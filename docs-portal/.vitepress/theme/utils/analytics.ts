/**
 * Analytics Integration - Plausible Analytics
 * Privacy-friendly, lightweight analytics for documentation
 */

interface PlausibleOptions {
  props?: Record<string, string | number | boolean>
  revenue?: {
    currency: string
    amount: number
  }
}

declare global {
  interface Window {
    plausible?: (
      eventName: string,
      options?: PlausibleOptions
    ) => void
  }
}

/**
 * Initialize Plausible Analytics
 */
export function initAnalytics() {
  if (typeof window === 'undefined') return

  // Check if Plausible script is already loaded
  if (window.plausible) {
    console.log('[Analytics] Plausible already initialized')
    return
  }

  // Load Plausible script
  const script = document.createElement('script')
  script.defer = true
  script.dataset.domain = 'docs.bayitplus.com'
  script.src = 'https://plausible.io/js/script.js'

  script.onload = () => {
    console.log('[Analytics] Plausible loaded successfully')
  }

  script.onerror = () => {
    console.warn('[Analytics] Failed to load Plausible')
  }

  document.head.appendChild(script)
}

/**
 * Track a custom event
 */
export function trackEvent(
  eventName: string,
  props?: Record<string, string | number | boolean>
) {
  if (typeof window === 'undefined' || !window.plausible) {
    console.warn('[Analytics] Plausible not initialized')
    return
  }

  try {
    window.plausible(eventName, { props })
    console.log(`[Analytics] Event tracked: ${eventName}`, props)
  } catch (error) {
    console.error('[Analytics] Failed to track event:', error)
  }
}

/**
 * Track page view (called automatically by VitePress router)
 */
export function trackPageView(path: string) {
  trackEvent('pageview', { path })
}

/**
 * Track search query
 */
export function trackSearch(query: string, resultsCount: number) {
  trackEvent('Search', {
    query: query.substring(0, 50), // Limit query length
    resultsCount
  })
}

/**
 * Track link click (external links)
 */
export function trackLinkClick(url: string, text: string) {
  trackEvent('Outbound Link', {
    url,
    text: text.substring(0, 50)
  })
}

/**
 * Track documentation section view
 */
export function trackSection(section: string) {
  trackEvent('Section View', { section })
}

/**
 * Track code block copy
 */
export function trackCodeCopy(language: string) {
  trackEvent('Code Copy', { language })
}

/**
 * Track feedback submission
 */
export function trackFeedback(
  path: string,
  helpful: boolean,
  hasComment: boolean
) {
  trackEvent('Feedback', {
    path,
    helpful: helpful ? 'yes' : 'no',
    hasComment
  })
}

/**
 * Track time on page (called on page unload)
 */
export function trackTimeOnPage(path: string, duration: number) {
  trackEvent('Time on Page', {
    path,
    duration: Math.round(duration / 1000) // Convert to seconds
  })
}

/**
 * Setup automatic tracking
 */
export function setupAutoTracking() {
  if (typeof window === 'undefined') return

  // Track time on page
  let pageLoadTime = Date.now()

  const trackCurrentPage = () => {
    const duration = Date.now() - pageLoadTime
    if (duration > 3000) { // Only track if spent more than 3 seconds
      trackTimeOnPage(window.location.pathname, duration)
    }
  }

  // Track on page unload
  window.addEventListener('beforeunload', trackCurrentPage)

  // Track on visibility change (tab switch)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      trackCurrentPage()
    } else {
      pageLoadTime = Date.now()
    }
  })

  // Track external links
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    const link = target.closest('a')

    if (link && link.href) {
      const url = new URL(link.href, window.location.href)

      // Track external links
      if (url.hostname !== window.location.hostname) {
        trackLinkClick(link.href, link.textContent || '')
      }
    }
  })

  console.log('[Analytics] Auto-tracking enabled')
}
