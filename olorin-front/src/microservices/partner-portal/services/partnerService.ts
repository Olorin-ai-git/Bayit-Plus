/**
 * B2B Partner Service
 *
 * Handles partner organization, team, and API key operations.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import { b2bGet, b2bPost, b2bPut, b2bDelete } from './b2bApiClient';
import {
  B2BOrganization,
  TeamMember,
  ApiKey,
  InviteMemberRequest,
  InviteMemberResponse,
  UpdateMemberRequest,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  UpdateOrganizationRequest,
  WebhookConfig,
  WebhookEvent,
} from '../types';

const PARTNER_ENDPOINTS = {
  ORGANIZATION: '/partner/me',
  WEBHOOK: '/partner/me/webhook',
  TEAM: '/partner/me/team',
  API_KEYS: '/partner/api-keys',
  WEBHOOK_EVENTS: '/partner/webhook-events',
} as const;

export async function getOrganization(): Promise<B2BOrganization> {
  const response = await b2bGet<B2BOrganization>(PARTNER_ENDPOINTS.ORGANIZATION);
  return response.data;
}

export async function updateOrganization(
  updates: UpdateOrganizationRequest
): Promise<B2BOrganization> {
  const response = await b2bPut<B2BOrganization>(
    PARTNER_ENDPOINTS.ORGANIZATION,
    updates
  );
  return response.data;
}

export async function configureWebhook(
  config: WebhookConfig
): Promise<B2BOrganization> {
  const response = await b2bPost<B2BOrganization>(
    PARTNER_ENDPOINTS.WEBHOOK,
    config
  );
  return response.data;
}

export async function getWebhookEvents(): Promise<WebhookEvent[]> {
  const response = await b2bGet<WebhookEvent[]>(PARTNER_ENDPOINTS.WEBHOOK_EVENTS);
  return response.data;
}

export async function getTeamMembers(): Promise<TeamMember[]> {
  const response = await b2bGet<TeamMember[]>(PARTNER_ENDPOINTS.TEAM);
  return response.data;
}

export async function inviteMember(
  data: InviteMemberRequest
): Promise<InviteMemberResponse> {
  const response = await b2bPost<InviteMemberResponse>(
    PARTNER_ENDPOINTS.TEAM,
    data
  );
  return response.data;
}

export async function updateMember(
  memberId: string,
  updates: UpdateMemberRequest
): Promise<TeamMember> {
  const response = await b2bPut<TeamMember>(
    `${PARTNER_ENDPOINTS.TEAM}/${memberId}`,
    updates
  );
  return response.data;
}

export async function removeMember(memberId: string): Promise<void> {
  await b2bDelete(`${PARTNER_ENDPOINTS.TEAM}/${memberId}`);
}

export async function getApiKeys(): Promise<ApiKey[]> {
  const response = await b2bGet<ApiKey[]>(PARTNER_ENDPOINTS.API_KEYS);
  return response.data;
}

export async function createApiKey(
  data: CreateApiKeyRequest
): Promise<CreateApiKeyResponse> {
  const response = await b2bPost<CreateApiKeyResponse>(
    PARTNER_ENDPOINTS.API_KEYS,
    data
  );
  return response.data;
}

export async function revokeApiKey(keyId: string): Promise<void> {
  await b2bDelete(`${PARTNER_ENDPOINTS.API_KEYS}/${keyId}`);
}
