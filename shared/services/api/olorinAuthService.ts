/**
 * Olorin Auth Service Integration
 *
 * Centralized authentication via auth.olorin.ai
 * Replaces local auth endpoints with auth service calls
 */

import axios from 'axios';
import { isWebPlatform } from '../../utils/storage';

// Auth service configuration
const AUTH_SERVICE_URL = process.env.VITE_AUTH_SERVICE_URL ||
                         process.env.EXPO_PUBLIC_AUTH_SERVICE_URL ||
                         'https://auth.olorin.ai';

const TENANT_ID = 'bayit_plus';

// Create dedicated axios instance for auth service
const authClient = axios.create({
  baseURL: `${AUTH_SERVICE_URL}/api/v1`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface RegisterRequest {
  email: string;
  name: string;
  password: string;
  tenant_id?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  tenant_id?: string;
  device_id?: string;
  device_name?: string;
}

export interface GoogleAuthRequest {
  provider: 'google';
  id_token: string;
  tenant_id?: string;
  device_id?: string;
  device_name?: string;
}

export interface AuthResponse {
  user_id: string;
  email: string;
  name: string;
  avatar?: string;
  role: string;
  permissions: string[];
  tenant_id: string;
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface RefreshRequest {
  refresh_token: string;
  tenant_id?: string;
}

/**
 * Olorin Auth Service Client
 */
export const olorinAuthService = {
  /**
   * Register new user
   */
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await authClient.post('/auth/register', {
      ...data,
      tenant_id: data.tenant_id || TENANT_ID,
    });
    return response.data;
  },

  /**
   * Login with email and password
   */
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await authClient.post('/auth/login', {
      ...data,
      tenant_id: data.tenant_id || TENANT_ID,
    });
    return response.data;
  },

  /**
   * Login with Google OAuth
   *
   * For web: Use Google Sign-In button to get id_token
   * For mobile: Use Google Sign-In SDK to get id_token
   */
  loginWithGoogle: async (idToken: string, deviceId?: string): Promise<AuthResponse> => {
    const response = await authClient.post('/auth/login/google', {
      provider: 'google',
      id_token: idToken,
      tenant_id: TENANT_ID,
      device_id: deviceId,
      device_name: isWebPlatform() ? 'Web Browser' : 'Mobile App',
    });
    return response.data;
  },

  /**
   * Login with Apple Sign In
   */
  loginWithApple: async (idToken: string, deviceId?: string): Promise<AuthResponse> => {
    const response = await authClient.post('/auth/login/apple', {
      provider: 'apple',
      id_token: idToken,
      tenant_id: TENANT_ID,
      device_id: deviceId,
    });
    return response.data;
  },

  /**
   * Refresh access token
   */
  refreshToken: async (refreshToken: string): Promise<AuthResponse> => {
    const response = await authClient.post('/token/refresh', {
      refresh_token: refreshToken,
      tenant_id: TENANT_ID,
    });
    return response.data;
  },

  /**
   * Logout (revoke tokens)
   */
  logout: async (accessToken: string, refreshToken?: string, revokeAll?: boolean) => {
    const response = await authClient.post(
      '/auth/logout',
      {
        refresh_token: refreshToken,
        revoke_all_devices: revokeAll || false,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    return response.data;
  },

  /**
   * Get current user profile
   */
  getProfile: async (accessToken: string) => {
    const response = await authClient.get('/account/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  /**
   * Update user profile
   */
  updateProfile: async (accessToken: string, data: { name?: string; avatar?: string; phone_number?: string }) => {
    const response = await authClient.patch('/account/profile', data, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  /**
   * Change password
   */
  changePassword: async (accessToken: string, currentPassword: string, newPassword: string) => {
    const response = await authClient.post(
      '/account/change-password',
      {
        current_password: currentPassword,
        new_password: newPassword,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    return response.data;
  },

  /**
   * Request password reset email
   */
  requestPasswordReset: async (email: string) => {
    const response = await authClient.post('/auth/password-reset/request', {
      email,
      tenant_id: TENANT_ID,
    });
    return response.data;
  },

  /**
   * Confirm password reset with token
   */
  confirmPasswordReset: async (token: string, newPassword: string) => {
    const response = await authClient.post('/auth/password-reset/confirm', {
      token,
      new_password: newPassword,
      tenant_id: TENANT_ID,
    });
    return response.data;
  },

  /**
   * Get JWKS (public key for token verification)
   */
  getJWKS: async () => {
    const response = await axios.get(`${AUTH_SERVICE_URL}/.well-known/jwks.json`);
    return response.data;
  },
};

/**
 * Export for backward compatibility with existing code
 */
export const authService = olorinAuthService;
