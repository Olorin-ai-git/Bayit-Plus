/**
 * Flow Store - Global state for active/running flows
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FlowItem {
  id: string;
  title: string;
  thumbnail?: string;
  duration?: number;
  type: 'video' | 'audio' | 'live';
}

export interface RunningFlow {
  id: string;
  name: string;
  name_en?: string;
  icon?: string;
  items: FlowItem[];
  currentIndex: number;
  startedAt: number;
  isPaused: boolean;
}

interface FlowState {
  runningFlow: RunningFlow | null;

  // Actions
  startFlow: (flow: { id: string; name: string; name_en?: string; icon?: string; items: FlowItem[] }) => void;
  stopFlow: () => void;
  pauseFlow: () => void;
  resumeFlow: () => void;
  nextItem: () => void;
  prevItem: () => void;
  setCurrentIndex: (index: number) => void;
}

export const useFlowStore = create<FlowState>()(
  persist(
    (set, get) => ({
      runningFlow: null,

      startFlow: (flow) => {
        set({
          runningFlow: {
            ...flow,
            currentIndex: 0,
            startedAt: Date.now(),
            isPaused: false,
          },
        });
      },

      stopFlow: () => {
        set({ runningFlow: null });
      },

      pauseFlow: () => {
        const { runningFlow } = get();
        if (runningFlow) {
          set({ runningFlow: { ...runningFlow, isPaused: true } });
        }
      },

      resumeFlow: () => {
        const { runningFlow } = get();
        if (runningFlow) {
          set({ runningFlow: { ...runningFlow, isPaused: false } });
        }
      },

      nextItem: () => {
        const { runningFlow } = get();
        if (runningFlow && runningFlow.currentIndex < runningFlow.items.length - 1) {
          set({
            runningFlow: {
              ...runningFlow,
              currentIndex: runningFlow.currentIndex + 1,
            },
          });
        }
      },

      prevItem: () => {
        const { runningFlow } = get();
        if (runningFlow && runningFlow.currentIndex > 0) {
          set({
            runningFlow: {
              ...runningFlow,
              currentIndex: runningFlow.currentIndex - 1,
            },
          });
        }
      },

      setCurrentIndex: (index) => {
        const { runningFlow } = get();
        if (runningFlow && index >= 0 && index < runningFlow.items.length) {
          set({
            runningFlow: {
              ...runningFlow,
              currentIndex: index,
            },
          });
        }
      },
    }),
    {
      name: 'bayit-flow-store',
      partialize: (state) => ({ runningFlow: state.runningFlow }),
    }
  )
);
