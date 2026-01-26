/**
 * Global type declarations for Bayit+ Web Application
 */

declare global {
  interface Window {
    /**
     * Function called by React when app is ready to hide splash screen
     * Defined in index.html and called from main.tsx
     */
    hideSplashWhenReady?: () => void

    /**
     * Flag indicating whether splash screen has been removed from DOM
     * Set to true after splash.remove() is called
     */
    splashScreenRemoved?: boolean
  }
}

export {}
