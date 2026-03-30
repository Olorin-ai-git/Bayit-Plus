/**
 * B2B Partner Store
 *
 * Zustand store for organization, team, and API keys management.
 * Uses API-key auth via createPartnerClient from authStore.
 */

import { create } from "zustand";
import type {
  B2BOrganization,
  TeamMember,
  ApiKey,
  InviteMemberRequest,
  InviteMemberResponse,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  WebhookConfig,
} from "../types";
import { useAuthStore, createPartnerClient } from "./authStore";

function getClient() {
  const apiKey = useAuthStore.getState().apiKey;
  if (!apiKey) throw new Error("Not authenticated");
  return createPartnerClient(apiKey);
}

interface PartnerState {
  organization: B2BOrganization | null;
  teamMembers: TeamMember[];
  apiKeys: ApiKey[];
  isLoading: boolean;
  error: string | null;

  fetchOrganization: () => Promise<void>;
  updateOrganization: (updates: Partial<B2BOrganization>) => Promise<void>;
  updateWebhook: (config: WebhookConfig) => Promise<void>;

  fetchTeamMembers: () => Promise<void>;
  inviteMember: (data: InviteMemberRequest) => Promise<InviteMemberResponse>;
  updateMemberRole: (userId: string, role: string) => Promise<void>;
  removeMember: (userId: string) => Promise<void>;

  fetchApiKeys: () => Promise<void>;
  createApiKey: (data: CreateApiKeyRequest) => Promise<CreateApiKeyResponse>;
  revokeApiKey: (keyId: string) => Promise<void>;

  clearError: () => void;
}

export const usePartnerStore = create<PartnerState>((set, get) => ({
  organization: null,
  teamMembers: [],
  apiKeys: [],
  isLoading: false,
  error: null,

  fetchOrganization: async () => {
    set({ isLoading: true, error: null });
    try {
      const client = getClient();
      const response = await client.get<B2BOrganization>("/me");
      set({ organization: response.data, isLoading: false });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch organization";
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  updateOrganization: async (updates: Partial<B2BOrganization>) => {
    set({ isLoading: true, error: null });
    try {
      const client = getClient();
      const response = await client.put<B2BOrganization>("/me", updates);
      set({ organization: response.data, isLoading: false });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update organization";
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  updateWebhook: async (config: WebhookConfig) => {
    set({ isLoading: true, error: null });
    try {
      const client = getClient();
      const response = await client.post<B2BOrganization>(
        "/me/webhook",
        config,
      );
      set({ organization: response.data, isLoading: false });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update webhook";
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  fetchTeamMembers: async () => {
    set({ isLoading: true, error: null });
    try {
      const client = getClient();
      const response = await client.get<{ members: TeamMember[] }>("/me/team");
      set({ teamMembers: response.data.members, isLoading: false });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch team members";
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  inviteMember: async (data: InviteMemberRequest) => {
    set({ isLoading: true, error: null });
    try {
      const client = getClient();
      const response = await client.post<InviteMemberResponse>(
        "/me/team",
        data,
      );
      const { teamMembers } = get();
      set({
        teamMembers: [...teamMembers, response.data.member],
        isLoading: false,
      });
      return response.data;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to invite member";
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  updateMemberRole: async (userId: string, role: string) => {
    set({ isLoading: true, error: null });
    try {
      const client = getClient();
      const response = await client.put<TeamMember>(`/me/team/${userId}`, {
        role,
      });
      const { teamMembers } = get();
      set({
        teamMembers: teamMembers.map((m) =>
          m.id === userId ? response.data : m,
        ),
        isLoading: false,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update member role";
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  removeMember: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const client = getClient();
      await client.delete(`/me/team/${userId}`);
      const { teamMembers } = get();
      set({
        teamMembers: teamMembers.filter((m) => m.id !== userId),
        isLoading: false,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to remove member";
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  fetchApiKeys: async () => {
    set({ isLoading: true, error: null });
    try {
      const client = getClient();
      const response = await client.get<{ apiKeys: ApiKey[] }>("/api-keys");
      set({ apiKeys: response.data.apiKeys, isLoading: false });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch API keys";
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  createApiKey: async (data: CreateApiKeyRequest) => {
    set({ isLoading: true, error: null });
    try {
      const client = getClient();
      const response = await client.post<CreateApiKeyResponse>(
        "/api-keys",
        data,
      );
      const { apiKeys } = get();
      set({
        apiKeys: [...apiKeys, response.data.apiKey],
        isLoading: false,
      });
      return response.data;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create API key";
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  revokeApiKey: async (keyId: string) => {
    set({ isLoading: true, error: null });
    try {
      const client = getClient();
      await client.delete(`/api-keys/${keyId}`);
      const { apiKeys } = get();
      set({
        apiKeys: apiKeys.filter((k) => k.id !== keyId),
        isLoading: false,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to revoke API key";
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
