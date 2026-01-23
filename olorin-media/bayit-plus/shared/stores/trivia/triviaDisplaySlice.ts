/**
 * Trivia Display Slice
 * Actions for managing fact display and visibility
 */

import { TriviaFact } from '../../types/trivia'
import { TriviaStateCreator, TriviaState } from './triviaTypes'

export const createDisplaySlice: TriviaStateCreator = (set, get) => ({
  showNextFact: (currentTime?: number): TriviaFact | null => {
    const { facts, shownFactIds, preferences, lastShownAt, intervalMs, isEnabled } = get()

    if (!isEnabled()) return null

    const now = Date.now()
    if (lastShownAt && now - lastShownAt < intervalMs()) return null

    const availableFacts = facts.filter((fact) => {
      if (shownFactIds.includes(fact.fact_id)) return false
      if (!preferences.categories.includes(fact.category)) return false

      if (fact.trigger_type === 'time' && fact.trigger_time !== null) {
        if (currentTime === undefined) return false
        const tolerance = 10
        if (Math.abs(currentTime - fact.trigger_time) > tolerance) return false
      }

      return true
    })

    if (availableFacts.length === 0) {
      if (shownFactIds.length > 0 && facts.length > 0) {
        set({ shownFactIds: [] })
      }
      return null
    }

    availableFacts.sort((a, b) => b.priority - a.priority)
    const topFacts = availableFacts.slice(0, 3)
    const selectedFact = topFacts[Math.floor(Math.random() * topFacts.length)]

    set({ currentFact: selectedFact, lastShownAt: now })
    return selectedFact
  },

  dismissFact: () => {
    const { currentFact, markFactShown } = get()
    if (currentFact) {
      markFactShown(currentFact.fact_id)
    }
    set({ currentFact: null })
  },

  markFactShown: (factId: string) => {
    set((state: TriviaState) => ({
      shownFactIds: [...state.shownFactIds, factId],
    }))
  },

  resetShownFacts: () => {
    set({ shownFactIds: [], currentFact: null, lastShownAt: null })
  },
})

export const createUtilitySlice: TriviaStateCreator = (set, _get) => ({
  clearError: () => set({ error: null }),
  clearCache: () => set({ triviaCache: {} }),
})
