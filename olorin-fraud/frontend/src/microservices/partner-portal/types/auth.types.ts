/**
 * B2B Authentication Types
 *
 * Type definitions for B2B partner authentication.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

export type B2BUserRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface B2BUser {
  id: string;
  email: string;
  name: string;
  role: B2BUserRole;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  isActive: boolean;
}

export interface B2BOrganization {
  id: string;
  orgId: string;
  name: string;
  contactEmail: string;
  logoUrl: string | null;
  webhookUrl: string | null;
  webhookEvents: string[];
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  user: B2BUser;
  organization: B2BOrganization;
}

export interface RegisterOrgRequest {
  orgId: string;
  name: string;
  contactEmail: string;
}

export interface RegisterOwnerRequest {
  name: string;
  email: string;
  password: string;
}

export interface RegisterRequest {
  organization: RegisterOrgRequest;
  owner: RegisterOwnerRequest;
}

export interface RegisterResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  user: B2BUser;
  organization: B2BOrganization;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface AuthError {
  code: string;
  message: string;
  details?: Record<string, string>;
}
