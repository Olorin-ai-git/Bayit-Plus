/**
 * Safe Area utilities for web
 * Uses CSS env() variables for iOS PWA safe areas
 */

/**
 * Get Tailwind classes for safe area padding
 */
export function getSafeAreaClasses(edges: Array<'top' | 'right' | 'bottom' | 'left'> = []): string {
  const classes: string[] = []

  if (edges.includes('top')) {
    classes.push('[padding-top:env(safe-area-inset-top)]')
  }
  if (edges.includes('right')) {
    classes.push('[padding-right:env(safe-area-inset-right)]')
  }
  if (edges.includes('bottom')) {
    classes.push('[padding-bottom:env(safe-area-inset-bottom)]')
  }
  if (edges.includes('left')) {
    classes.push('[padding-left:env(safe-area-inset-left)]')
  }

  return classes.join(' ')
}

/**
 * Get inline style object for safe area padding
 */
export function getSafeAreaStyle(
  edges: Array<'top' | 'right' | 'bottom' | 'left'> = []
): React.CSSProperties {
  const style: React.CSSProperties = {}

  if (edges.includes('top')) {
    style.paddingTop = 'env(safe-area-inset-top)'
  }
  if (edges.includes('right')) {
    style.paddingRight = 'env(safe-area-inset-right)'
  }
  if (edges.includes('bottom')) {
    style.paddingBottom = 'env(safe-area-inset-bottom)'
  }
  if (edges.includes('left')) {
    style.paddingLeft = 'env(safe-area-inset-left)'
  }

  return style
}

/**
 * Get CSS variable for safe area inset
 */
export function getSafeAreaInset(edge: 'top' | 'right' | 'bottom' | 'left'): string {
  return `env(safe-area-inset-${edge})`
}

/**
 * Check if running as iOS PWA with safe areas
 */
export function isIOSPWA(): boolean {
  if (typeof window === 'undefined') return false

  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
  const isStandalone = 'standalone' in (window.navigator as any) && (window.navigator as any).standalone

  return isIOS && isStandalone
}

/**
 * Add safe area CSS to document
 * Call this once in your app initialization
 */
export function initSafeAreaCSS(): void {
  if (typeof document === 'undefined') return

  // Add viewport-fit=cover meta tag if not present
  let viewport = document.querySelector('meta[name="viewport"]')

  if (viewport) {
    const content = viewport.getAttribute('content') || ''
    if (!content.includes('viewport-fit')) {
      viewport.setAttribute('content', `${content}, viewport-fit=cover`)
    }
  } else {
    viewport = document.createElement('meta')
    viewport.setAttribute('name', 'viewport')
    viewport.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover')
    document.head.appendChild(viewport)
  }

  // Add CSS custom properties for safe areas (fallback values)
  const style = document.createElement('style')
  style.innerHTML = `
    :root {
      --safe-area-inset-top: env(safe-area-inset-top, 0px);
      --safe-area-inset-right: env(safe-area-inset-right, 0px);
      --safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
      --safe-area-inset-left: env(safe-area-inset-left, 0px);
    }

    /* Utility classes for safe areas */
    .safe-area-top {
      padding-top: env(safe-area-inset-top, 0px);
    }

    .safe-area-right {
      padding-right: env(safe-area-inset-right, 0px);
    }

    .safe-area-bottom {
      padding-bottom: env(safe-area-inset-bottom, 0px);
    }

    .safe-area-left {
      padding-left: env(safe-area-inset-left, 0px);
    }

    .safe-area-all {
      padding-top: env(safe-area-inset-top, 0px);
      padding-right: env(safe-area-inset-right, 0px);
      padding-bottom: env(safe-area-inset-bottom, 0px);
      padding-left: env(safe-area-inset-left, 0px);
    }
  `
  document.head.appendChild(style)
}
