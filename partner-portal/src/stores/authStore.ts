/**
 * B2B Authentication Store
 *
 * API-key based auth against /v1/partner/me.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import axios from "axios";

const API_BASE =
  import.meta.env.VITE_OLORIN_API_URL || "https://api.bayit.tv/api/v1";
const AUTH_STORAGE_KEY = "b2b_auth_state";

export interface PartnerInfo {
  partner_id: string;
  name: string;
  name_en: string | null;
  contact_email: string;
  billing_tier: string;
  capabilities: string[];
  is_active: boolean;
  is_verified: boolean;
  webhook_url: string | null;
  webhook_events: string[];
  branding: Record<string, unknown>;
  created_at: string;
  last_active_at: string | null;
}

interface AuthState {
  apiKey: string | null;
  partner: PartnerInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (apiKey: string) => Promise<void>;
  logout: () => void;
  validateKey: () => Promise<void>;
  clearError: () => void;
}

export function createPartnerClient(apiKey: string) {
  return axios.create({
    baseURL: `${API_BASE}/olorin/v1/partner`,
    headers: { "X-Olorin-API-Key": apiKey },
  });
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      apiKey: null,
      partner: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (apiKey: string) => {
        set({ isLoading: true, error: null });
        try {
          const client = createPartnerClient(apiKey);
          const { data } = await client.get<PartnerInfo>("/me");
          set({
            apiKey,
            partner: data,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          set({
            isLoading: false,
            error: "Invalid API key",
            isAuthenticated: false,
            apiKey: null,
            partner: null,
          });
        }
      },

      logout: () => {
        set({
          apiKey: null,
          partner: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      },

      validateKey: async () => {
        const { apiKey } = get();
        if (!apiKey) {
          set({ isLoading: false });
          return;
        }
        set({ isLoading: true });
        try {
          const client = createPartnerClient(apiKey);
          const { data } = await client.get<PartnerInfo>("/me");
          set({ partner: data, isAuthenticated: true, isLoading: false });
        } catch {
          set({
            apiKey: null,
            partner: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ apiKey: state.apiKey }),
      onRehydrateStorage: () => (state) => {
        state?.validateKey();
      },
    },
  ),
);

/** Backward-compatible alias used by existing pages */
export const useB2BAuthStore = useAuthStore;
