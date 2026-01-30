/**
 * Live Trivia Slice
 *
 * Zustand store slice for managing live trivia state during live streams.
 * Handles facts, preferences, and quota information.
 */

import { StateCreator } from 'zustand'

export interface LiveTriviaFact {
  fact_id: string
  text: string  // Hebrew
  text_en: string
  text_es: string
  category: string
  display_duration: number
  priority: number
  detected_topic?: string
  topic_type?: string
}

export interface LiveTriviaPreferences {
  enabled: boolean
  frequency: 'off' | 'low' | 'normal' | 'high'
}

export interface LiveTriviaQuota {
  remaining_hour: number
  remaining_day: number
  remaining_month: number
}

export interface LiveTriviaState {
  // Current state
  currentLiveFact: LiveTriviaFact | null
  liveTriviaFacts: LiveTriviaFact[]  // Fact history
  currentLiveTopic: string | null

  // Preferences
  isLiveTriviaEnabled: boolean
  liveTriviaFrequency: 'off' | 'low' | 'normal' | 'high'

  // Quota
  liveTriviaQuota: LiveTriviaQuota | null

  // Actions
  setCurrentLiveFact: (fact: LiveTriviaFact | null) => void
  addLiveTriviaFact: (fact: LiveTriviaFact) => void
  clearLiveTriviaFacts: () => void
  setLiveTriviaEnabled: (enabled: boolean) => void
  setLiveTriviaFrequency: (frequency: 'off' | 'low' | 'normal' | 'high') => void
  setLiveTriviaQuota: (quota: LiveTriviaQuota) => void
  setCurrentLiveTopic: (topic: string | null) => void
}

export const createLiveTriviaSlice: StateCreator<LiveTriviaState> = (set, get) => ({
  // Initial state
  currentLiveFact: null,
  liveTriviaFacts: [],
  currentLiveTopic: null,
  isLiveTriviaEnabled: true,
  liveTriviaFrequency: 'high',  // Default to high frequency (30-45s)
  liveTriviaQuota: null,

  // Actions
  setCurrentLiveFact: (fact) =>
    set({ currentLiveFact: fact }),

  addLiveTriviaFact: (fact) =>
    set((state) => ({
      liveTriviaFacts: [...state.liveTriviaFacts, fact].slice(-20),  // Keep last 20
    })),

  clearLiveTriviaFacts: () =>
    set({ liveTriviaFacts: [], currentLiveFact: null }),

  setLiveTriviaEnabled: (enabled) =>
    set({ isLiveTriviaEnabled: enabled }),

  setLiveTriviaFrequency: (frequency) =>
    set({ liveTriviaFrequency: frequency }),

  setLiveTriviaQuota: (quota) =>
    set({ liveTriviaQuota: quota }),

  setCurrentLiveTopic: (topic) =>
    set({ currentLiveTopic: topic }),
})
