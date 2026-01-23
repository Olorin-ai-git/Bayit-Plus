/**
 * Trivia Store Types
 * Type definitions for trivia store state and actions
 */

import {
  TriviaFact,
  TriviaPreferences,
  TriviaResponse,
} from '../../types/trivia'

export interface CachedTrivia {
  contentId: string
  facts: TriviaFact[]
  isEnriched: boolean
  cachedAt: number
}

export interface TriviaState {
  preferences: TriviaPreferences
  currentFact: TriviaFact | null
  facts: TriviaFact[]
  isLoading: boolean
  error: string | null
  lastShownAt: number | null
  shownFactIds: string[]
  triviaCache: Record<string, CachedTrivia>
}

export interface TriviaComputedActions {
  isEnabled: () => boolean
  intervalMs: () => number
}

export interface TriviaPreferencesActions {
  loadPreferences: () => Promise<void>
  updatePreferences: (updates: Partial<TriviaPreferences>) => Promise<void>
  toggleEnabled: () => Promise<void>
}

export interface TriviaLoadActions {
  loadTrivia: (contentId: string, language?: string) => Promise<void>
  loadEnrichedTrivia: (contentId: string, language?: string) => Promise<void>
  cacheTrivia: (contentId: string, trivia: TriviaResponse) => void
  getCachedTrivia: (contentId: string) => CachedTrivia | null
}

export interface TriviaDisplayActions {
  showNextFact: (currentTime?: number) => TriviaFact | null
  dismissFact: () => void
  markFactShown: (factId: string) => void
  resetShownFacts: () => void
}

export interface TriviaUtilityActions {
  clearError: () => void
  clearCache: () => void
}

export interface TriviaStore
  extends TriviaState,
    TriviaComputedActions,
    TriviaPreferencesActions,
    TriviaLoadActions,
    TriviaDisplayActions,
    TriviaUtilityActions {}

export type TriviaStateCreator = (
  set: (partial: Partial<TriviaState> | ((state: TriviaState) => Partial<TriviaState>)) => void,
  get: () => TriviaStore
) => Partial<TriviaStore>
