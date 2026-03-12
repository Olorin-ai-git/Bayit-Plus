import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import logger from "@/utils/logger";

const aiGatewayLogger = logger.scope("AIGatewayStore");

interface AIGatewayStoreState {
  dismissCount: number;
  lastDismissSession: number | null;
  permanentlyDismissed: boolean;
  sessionCount: number;
  firstBYOCPlayCompleted: boolean;
  firstAIFeatureUsed: boolean;
  moreContentDismissed: boolean;
}

interface AIGatewayStoreActions {
  incrementSession: () => void;
  dismiss: () => void;
  permanentlyDismiss: () => void;
  markFirstBYOCPlay: () => void;
  markFirstAIFeatureUsed: () => void;
  dismissMoreContent: () => void;
}

interface AIGatewayStoreComputed {
  shouldShowCard: (hasYouTubeSource: boolean) => boolean;
  showDontShowAgain: () => boolean;
  shouldShowMoreContentCard: (hasYouTubeSource: boolean) => boolean;
}

type AIGatewayStore = AIGatewayStoreState &
  AIGatewayStoreActions &
  AIGatewayStoreComputed;

const DISMISS_THRESHOLD = 3;

export const useAIGatewayStore = create<AIGatewayStore>()(
  persist(
    (set, get) => ({
      dismissCount: 0,
      lastDismissSession: null,
      permanentlyDismissed: false,
      sessionCount: 0,
      firstBYOCPlayCompleted: false,
      firstAIFeatureUsed: false,
      moreContentDismissed: false,

      incrementSession: () => {
        set((state) => ({ sessionCount: state.sessionCount + 1 }));
      },

      dismiss: () => {
        const { sessionCount, dismissCount } = get();
        aiGatewayLogger.info("AI Gateway card dismissed", {
          dismissCount: dismissCount + 1,
          sessionCount,
        });
        set((state) => ({
          dismissCount: state.dismissCount + 1,
          lastDismissSession: state.sessionCount,
        }));
      },

      permanentlyDismiss: () => {
        aiGatewayLogger.info("AI Gateway card permanently dismissed");
        set({ permanentlyDismissed: true });
      },

      markFirstBYOCPlay: () => {
        if (!get().firstBYOCPlayCompleted) {
          aiGatewayLogger.info("First BYOC play completed");
          set({ firstBYOCPlayCompleted: true });
        }
      },

      markFirstAIFeatureUsed: () => {
        if (!get().firstAIFeatureUsed) {
          aiGatewayLogger.info("First AI feature used on BYOC content");
          set({ firstAIFeatureUsed: true });
        }
      },

      dismissMoreContent: () => {
        aiGatewayLogger.info("More content card dismissed");
        set({ moreContentDismissed: true });
      },

      shouldShowCard: (hasYouTubeSource: boolean) => {
        const {
          permanentlyDismissed,
          dismissCount,
          lastDismissSession,
          sessionCount,
        } = get();
        if (hasYouTubeSource) return false;
        if (permanentlyDismissed) return false;
        // After first dismiss, suppress for current session
        if (
          lastDismissSession !== null &&
          lastDismissSession === sessionCount
        ) {
          return false;
        }
        // After 5 dismissals without permanent, suppress until next session
        if (dismissCount >= 5) {
          return lastDismissSession !== sessionCount - 1;
        }
        return true;
      },

      showDontShowAgain: () => {
        return get().dismissCount >= DISMISS_THRESHOLD;
      },

      shouldShowMoreContentCard: (hasYouTubeSource: boolean) => {
        const { firstAIFeatureUsed, moreContentDismissed } = get();
        if (!hasYouTubeSource) return false;
        if (!firstAIFeatureUsed) return false;
        if (moreContentDismissed) return false;
        return true;
      },
    }),
    {
      name: "bayit-ai-gateway",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        dismissCount: state.dismissCount,
        lastDismissSession: state.lastDismissSession,
        permanentlyDismissed: state.permanentlyDismissed,
        sessionCount: state.sessionCount,
        firstBYOCPlayCompleted: state.firstBYOCPlayCompleted,
        firstAIFeatureUsed: state.firstAIFeatureUsed,
        moreContentDismissed: state.moreContentDismissed,
      }),
    },
  ),
);
