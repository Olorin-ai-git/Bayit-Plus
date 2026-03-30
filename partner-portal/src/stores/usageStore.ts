/**
 * B2B Usage Store
 *
 * Fetches real usage data from /v1/partner/usage endpoints.
 */

import { create } from "zustand";
import { useAuthStore, createPartnerClient } from "./authStore";

export type Capability =
  | "realtime_dubbing"
  | "semantic_search"
  | "cultural_context"
  | "recap_agent";

export const CAPABILITY_LABELS: Record<Capability, string> = {
  realtime_dubbing: "Realtime Dubbing",
  semantic_search: "Semantic Search",
  cultural_context: "Cultural Context",
  recap_agent: "Recap Agent",
};

interface CapabilityUsage {
  request_count: number;
  audio_seconds_processed: number;
  tokens_consumed: number;
  characters_processed: number;
  sessions_created: number;
  estimated_cost_usd: number;
}

export interface UsageSummary {
  partner_id: string;
  period: { start: string; end: string };
  by_capability: Record<string, CapabilityUsage>;
  totals: {
    request_count: number;
    audio_seconds_processed: number;
    estimated_cost_usd: number;
  };
}

interface UsageState {
  summary: UsageSummary | null;
  capabilityDetail: UsageSummary | null;
  selectedCapability: Capability | null;
  isLoading: boolean;
  error: string | null;

  fetchSummary: () => Promise<void>;
  fetchCapability: (cap: Capability) => Promise<void>;
  setSelectedCapability: (cap: Capability | null) => void;
  clearError: () => void;
}

function getClient() {
  const apiKey = useAuthStore.getState().apiKey;
  if (!apiKey) throw new Error("Not authenticated");
  return createPartnerClient(apiKey);
}

export const useUsageStore = create<UsageState>((set) => ({
  summary: null,
  capabilityDetail: null,
  selectedCapability: null,
  isLoading: false,
  error: null,

  fetchSummary: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await getClient().get<UsageSummary>("/usage");
      set({ summary: data, isLoading: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch usage";
      set({ isLoading: false, error: msg });
    }
  },

  fetchCapability: async (cap: Capability) => {
    set({ isLoading: true, error: null, selectedCapability: cap });
    try {
      const { data } = await getClient().get<UsageSummary>(`/usage/${cap}`);
      set({ capabilityDetail: data, isLoading: false });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to fetch capability usage";
      set({ isLoading: false, error: msg });
    }
  },

  setSelectedCapability: (cap) => set({ selectedCapability: cap }),
  clearError: () => set({ error: null }),
}));
