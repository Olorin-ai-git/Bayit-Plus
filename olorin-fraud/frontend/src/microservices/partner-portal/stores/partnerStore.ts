/**
 * B2B Partner Store
 *
 * Zustand store for organization, team, and API keys state.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import { create } from 'zustand';
import {
  B2BOrganization,
  TeamMember,
  ApiKey,
  InviteMemberRequest,
  UpdateMemberRequest,
  CreateApiKeyRequest,
  UpdateOrganizationRequest,
  WebhookConfig,
} from '../types';
import * as partnerService from '../services/partnerService';

interface PartnerState {
  organization: B2BOrganization | null;
  teamMembers: TeamMember[];
  apiKeys: ApiKey[];
  isLoading: boolean;
  error: string | null;

  fetchOrganization: () => Promise<void>;
  updateOrganization: (updates: UpdateOrganizationRequest) => Promise<void>;
  configureWebhook: (config: WebhookConfig) => Promise<void>;

  fetchTeamMembers: () => Promise<void>;
  inviteMember: (data: InviteMemberRequest) => Promise<{ temporaryPassword: string }>;
  updateMember: (memberId: string, updates: UpdateMemberRequest) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;

  fetchApiKeys: () => Promise<void>;
  createApiKey: (data: CreateApiKeyRequest) => Promise<{ rawKey: string }>;
  revokeApiKey: (keyId: string) => Promise<void>;

  clearError: () => void;
  reset: () => void;
}

const initialState = {
  organization: null,
  teamMembers: [],
  apiKeys: [],
  isLoading: false,
  error: null,
};

export const usePartnerStore = create<PartnerState>((set, get) => ({
  ...initialState,

  fetchOrganization: async () => {
    set({ isLoading: true, error: null });
    try {
      const organization = await partnerService.getOrganization();
      set({ organization, isLoading: false });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch organization';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  updateOrganization: async (updates: UpdateOrganizationRequest) => {
    set({ isLoading: true, error: null });
    try {
      const organization = await partnerService.updateOrganization(updates);
      set({ organization, isLoading: false });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to update organization';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  configureWebhook: async (config: WebhookConfig) => {
    set({ isLoading: true, error: null });
    try {
      const organization = await partnerService.configureWebhook(config);
      set({ organization, isLoading: false });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to configure webhook';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  fetchTeamMembers: async () => {
    set({ isLoading: true, error: null });
    try {
      const teamMembers = await partnerService.getTeamMembers();
      set({ teamMembers, isLoading: false });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to fetch team members';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  inviteMember: async (data: InviteMemberRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await partnerService.inviteMember(data);
      set((state) => ({
        teamMembers: [...state.teamMembers, response.member],
        isLoading: false,
      }));
      return { temporaryPassword: response.temporaryPassword };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to invite member';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  updateMember: async (memberId: string, updates: UpdateMemberRequest) => {
    set({ isLoading: true, error: null });
    try {
      const updatedMember = await partnerService.updateMember(memberId, updates);
      set((state) => ({
        teamMembers: state.teamMembers.map((member) =>
          member.id === memberId ? updatedMember : member
        ),
        isLoading: false,
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update member';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  removeMember: async (memberId: string) => {
    set({ isLoading: true, error: null });
    try {
      await partnerService.removeMember(memberId);
      set((state) => ({
        teamMembers: state.teamMembers.filter((member) => member.id !== memberId),
        isLoading: false,
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to remove member';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  fetchApiKeys: async () => {
    set({ isLoading: true, error: null });
    try {
      const apiKeys = await partnerService.getApiKeys();
      set({ apiKeys, isLoading: false });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch API keys';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  createApiKey: async (data: CreateApiKeyRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await partnerService.createApiKey(data);
      set((state) => ({
        apiKeys: [...state.apiKeys, response.apiKey],
        isLoading: false,
      }));
      return { rawKey: response.rawKey };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create API key';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  revokeApiKey: async (keyId: string) => {
    set({ isLoading: true, error: null });
    try {
      await partnerService.revokeApiKey(keyId);
      set((state) => ({
        apiKeys: state.apiKeys.filter((key) => key.id !== keyId),
        isLoading: false,
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to revoke API key';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),

  reset: () => set(initialState),
}));

export const useOrganization = () =>
  usePartnerStore((state) => state.organization);

export const useTeamMembers = () =>
  usePartnerStore((state) => state.teamMembers);

export const useApiKeys = () => usePartnerStore((state) => state.apiKeys);

export const usePartnerLoading = () =>
  usePartnerStore((state) => state.isLoading);

export const usePartnerError = () => usePartnerStore((state) => state.error);
