/**
 * Trivia Display Slice
 * Actions for managing fact display, visibility, and follow-up chains
 */

import { TriviaFact } from '../../types/trivia'
import { TriviaStateCreator, TriviaState } from './triviaTypes'

/**
 * Check if a fact is a "root" fact eligible for random selection.
 * Root = first in a chain (chain_order === 0) OR standalone (no chain_id).
 */
function isRootFact(fact: TriviaFact): boolean {
  return fact.chain_id == null || fact.chain_order === 0
}

export const createDisplaySlice: TriviaStateCreator = (set, get) => ({
  showNextFact: (currentTime?: number): TriviaFact | null => {
    const { facts, shownFactIds, preferences, lastShownAt, intervalMs, isEnabled } = get()

    if (!isEnabled()) return null

    const now = Date.now()
    if (lastShownAt && now - lastShownAt < intervalMs()) return null

    // Only pick root facts for random display (not follow-ups)
    const availableFacts = facts.filter((fact) => {
      if (shownFactIds.includes(fact.fact_id)) return false
      if (!preferences.categories.includes(fact.category)) return false
      if (!isRootFact(fact)) return false

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

    set({
      currentFact: selectedFact,
      lastShownAt: now,
      activeChainId: selectedFact.chain_id ?? null,
    })
    return selectedFact
  },

  dismissFact: () => {
    const { currentFact, markFactShown } = get()
    if (currentFact) {
      markFactShown(currentFact.fact_id)
    }
    set({ currentFact: null, activeChainId: null })
  },

  followUpFact: (): TriviaFact | null => {
    const { currentFact, facts, markFactShown } = get()
    if (!currentFact || !currentFact.chain_id || !currentFact.has_follow_up) {
      return null
    }

    const nextOrder = (currentFact.chain_order ?? 0) + 1
    const nextFact = facts.find(
      (f) => f.chain_id === currentFact.chain_id && f.chain_order === nextOrder
    )

    if (!nextFact) return null

    // Mark the current fact as shown before moving to follow-up
    markFactShown(currentFact.fact_id)

    set((state: TriviaState) => ({
      currentFact: nextFact,
      lastShownAt: Date.now(),
      activeChainId: nextFact.chain_id ?? null,
      chainEngagementCount: state.chainEngagementCount + 1,
    }))

    return nextFact
  },

  markFactShown: (factId: string) => {
    set((state: TriviaState) => ({
      shownFactIds: [...state.shownFactIds, factId],
    }))
  },

  resetShownFacts: () => {
    set({ shownFactIds: [], currentFact: null, lastShownAt: null, activeChainId: null })
  },
})

export const createUtilitySlice: TriviaStateCreator = (set, _get) => ({
  clearError: () => set({ error: null }),
  clearCache: () => set({ triviaCache: {} }),
})
