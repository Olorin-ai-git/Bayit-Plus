/**
 * Custom hook for Catch-Up feature (AI-powered program summaries)
 */
import { useState, useCallback, useEffect } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_URL

export interface UseCatchUpOptions { channelId: string; isBetaUser: boolean }

export interface CatchUpSummary {
  summary: string
  keyPoints: string[]
  programInfo?: { title?: string; description?: string; genre?: string; host?: string }
  windowStart: string
  windowEnd: string
  cached: boolean
  creditsUsed: number
  remainingCredits: number
}

export interface UseCatchUpState {
  showAutoPrompt: boolean
  showSummary: boolean
  summary: CatchUpSummary | null
  isLoading: boolean
  error: string | null
  isAvailable: boolean
  hasCredits: boolean
  balance: number
}

function getAuthToken(): string | null {
  try {
    const authData = localStorage.getItem('bayit-auth')
    if (!authData) return null
    return JSON.parse(authData)?.state?.token || null
  } catch { return null }
}

function isDismissed(channelId: string): boolean {
  try { return localStorage.getItem(`catchup-dismissed-${channelId}`) === 'true' }
  catch { return false }
}

function setDismissed(channelId: string): void {
  try { localStorage.setItem(`catchup-dismissed-${channelId}`, 'true') }
  catch { /* storage failure */ }
}

export function useCatchUp({ channelId, isBetaUser }: UseCatchUpOptions) {
  const [state, setState] = useState<UseCatchUpState>({
    showAutoPrompt: false, showSummary: false, summary: null, isLoading: false,
    error: null, isAvailable: false, hasCredits: true, balance: 0,
  })

  const checkAvailability = useCallback(async () => {
    if (!channelId || !isBetaUser) return
    const token = getAuthToken()
    if (!token) return
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/live/${channelId}/catchup/available`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) return
      const data = await response.json()
      setState((prev) => ({
        ...prev, isAvailable: data.available,
        showAutoPrompt: data.available && !isDismissed(channelId),
      }))
    } catch { /* availability check failure */ }
  }, [channelId, isBetaUser])

  useEffect(() => {
    if (isBetaUser && channelId) checkAvailability()
  }, [channelId, isBetaUser, checkAvailability])

  const fetchSummary = useCallback(async (windowMinutes?: number, targetLanguage?: string) => {
    if (!channelId) { setState((prev) => ({ ...prev, error: 'Channel not available' })); return }
    const token = getAuthToken()
    if (!token) { setState((prev) => ({ ...prev, error: 'Authentication required' })); return }
    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const params = new URLSearchParams()
      if (windowMinutes) params.append('window_minutes', windowMinutes.toString())
      if (targetLanguage) params.append('target_language', targetLanguage)
      const qs = params.toString()
      const url = `${API_BASE_URL}/api/v1/live/${channelId}/catchup${qs ? `?${qs}` : ''}`
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })

      if (response.status === 402) {
        const data = await response.json()
        setState((prev) => ({ ...prev, isLoading: false, error: 'Insufficient credits', hasCredits: false, balance: data.remaining_credits || 0 }))
        return
      }
      if (response.status === 503) {
        setState((prev) => ({ ...prev, isLoading: false, error: 'Service temporarily unavailable. Please try again.' }))
        return
      }
      if (!response.ok) {
        setState((prev) => ({ ...prev, isLoading: false, error: 'Failed to fetch summary' }))
        return
      }
      const data: CatchUpSummary = await response.json()
      setState((prev) => ({
        ...prev, isLoading: false, summary: data, showSummary: true,
        showAutoPrompt: false, hasCredits: data.remainingCredits > 0, balance: data.remainingCredits,
      }))
    } catch (err) {
      setState((prev) => ({ ...prev, isLoading: false, error: err instanceof Error ? err.message : 'Failed to fetch summary' }))
    }
  }, [channelId])

  const dismissAutoPrompt = useCallback(() => {
    setDismissed(channelId)
    setState((prev) => ({ ...prev, showAutoPrompt: false }))
  }, [channelId])

  const closeSummary = useCallback(() => {
    setState((prev) => ({ ...prev, showSummary: false }))
  }, [])

  return { ...state, fetchSummary, dismissAutoPrompt, closeSummary }
}
