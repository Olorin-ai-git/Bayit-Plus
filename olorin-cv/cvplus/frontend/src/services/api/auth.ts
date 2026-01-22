/**
 * Authentication API Methods
 * Endpoints for user authentication and token management
 */

import { apiClient } from './client';
import { AuthResponse, UserInfo } from './types';

export const authAPI = {
  register: async (email: string, password: string, fullName: string): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/auth/register', {
      email,
      password,
      full_name: fullName,
    });
    return data;
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', {
      email,
      password,
    });
    return data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  getCurrentUser: async (): Promise<UserInfo> => {
    const { data } = await apiClient.get<UserInfo>('/auth/me');
    return data;
  },

  refreshToken: async (): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/auth/refresh');
    return data;
  },
};
