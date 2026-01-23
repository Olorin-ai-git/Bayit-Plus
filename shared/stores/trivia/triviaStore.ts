/**
 * Trivia Store
 * Main store composition with persistence for offline support
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { DEFAULT_TRIVIA_PREFERENCES } from '../../types/trivia'
import { TriviaStore, TriviaState } from './triviaTypes'
import {
  createComputedSlice,
  createPreferencesSlice,
  createLoadSlice,
} from './triviaSlices'
import { createDisplaySlice, createUtilitySlice } from './triviaDisplaySlice'

const initialState: TriviaState = {
  preferences: DEFAULT_TRIVIA_PREFERENCES,
  currentFact: null,
  facts: [],
  isLoading: false,
  error: null,
  lastShownAt: null,
  shownFactIds: [],
  triviaCache: {},
}

export const useTriviaStore = create<TriviaStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      ...createComputedSlice(set, get),
      ...createPreferencesSlice(set, get),
      ...createLoadSlice(set, get),
      ...createDisplaySlice(set, get),
      ...createUtilitySlice(set, get),
    }),
    {
      name: 'bayit-trivia-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        preferences: state.preferences,
        triviaCache: state.triviaCache,
        shownFactIds: state.shownFactIds,
      }),
    }
  )
)

export default useTriviaStore
