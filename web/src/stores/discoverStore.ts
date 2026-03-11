import { create } from "zustand";
import { discoverService } from "@/services/api";
import logger from "@bayit/shared-utils/logger";
import type {
  DiscoverFeatureConfig,
  DiscoverFeatureId,
  FeatureAvailability,
  Platform,
} from "@/data/discoverTypes";
import { DISCOVER_FEATURES } from "@/data/discoverCatalog";
import { useAuthStore } from "@bayit/shared-stores/authStore";

const discoverLogger = logger.scope("DiscoverStore");

interface WalkthroughState {
  featureId: DiscoverFeatureId;
  currentStep: number;
  completed: boolean;
}

interface DiscoverStoreState {
  featureConfigs: DiscoverFeatureConfig[];
  walkthroughs: Record<string, WalkthroughState>;
  isLoading: boolean;
  error: string | null;
  charGenFreeRemaining: number;
  charGenFreeLimit: number;
}

interface DiscoverStoreActions {
  fetchConfig: () => Promise<void>;
  fetchCharGenStatus: () => Promise<void>;
  getAvailability: (featureId: DiscoverFeatureId) => FeatureAvailability;
  startWalkthrough: (featureId: DiscoverFeatureId) => void;
  advanceWalkthrough: (featureId: DiscoverFeatureId) => void;
  completeWalkthrough: (
    featureId: DiscoverFeatureId,
    skipped: boolean,
  ) => Promise<void>;
}

type DiscoverStore = DiscoverStoreState & DiscoverStoreActions;

export const useDiscoverStore = create<DiscoverStore>((set, get) => ({
  featureConfigs: [],
  walkthroughs: {},
  isLoading: false,
  error: null,
  charGenFreeRemaining: 0,
  charGenFreeLimit: 0,

  fetchConfig: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await discoverService.getConfig();
      set({ featureConfigs: data.features, isLoading: false });
    } catch (err) {
      discoverLogger.error("Failed to fetch discover config", { err });
      set({ error: "discover.error.fetchFailed", isLoading: false });
    }
  },

  fetchCharGenStatus: async () => {
    try {
      const data = await discoverService.getCharacterGenStatus();
      set({
        charGenFreeRemaining: data.free_remaining,
        charGenFreeLimit: data.free_limit,
      });
    } catch (err) {
      discoverLogger.error("Failed to fetch char gen status", { err });
    }
  },

  getAvailability: (featureId: DiscoverFeatureId): FeatureAvailability => {
    const feature = DISCOVER_FEATURES.find((f) => f.id === featureId);
    if (!feature)
      return {
        state: "notAvailable",
        reasonKey: "discover.error.unknownFeature",
      };

    const currentPlatform: Platform = "web";
    if (!feature.platforms.includes(currentPlatform)) {
      return { state: "platformOnly", platform: feature.platforms[0] };
    }

    const config = get().featureConfigs.find((c) => c.feature_id === featureId);
    if (config && !config.enabled) {
      return {
        state: "notAvailable",
        reasonKey: "discover.error.featureDisabled",
      };
    }

    const user = useAuthStore.getState().user;
    const unmet = feature.prerequisites.filter((p) => {
      if (p.type === "subscription") {
        return !user?.subscription || user.subscription.plan === "free";
      }
      if (p.type === "avatar") {
        return !user?.avatar;
      }
      return false;
    });

    if (unmet.length > 0) return { state: "setupNeeded", unmet };
    return { state: "ready" };
  },

  startWalkthrough: (featureId) => {
    set((state) => ({
      walkthroughs: {
        ...state.walkthroughs,
        [featureId]: { featureId, currentStep: 0, completed: false },
      },
    }));
  },

  advanceWalkthrough: (featureId) => {
    set((state) => {
      const wt = state.walkthroughs[featureId];
      if (!wt) return state;
      const feature = DISCOVER_FEATURES.find((f) => f.id === featureId);
      const maxSteps = feature?.walkthroughSteps.length ?? 0;
      const nextStep = wt.currentStep + 1;
      return {
        walkthroughs: {
          ...state.walkthroughs,
          [featureId]: {
            ...wt,
            currentStep: nextStep,
            completed: nextStep >= maxSteps,
          },
        },
      };
    });
  },

  completeWalkthrough: async (featureId, skipped) => {
    const wt = get().walkthroughs[featureId];
    const stepsCompleted = wt?.currentStep ?? 0;
    try {
      await discoverService.completeWalkthrough(
        featureId,
        stepsCompleted,
        skipped,
      );
      set((state) => ({
        walkthroughs: {
          ...state.walkthroughs,
          [featureId]: {
            featureId,
            currentStep: stepsCompleted,
            completed: true,
          },
        },
      }));
    } catch (err) {
      discoverLogger.error("Failed to complete walkthrough", {
        featureId,
        err,
      });
    }
  },
}));
