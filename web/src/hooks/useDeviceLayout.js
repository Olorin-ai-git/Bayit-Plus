import { useState, useEffect, useCallback } from 'react'

/**
 * Device layout types
 */
export const LAYOUT_MODES = {
  PHONE_VERTICAL: 'phone_vertical',    // TikTok-style vertical feed
  PHONE_GRID: 'phone_grid',            // Traditional grid layout
  TABLET_GRID: 'tablet_grid',          // Larger grid for tablets
  DESKTOP_CINEMATIC: 'desktop_cinematic', // Cinematic hero layout
  TV_CINEMATIC: 'tv_cinematic',        // Full TV cinematic experience
}

/**
 * Breakpoints for device detection
 */
const BREAKPOINTS = {
  PHONE_MAX: 480,
  TABLET_MAX: 1024,
  DESKTOP_MAX: 1920,
}

/**
 * useDeviceLayout Hook
 * Detects device type and returns appropriate layout configuration.
 * Supports user preferences override.
 */
export function useDeviceLayout(userPreference = null) {
  const [layout, setLayout] = useState({
    mode: LAYOUT_MODES.DESKTOP_CINEMATIC,
    isPhone: false,
    isTablet: false,
    isDesktop: true,
    isTV: false,
    isPortrait: false,
    screenWidth: typeof window !== 'undefined' ? window.innerWidth : 1920,
    screenHeight: typeof window !== 'undefined' ? window.innerHeight : 1080,
  })

  const detectLayout = useCallback(() => {
    if (typeof window === 'undefined') return

    const width = window.innerWidth
    const height = window.innerHeight
    const isPortrait = height > width

    // Detect device type
    const isPhone = width <= BREAKPOINTS.PHONE_MAX
    const isTablet = width > BREAKPOINTS.PHONE_MAX && width <= BREAKPOINTS.TABLET_MAX
    const isDesktop = width > BREAKPOINTS.TABLET_MAX
    const isTV = width >= BREAKPOINTS.DESKTOP_MAX && height >= 900

    // Determine layout mode
    let mode
    if (userPreference) {
      mode = userPreference
    } else if (isPhone) {
      mode = isPortrait ? LAYOUT_MODES.PHONE_VERTICAL : LAYOUT_MODES.PHONE_GRID
    } else if (isTablet) {
      mode = LAYOUT_MODES.TABLET_GRID
    } else if (isTV) {
      mode = LAYOUT_MODES.TV_CINEMATIC
    } else {
      mode = LAYOUT_MODES.DESKTOP_CINEMATIC
    }

    setLayout({
      mode,
      isPhone,
      isTablet,
      isDesktop,
      isTV,
      isPortrait,
      screenWidth: width,
      screenHeight: height,
    })
  }, [userPreference])

  useEffect(() => {
    detectLayout()

    const handleResize = () => {
      detectLayout()
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [detectLayout])

  return layout
}

/**
 * useLayoutPreference Hook
 * Manages user's layout preference stored in localStorage.
 */
export function useLayoutPreference() {
  const [preference, setPreference] = useState(null)

  useEffect(() => {
    const stored = localStorage.getItem('bayit-layout-preference')
    if (stored && Object.values(LAYOUT_MODES).includes(stored)) {
      setPreference(stored)
    }
  }, [])

  const updatePreference = useCallback((mode) => {
    if (Object.values(LAYOUT_MODES).includes(mode)) {
      setPreference(mode)
      localStorage.setItem('bayit-layout-preference', mode)
    }
  }, [])

  const clearPreference = useCallback(() => {
    setPreference(null)
    localStorage.removeItem('bayit-layout-preference')
  }, [])

  return {
    preference,
    updatePreference,
    clearPreference,
  }
}

/**
 * useResponsiveValue Hook
 * Returns different values based on current layout mode.
 */
export function useResponsiveValue(values) {
  const { mode, isPhone, isTablet } = useDeviceLayout()

  if (values[mode]) {
    return values[mode]
  }

  // Fallback chain
  if (isPhone && values.phone) return values.phone
  if (isTablet && values.tablet) return values.tablet
  if (values.desktop) return values.desktop

  return values.default || values[Object.keys(values)[0]]
}

/**
 * Get layout-specific styles
 */
export function getLayoutStyles(layout) {
  const { mode, isPhone, isTV } = layout

  switch (mode) {
    case LAYOUT_MODES.PHONE_VERTICAL:
      return {
        containerPadding: 0,
        gridColumns: 1,
        cardSize: 'full',
        headerHeight: 56,
        showSidebar: false,
        heroHeight: '100vh',
      }

    case LAYOUT_MODES.PHONE_GRID:
      return {
        containerPadding: 12,
        gridColumns: 2,
        cardSize: 'small',
        headerHeight: 56,
        showSidebar: false,
        heroHeight: '40vh',
      }

    case LAYOUT_MODES.TABLET_GRID:
      return {
        containerPadding: 24,
        gridColumns: 3,
        cardSize: 'medium',
        headerHeight: 64,
        showSidebar: true,
        heroHeight: '50vh',
      }

    case LAYOUT_MODES.TV_CINEMATIC:
      return {
        containerPadding: 48,
        gridColumns: 5,
        cardSize: 'large',
        headerHeight: 80,
        showSidebar: true,
        heroHeight: '70vh',
      }

    case LAYOUT_MODES.DESKTOP_CINEMATIC:
    default:
      return {
        containerPadding: 32,
        gridColumns: 4,
        cardSize: 'medium',
        headerHeight: 72,
        showSidebar: true,
        heroHeight: '60vh',
      }
  }
}

export default useDeviceLayout
