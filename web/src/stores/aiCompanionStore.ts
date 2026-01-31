/**
 * AI Companion Store
 *
 * Manages state for the AI Companion Sidebar (visibility, active tab).
 * Persisted to localStorage so user preferences survive page reloads.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AICompanionTab = 'vocabulary' | 'context' | 'quiz';

interface AICompanionState {
  isVisible: boolean;
  activeTab: AICompanionTab;
  lastContentId: string | null;
}

interface AICompanionActions {
  open: () => void;
  close: () => void;
  toggle: () => void;
  setActiveTab: (tab: AICompanionTab) => void;
  setContentId: (contentId: string) => void;
}

type AICompanionStore = AICompanionState & AICompanionActions;

const DEFAULT_STATE: AICompanionState = {
  isVisible: false,
  activeTab: 'vocabulary',
  lastContentId: null,
};

export const useAICompanionStore = create<AICompanionStore>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,

      open: () => set({ isVisible: true }),

      close: () => set({ isVisible: false }),

      toggle: () => set((state) => ({ isVisible: !state.isVisible })),

      setActiveTab: (tab) => set({ activeTab: tab }),

      setContentId: (contentId) => set({ lastContentId: contentId }),
    }),
    {
      name: 'bayit-ai-companion',
      partialize: (state) => ({
        activeTab: state.activeTab,
        // Don't persist isVisible - sidebar should be closed on page load
      }),
    }
  )
);

export default useAICompanionStore;
