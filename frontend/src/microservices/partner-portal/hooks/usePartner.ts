/**
 * Partner Hook
 *
 * Provides partner organization and team management.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import { useCallback, useEffect } from 'react';
import { usePartnerStore } from '../stores/partnerStore';
import { useB2BAuthStore } from '../stores/authStore';
import {
  InviteMemberRequest,
  UpdateMemberRequest,
  CreateApiKeyRequest,
  UpdateOrganizationRequest,
  WebhookConfig,
} from '../types';

export function usePartner() {
  const {
    organization,
    teamMembers,
    apiKeys,
    isLoading,
    error,
    fetchOrganization,
    updateOrganization,
    configureWebhook,
    fetchTeamMembers,
    inviteMember,
    updateMember,
    removeMember,
    fetchApiKeys,
    createApiKey,
    revokeApiKey,
    clearError,
  } = usePartnerStore();

  const { isAuthenticated, user } = useB2BAuthStore();

  useEffect(() => {
    if (isAuthenticated && !organization) {
      fetchOrganization().catch(console.error);
    }
  }, [isAuthenticated, organization, fetchOrganization]);

  const handleUpdateOrganization = useCallback(
    async (updates: UpdateOrganizationRequest) => {
      await updateOrganization(updates);
    },
    [updateOrganization]
  );

  const handleConfigureWebhook = useCallback(
    async (config: WebhookConfig) => {
      await configureWebhook(config);
    },
    [configureWebhook]
  );

  const handleInviteMember = useCallback(
    async (data: InviteMemberRequest) => {
      return await inviteMember(data);
    },
    [inviteMember]
  );

  const handleUpdateMember = useCallback(
    async (memberId: string, updates: UpdateMemberRequest) => {
      await updateMember(memberId, updates);
    },
    [updateMember]
  );

  const handleRemoveMember = useCallback(
    async (memberId: string) => {
      if (memberId === user?.id) {
        throw new Error('Cannot remove yourself');
      }
      await removeMember(memberId);
    },
    [removeMember, user]
  );

  const handleCreateApiKey = useCallback(
    async (data: CreateApiKeyRequest) => {
      return await createApiKey(data);
    },
    [createApiKey]
  );

  const handleRevokeApiKey = useCallback(
    async (keyId: string) => {
      await revokeApiKey(keyId);
    },
    [revokeApiKey]
  );

  return {
    organization,
    teamMembers,
    apiKeys,
    isLoading,
    error,
    fetchOrganization,
    updateOrganization: handleUpdateOrganization,
    configureWebhook: handleConfigureWebhook,
    fetchTeamMembers,
    inviteMember: handleInviteMember,
    updateMember: handleUpdateMember,
    removeMember: handleRemoveMember,
    fetchApiKeys,
    createApiKey: handleCreateApiKey,
    revokeApiKey: handleRevokeApiKey,
    clearError,
  };
}
