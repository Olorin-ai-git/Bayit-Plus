/**
 * B2B Authentication Service
 *
 * Handles B2B partner authentication operations.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import { b2bPost, b2bGet, getB2BApiClient } from './b2bApiClient';
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  B2BUser,
} from '../types';

const AUTH_ENDPOINTS = {
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  REFRESH: '/auth/refresh',
  LOGOUT: '/auth/logout',
  ME: '/auth/me',
} as const;

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const response = await b2bPost<LoginResponse>(
    AUTH_ENDPOINTS.LOGIN,
    credentials
  );
  return response.data;
}

export async function register(
  data: RegisterRequest
): Promise<RegisterResponse> {
  const response = await b2bPost<RegisterResponse>(
    AUTH_ENDPOINTS.REGISTER,
    data
  );
  return response.data;
}

export async function refreshToken(
  refreshTokenValue: string
): Promise<RefreshTokenResponse> {
  const client = getB2BApiClient();
  const response = await client.post<RefreshTokenResponse>(
    AUTH_ENDPOINTS.REFRESH,
    { refreshToken: refreshTokenValue } as RefreshTokenRequest,
    {
      headers: {
        Authorization: undefined,
      },
    }
  );
  return response.data;
}

export async function logout(): Promise<void> {
  await b2bPost(AUTH_ENDPOINTS.LOGOUT);
}

export async function getCurrentUser(): Promise<B2BUser> {
  const response = await b2bGet<B2BUser>(AUTH_ENDPOINTS.ME);
  return response.data;
}
