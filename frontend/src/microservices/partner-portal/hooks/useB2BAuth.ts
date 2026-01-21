/**
 * B2B Auth Hook
 *
 * Provides authentication state and actions.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import { useCallback } from 'react';
import { useB2BAuthStore } from '../stores/authStore';
import { LoginRequest, RegisterRequest } from '../types';

export function useB2BAuth() {
  const {
    user,
    organization,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
  } = useB2BAuthStore();

  const handleLogin = useCallback(
    async (credentials: LoginRequest) => {
      await login(credentials);
    },
    [login]
  );

  const handleRegister = useCallback(
    async (data: RegisterRequest) => {
      await register(data);
    },
    [register]
  );

  const handleLogout = useCallback(async () => {
    await logout();
  }, [logout]);

  const canManageTeam =
    user?.role === 'owner' || user?.role === 'admin';

  const canManageApiKeys =
    user?.role === 'owner' || user?.role === 'admin';

  const canManageBilling = user?.role === 'owner';

  const canViewUsage =
    user?.role === 'owner' ||
    user?.role === 'admin' ||
    user?.role === 'member';

  return {
    user,
    organization,
    isAuthenticated,
    isLoading,
    error,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    clearError,
    permissions: {
      canManageTeam,
      canManageApiKeys,
      canManageBilling,
      canViewUsage,
    },
  };
}
