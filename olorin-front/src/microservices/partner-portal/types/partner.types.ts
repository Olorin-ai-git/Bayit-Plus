/**
 * B2B Partner Types
 *
 * Type definitions for B2B partner organization, team, and API keys.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import { B2BUserRole } from './auth.types';

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: B2BUserRole;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  isActive: boolean;
  invitedBy: string | null;
}

export interface InviteMemberRequest {
  email: string;
  name: string;
  role: B2BUserRole;
}

export interface InviteMemberResponse {
  member: TeamMember;
  temporaryPassword: string;
}

export interface UpdateMemberRequest {
  role?: B2BUserRole;
  isActive?: boolean;
}

export type ApiKeyScope = 'fraud' | 'content' | 'all';

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: ApiKeyScope[];
  organizationId: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  isActive: boolean;
}

export interface CreateApiKeyRequest {
  name: string;
  scopes: ApiKeyScope[];
  expiresInDays?: number;
}

export interface CreateApiKeyResponse {
  apiKey: ApiKey;
  rawKey: string;
}

export interface WebhookConfig {
  url: string;
  events: string[];
  secret?: string;
}

export interface UpdateOrganizationRequest {
  name?: string;
  contactEmail?: string;
  logoUrl?: string;
}

export interface WebhookEvent {
  id: string;
  name: string;
  description: string;
  category: string;
}
