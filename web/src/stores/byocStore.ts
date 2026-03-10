import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { byocService } from "@/services/api";
import logger from "@bayit/shared-utils/logger";

const byocLogger = logger.scope("BYOCStore");

export type SourceType = "iptv" | "xtream" | "plex" | "youtube";
export type SourceStatus = "pending" | "normalizing" | "ready" | "error";

export interface BYOCSource {
  id: string;
  type: SourceType;
  name: string;
  url: string;
  credentials?: { username: string; password: string };
  channelCount: number;
  status: SourceStatus;
  lastSynced: string | null;
  errorKey: string | null;
}

interface WizardState {
  step: number;
  sourceType: SourceType | null;
  jobId: string | null;
  normalizationPlan: NormalizationPlan | null;
}

export interface NormalizationPlan {
  totalChannels: number;
  matchedChannels: number;
  unmatchedChannels: number;
  duplicates: number;
}

interface BYOCStoreState {
  sources: BYOCSource[];
  wizard: WizardState;
  isLoading: boolean;
}

interface BYOCStoreActions {
  addSource: (source: BYOCSource) => void;
  removeSource: (id: string) => void;
  updateSource: (id: string, updates: Partial<BYOCSource>) => void;
  setWizardStep: (step: number) => void;
  setWizardSourceType: (type: SourceType) => void;
  setWizardJobId: (jobId: string) => void;
  setNormalizationPlan: (plan: NormalizationPlan) => void;
  resetWizard: () => void;
  enrichSource: (sourceId: string, url: string) => Promise<void>;
  syncSource: (sourceId: string) => Promise<void>;
}

type BYOCStore = BYOCStoreState & BYOCStoreActions;

const INITIAL_WIZARD: WizardState = {
  step: 0,
  sourceType: null,
  jobId: null,
  normalizationPlan: null,
};

export const useBYOCStore = create<BYOCStore>()(
  persist(
    (set, get) => ({
      sources: [],
      wizard: { ...INITIAL_WIZARD },
      isLoading: false,

      addSource: (source) => {
        set((state) => ({ sources: [...state.sources, source] }));
      },

      removeSource: (id) => {
        set((state) => ({
          sources: state.sources.filter((s) => s.id !== id),
        }));
      },

      updateSource: (id, updates) => {
        set((state) => ({
          sources: state.sources.map((s) =>
            s.id === id ? { ...s, ...updates } : s,
          ),
        }));
      },

      setWizardStep: (step) => {
        set((state) => ({ wizard: { ...state.wizard, step } }));
      },

      setWizardSourceType: (type) => {
        set((state) => ({ wizard: { ...state.wizard, sourceType: type } }));
      },

      setWizardJobId: (jobId) => {
        set((state) => ({ wizard: { ...state.wizard, jobId } }));
      },

      setNormalizationPlan: (plan) => {
        set((state) => ({
          wizard: { ...state.wizard, normalizationPlan: plan },
        }));
      },

      resetWizard: () => {
        set({ wizard: { ...INITIAL_WIZARD } });
      },

      enrichSource: async (sourceId, url) => {
        set({ isLoading: true });
        try {
          const data = await byocService.enrich(url);
          get().updateSource(sourceId, {
            channelCount: data.channel_count,
            name:
              data.source_name ||
              get().sources.find((s) => s.id === sourceId)?.name ||
              "",
            status: "pending",
          });
        } catch (err) {
          byocLogger.error("Failed to enrich source", { sourceId, err });
          get().updateSource(sourceId, {
            status: "error",
            errorKey: "byoc.error.enrichFailed",
          });
        } finally {
          set({ isLoading: false });
        }
      },

      syncSource: async (sourceId) => {
        const source = get().sources.find((s) => s.id === sourceId);
        if (!source) return;
        try {
          get().updateSource(sourceId, { status: "normalizing" });
          const data = await byocService.normalize(source.url);
          get().setWizardJobId(data.job_id);
        } catch (err) {
          byocLogger.error("Failed to sync source", { sourceId, err });
          get().updateSource(sourceId, {
            status: "error",
            errorKey: "byoc.error.syncFailed",
          });
        }
      },
    }),
    {
      name: "bayit-byoc-sources",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ sources: state.sources }),
    },
  ),
);
