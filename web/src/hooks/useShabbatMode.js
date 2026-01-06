import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { zmanService } from '../services/api'
import { useAuthStore } from '../stores/authStore'

/**
 * Shabbat Mode Context and Hook
 * Provides application-wide Shabbat state and auto-switches UI mode.
 */

const ShabbatModeContext = createContext(null)

export function ShabbatModeProvider({ children }) {
  const { user } = useAuthStore()
  const [state, setState] = useState({
    isShabbat: false,
    isErevShabbat: false,
    shabbatModeActive: false,
    shabbatTimes: null,
    countdown: null,
    countdownLabel: null,
    parasha: null,
    loading: true,
  })

  // Check if user has Shabbat mode enabled in preferences
  const shabbatModeEnabled = user?.preferences?.shabbat_mode_enabled !== false

  const fetchShabbatStatus = useCallback(async () => {
    try {
      const data = await zmanService.getTime()

      const isShabbat = data.shabbat.is_shabbat
      const isErevShabbat = data.shabbat.is_erev_shabbat

      setState(prev => ({
        ...prev,
        isShabbat,
        isErevShabbat,
        shabbatModeActive: shabbatModeEnabled && isShabbat,
        shabbatTimes: {
          candleLighting: data.shabbat.candle_lighting,
          havdalah: data.shabbat.havdalah,
        },
        countdown: data.shabbat.countdown,
        countdownLabel: data.shabbat.countdown_label,
        parasha: data.shabbat.parasha_hebrew,
        loading: false,
      }))
    } catch (err) {
      console.error('Failed to fetch Shabbat status:', err)
      setState(prev => ({ ...prev, loading: false }))
    }
  }, [shabbatModeEnabled])

  useEffect(() => {
    fetchShabbatStatus()
    // Check every 5 minutes for Shabbat transitions
    const interval = setInterval(fetchShabbatStatus, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchShabbatStatus])

  // Apply Shabbat theme when mode is active
  useEffect(() => {
    if (state.shabbatModeActive) {
      document.documentElement.classList.add('shabbat-mode')
      // Could also update CSS custom properties for theming
      document.documentElement.style.setProperty('--accent-color', '#ffd700')
    } else {
      document.documentElement.classList.remove('shabbat-mode')
      document.documentElement.style.removeProperty('--accent-color')
    }
  }, [state.shabbatModeActive])

  const value = {
    ...state,
    refresh: fetchShabbatStatus,
  }

  return (
    <ShabbatModeContext.Provider value={value}>
      {children}
    </ShabbatModeContext.Provider>
  )
}

/**
 * Hook to access Shabbat mode state
 */
export function useShabbatMode() {
  const context = useContext(ShabbatModeContext)
  if (!context) {
    throw new Error('useShabbatMode must be used within a ShabbatModeProvider')
  }
  return context
}

/**
 * Hook for components that need to know if they should show Shabbat content
 */
export function useShabbatContent() {
  const { shabbatModeActive, isShabbat, isErevShabbat, loading } = useShabbatMode()

  return {
    shouldShowShabbatContent: shabbatModeActive || isShabbat,
    shouldShowErevShabbatContent: isErevShabbat,
    loading,
  }
}

export default useShabbatMode
