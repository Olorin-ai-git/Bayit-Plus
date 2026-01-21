/**
 * B2B Partner Store
 *
 * Zustand store for organization, team, and API keys management.
 */

import { create } from 'zustand';
import type {
  B2BOrganization,
  TeamMember,
  ApiKey,
  InviteMemberRequest,
  InviteMemberResponse,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  WebhookConfig,
} from '../types';
import { getB2BApiUrl } from '../config/env';
import { getApiClient } from '../services/api';

interface PartnerState {
  organization: B2BOrganization | null;
  teamMembers: TeamMember[];
  apiKeys: ApiKey[];
  isLoading: boolean;
  error: string | null;

  // Organization Actions
  fetchOrganization: () => Promise<void>;
  updateOrganization: (updates: Partial<B2BOrganization>) => Promise<void>;
  updateWebhook: (config: WebhookConfig) => Promise<void>;

  // Team Actions
  fetchTeamMembers: () => Promise<void>;
  inviteMember: (data: InviteMemberRequest) => Promise<InviteMemberResponse>;
  updateMemberRole: (userId: string, role: string) => Promise<void>;
  removeMember: (userId: string) => Promise<void>;

  // API Key Actions
  fetchApiKeys: () => Promise<void>;
  createApiKey: (data: CreateApiKeyRequest) => Promise<CreateApiKeyResponse>;
  revokeApiKey: (keyId: string) => Promise<void>;

  // Utility
  clearError: () => void;
}

export const usePartnerStore = create<PartnerState>((set, get) => ({
  organization: null,
  teamMembers: [],
  apiKeys: [],
  isLoading: false,
  error: null,

  // Organization Actions
  fetchOrganization: async () => {
    set({ isLoading: true, error: null });

    try {
      const client = getApiClient();
      const response = await client.get<B2BOrganization>(
        getB2BApiUrl('/partner/me')
      );
      set({ organization: response.data, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch organization';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  updateOrganization: async (updates: Partial<B2BOrganization>) => {
    set({ isLoading: true, error: null });

    try {
      const client = getApiClient();
      const response = await client.put<B2BOrganization>(
        getB2BApiUrl('/partner/me'),
        updates
      );
      set({ organization: response.data, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update organization';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  updateWebhook: async (config: WebhookConfig) => {
    set({ isLoading: true, error: null });

    try {
      const client = getApiClient();
      const response = await client.post<B2BOrganization>(
        getB2BApiUrl('/partner/me/webhook'),
        config
      );
      set({ organization: response.data, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update webhook';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  // Team Actions
  fetchTeamMembers: async () => {
    set({ isLoading: true, error: null });

    try {
      const client = getApiClient();
      const response = await client.get<{ members: TeamMember[] }>(
        getB2BApiUrl('/partner/me/team')
      );
      set({ teamMembers: response.data.members, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch team members';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  inviteMember: async (data: InviteMemberRequest) => {
    set({ isLoading: true, error: null });

    try {
      const client = getApiClient();
      const response = await client.post<InviteMemberResponse>(
        getB2BApiUrl('/partner/me/team'),
        data
      );

      const { teamMembers } = get();
      set({
        teamMembers: [...teamMembers, response.data.member],
        isLoading: false,
      });

      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to invite member';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  updateMemberRole: async (userId: string, role: string) => {
    set({ isLoading: true, error: null });

    try {
      const client = getApiClient();
      const response = await client.put<TeamMember>(
        getB2BApiUrl(`/partner/me/team/${userId}`),
        { role }
      );

      const { teamMembers } = get();
      set({
        teamMembers: teamMembers.map((m) =>
          m.id === userId ? response.data : m
        ),
        isLoading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update member role';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  removeMember: async (userId: string) => {
    set({ isLoading: true, error: null });

    try {
      const client = getApiClient();
      await client.delete(getB2BApiUrl(`/partner/me/team/${userId}`));

      const { teamMembers } = get();
      set({
        teamMembers: teamMembers.filter((m) => m.id !== userId),
        isLoading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove member';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  // API Key Actions
  fetchApiKeys: async () => {
    set({ isLoading: true, error: null });

    try {
      const client = getApiClient();
      const response = await client.get<{ apiKeys: ApiKey[] }>(
        getB2BApiUrl('/partner/api-keys')
      );
      set({ apiKeys: response.data.apiKeys, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch API keys';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  createApiKey: async (data: CreateApiKeyRequest) => {
    set({ isLoading: true, error: null });

    try {
      const client = getApiClient();
      const response = await client.post<CreateApiKeyResponse>(
        getB2BApiUrl('/partner/api-keys'),
        data
      );

      const { apiKeys } = get();
      set({
        apiKeys: [...apiKeys, response.data.apiKey],
        isLoading: false,
      });

      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create API key';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  revokeApiKey: async (keyId: string) => {
    set({ isLoading: true, error: null });

    try {
      const client = getApiClient();
      await client.delete(getB2BApiUrl(`/partner/api-keys/${keyId}`));

      const { apiKeys } = get();
      set({
        apiKeys: apiKeys.filter((k) => k.id !== keyId),
        isLoading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to revoke API key';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
