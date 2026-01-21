/**
 * Splash Screen Utility
 * 
 * Provides functions to control the splash screen display.
 */

// Extend Window interface for TypeScript
declare global {
  interface Window {
    hideSplashWhenReady?: () => void
  }
}

/**
 * Signal that the app is ready to hide splash screen
 * The splash screen will respect minimum display time (3 seconds)
 */
export const hideSplashScreen = (): void => {
  if (typeof window.hideSplashWhenReady === 'function') {
    window.hideSplashWhenReady()
  }
}

/**
 * Check if splash screen is currently visible
 */
export const isSplashScreenVisible = (): boolean => {
  const splash = document.getElementById('splash-screen')
  return splash !== null && !splash.classList.contains('fade-out')
}

/**
 * Update splash screen loading text
 * @param text - New loading text to display
 */
export const updateSplashText = (text: string): void => {
  const splash = document.getElementById('splash-screen')
  if (splash) {
    const textElement = splash.querySelector('.loading-text')
    if (textElement) {
      textElement.textContent = text
    }
  }
}
