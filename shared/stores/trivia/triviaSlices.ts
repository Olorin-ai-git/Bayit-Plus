/**
 * Trivia Store Slices
 * Separate action creators for modular store composition
 */

import {
  DEFAULT_TRIVIA_PREFERENCES,
  getIntervalForFrequency,
  TriviaResponse,
  TriviaPreferences,
} from '../../types/trivia'
import { triviaApi } from '../../services/api/triviaServices'
import {
  TriviaStateCreator,
  TriviaState,
  CachedTrivia,
} from './triviaTypes'

const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

export const createComputedSlice: TriviaStateCreator = (_set, get) => ({
  isEnabled: () => {
    const { preferences } = get()
    return preferences.enabled && preferences.frequency !== 'off'
  },
  intervalMs: () => {
    const { preferences } = get()
    return getIntervalForFrequency(preferences.frequency) * 1000
  },
})

export const createPreferencesSlice: TriviaStateCreator = (set, get) => ({
  loadPreferences: async () => {
    set({ isLoading: true, error: null })
    try {
      const prefs = await triviaApi.getPreferences()
      set({ preferences: { ...DEFAULT_TRIVIA_PREFERENCES, ...prefs }, isLoading: false })
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load preferences'
      console.error('[TriviaStore] Failed to load preferences:', err)
      set({ isLoading: false, error: errorMessage })
    }
  },

  updatePreferences: async (updates: Partial<TriviaPreferences>) => {
    const current = get().preferences
    const updated = { ...current, ...updates }
    set({ preferences: updated, error: null })

    try {
      await triviaApi.updatePreferences(updates)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update preferences'
      console.error('[TriviaStore] Failed to update preferences:', err)
      set({ preferences: current, error: errorMessage })
    }
  },

  toggleEnabled: async () => {
    const { preferences, updatePreferences } = get()
    await updatePreferences({ enabled: !preferences.enabled })
  },
})

export const createLoadSlice: TriviaStateCreator = (set, get) => ({
  loadTrivia: async (contentId: string, language = 'he') => {
    const cached = get().getCachedTrivia(contentId)
    if (cached) {
      set({ facts: cached.facts, isLoading: false })
      return
    }

    set({ isLoading: true, error: null })
    try {
      const trivia = await triviaApi.getTrivia(contentId, language)
      set({ facts: trivia.facts, isLoading: false })
      get().cacheTrivia(contentId, trivia)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load trivia'
      console.error('[TriviaStore] Failed to load trivia:', err)
      set({ facts: [], isLoading: false, error: errorMessage })
    }
  },

  loadEnrichedTrivia: async (contentId: string, language = 'he') => {
    set({ isLoading: true, error: null })
    try {
      const trivia = await triviaApi.getEnrichedTrivia(contentId, language)
      set({ facts: trivia.facts, isLoading: false })
      get().cacheTrivia(contentId, { ...trivia, is_enriched: true })
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load enriched trivia'
      console.error('[TriviaStore] Failed to load enriched trivia:', err)
      set({ isLoading: false, error: errorMessage })
    }
  },

  cacheTrivia: (contentId: string, trivia: TriviaResponse) => {
    set((state: TriviaState) => ({
      triviaCache: {
        ...state.triviaCache,
        [contentId]: {
          contentId,
          facts: trivia.facts,
          isEnriched: trivia.is_enriched,
          cachedAt: Date.now(),
        },
      },
    }))
  },

  getCachedTrivia: (contentId: string): CachedTrivia | null => {
    const { triviaCache } = get()
    const cached = triviaCache[contentId]
    if (!cached || Date.now() - cached.cachedAt > CACHE_TTL_MS) return null
    return cached
  },
})
