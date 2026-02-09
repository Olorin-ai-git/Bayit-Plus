/**
 * Test suite for shared authStore (Zustand)
 * Tests RBAC helpers, passkey session, verification helpers,
 * and store state transitions.
 */

import { useAuthStore } from '@bayit/shared-stores/authStore';
import { ROLE_PERMISSIONS } from '@bayit/shared/types/rbac';

// Mock the shared services
jest.mock('@bayit/shared/services/api', () => ({
  authService: {
    login: jest.fn(),
    register: jest.fn(),
    getGoogleAuthUrl: jest.fn(),
    googleCallback: jest.fn(),
    refreshToken: jest.fn(),
  },
}));

jest.mock('@bayit/shared/utils/storage', () => ({
  getPlatformStorage: () => ({
    getItem: jest.fn().mockReturnValue(null),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  }),
  isWebPlatform: () => true,
}));

const { authService } = require('@bayit/shared/services/api');

// Helper to reset store between tests
function resetStore() {
  useAuthStore.setState({
    user: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    isHydrated: true,
    refreshTimeout: null,
    passkeySessionToken: null,
    passkeySessionExpires: null,
  });
}

describe('authStore', () => {
  beforeEach(() => {
    resetStore();
    jest.clearAllMocks();
  });

  // MARK: - Initial State

  describe('initial state', () => {
    it('starts unauthenticated', () => {
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
    });

    it('starts with no error', () => {
      expect(useAuthStore.getState().error).toBeNull();
    });

    it('starts with no passkey session', () => {
      const state = useAuthStore.getState();
      expect(state.passkeySessionToken).toBeNull();
      expect(state.passkeySessionExpires).toBeNull();
    });
  });

  // MARK: - Login

  describe('login', () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@bayit.tv',
      name: 'Test User',
      is_active: true,
      role: 'user' as const,
    };

    it('sets authenticated state on success', async () => {
      authService.login.mockResolvedValue({
        user: mockUser,
        access_token: 'jwt-token',
        refresh_token: 'refresh-token',
      });

      await useAuthStore.getState().login('test@bayit.tv', 'password');

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockUser);
      expect(state.token).toBe('jwt-token');
      expect(state.refreshToken).toBe('refresh-token');
      expect(state.isLoading).toBe(false);
    });

    it('sets error on failure', async () => {
      authService.login.mockRejectedValue({
        detail: 'Invalid credentials',
      });

      await expect(
        useAuthStore.getState().login('bad@email.com', 'wrong')
      ).rejects.toBeDefined();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe('Invalid credentials');
      expect(state.isLoading).toBe(false);
    });

    it('sets isLoading during login', async () => {
      let resolveLogin: (value: any) => void;
      authService.login.mockReturnValue(
        new Promise((resolve) => {
          resolveLogin = resolve;
        })
      );

      const loginPromise = useAuthStore.getState().login('test@bayit.tv', 'pass');
      expect(useAuthStore.getState().isLoading).toBe(true);

      resolveLogin!({ user: mockUser, access_token: 'tok' });
      await loginPromise;

      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  // MARK: - Logout

  describe('logout', () => {
    it('clears all auth state', () => {
      useAuthStore.setState({
        user: { id: 'u1', email: 'a@b.com', name: 'A', is_active: true, role: 'user' },
        token: 'tok',
        refreshToken: 'ref',
        isAuthenticated: true,
        passkeySessionToken: 'passkey-tok',
        passkeySessionExpires: '2026-12-31',
      });

      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.passkeySessionToken).toBeNull();
      expect(state.passkeySessionExpires).toBeNull();
    });
  });

  // MARK: - setUser

  describe('setUser', () => {
    it('sets user and marks authenticated', () => {
      const user = { id: 'u1', email: 'a@b.com', name: 'Test', is_active: true, role: 'user' as const };
      useAuthStore.getState().setUser(user);

      expect(useAuthStore.getState().user).toEqual(user);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it('clears authentication when user set to null', () => {
      useAuthStore.setState({ user: { id: 'u1', email: 'a@b.com', name: 'T', is_active: true, role: 'user' }, isAuthenticated: true });
      useAuthStore.getState().setUser(null);

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  // MARK: - clearError

  describe('clearError', () => {
    it('clears error state', () => {
      useAuthStore.setState({ error: 'Something went wrong' });
      useAuthStore.getState().clearError();
      expect(useAuthStore.getState().error).toBeNull();
    });
  });

  // MARK: - RBAC Helpers

  describe('RBAC helpers', () => {
    describe('isAdmin', () => {
      it('returns true for super_admin', () => {
        useAuthStore.setState({
          user: { id: 'u1', email: 'a@b.com', name: 'Admin', is_active: true, role: 'super_admin' },
        });
        expect(useAuthStore.getState().isAdmin()).toBe(true);
      });

      it('returns true for admin role', () => {
        useAuthStore.setState({
          user: { id: 'u1', email: 'a@b.com', name: 'Admin', is_active: true, role: 'admin' },
        });
        expect(useAuthStore.getState().isAdmin()).toBe(true);
      });

      it('returns true for content_manager', () => {
        useAuthStore.setState({
          user: { id: 'u1', email: 'a@b.com', name: 'CM', is_active: true, role: 'content_manager' },
        });
        expect(useAuthStore.getState().isAdmin()).toBe(true);
      });

      it('returns true for billing_admin', () => {
        useAuthStore.setState({
          user: { id: 'u1', email: 'a@b.com', name: 'BA', is_active: true, role: 'billing_admin' },
        });
        expect(useAuthStore.getState().isAdmin()).toBe(true);
      });

      it('returns true for support', () => {
        useAuthStore.setState({
          user: { id: 'u1', email: 'a@b.com', name: 'S', is_active: true, role: 'support' },
        });
        expect(useAuthStore.getState().isAdmin()).toBe(true);
      });

      it('returns false for user role', () => {
        useAuthStore.setState({
          user: { id: 'u1', email: 'a@b.com', name: 'U', is_active: true, role: 'user' },
        });
        expect(useAuthStore.getState().isAdmin()).toBe(false);
      });

      it('returns false for viewer role', () => {
        useAuthStore.setState({
          user: { id: 'u1', email: 'a@b.com', name: 'V', is_active: true, role: 'viewer' },
        });
        expect(useAuthStore.getState().isAdmin()).toBe(false);
      });

      it('returns false when no user', () => {
        expect(useAuthStore.getState().isAdmin()).toBe(false);
      });
    });

    describe('getPermissions', () => {
      it('returns role permissions for admin', () => {
        useAuthStore.setState({
          user: { id: 'u1', email: 'a@b.com', name: 'A', is_active: true, role: 'admin' },
        });
        const perms = useAuthStore.getState().getPermissions();
        expect(perms).toEqual(expect.arrayContaining(ROLE_PERMISSIONS.admin));
      });

      it('returns empty for user role with no custom permissions', () => {
        useAuthStore.setState({
          user: { id: 'u1', email: 'a@b.com', name: 'U', is_active: true, role: 'user' },
        });
        expect(useAuthStore.getState().getPermissions()).toEqual([]);
      });

      it('merges custom permissions with role permissions', () => {
        useAuthStore.setState({
          user: {
            id: 'u1', email: 'a@b.com', name: 'U', is_active: true,
            role: 'user',
            permissions: ['content:read'],
          },
        });
        const perms = useAuthStore.getState().getPermissions();
        expect(perms).toContain('content:read');
      });

      it('deduplicates permissions', () => {
        useAuthStore.setState({
          user: {
            id: 'u1', email: 'a@b.com', name: 'S', is_active: true,
            role: 'support',
            permissions: ['users:read'], // Already in support role
          },
        });
        const perms = useAuthStore.getState().getPermissions();
        const usersReadCount = perms.filter((p: string) => p === 'users:read').length;
        expect(usersReadCount).toBe(1);
      });

      it('returns empty when no user', () => {
        expect(useAuthStore.getState().getPermissions()).toEqual([]);
      });
    });

    describe('hasPermission', () => {
      it('returns true when user has permission via role', () => {
        useAuthStore.setState({
          user: { id: 'u1', email: 'a@b.com', name: 'A', is_active: true, role: 'admin' },
        });
        expect(useAuthStore.getState().hasPermission('users:read')).toBe(true);
      });

      it('returns false when user lacks permission', () => {
        useAuthStore.setState({
          user: { id: 'u1', email: 'a@b.com', name: 'U', is_active: true, role: 'user' },
        });
        expect(useAuthStore.getState().hasPermission('users:delete')).toBe(false);
      });
    });

    describe('hasAnyPermission', () => {
      it('returns true when at least one matches', () => {
        useAuthStore.setState({
          user: { id: 'u1', email: 'a@b.com', name: 'S', is_active: true, role: 'support' },
        });
        expect(
          useAuthStore.getState().hasAnyPermission(['users:delete', 'users:read'])
        ).toBe(true);
      });

      it('returns false when none match', () => {
        useAuthStore.setState({
          user: { id: 'u1', email: 'a@b.com', name: 'U', is_active: true, role: 'user' },
        });
        expect(
          useAuthStore.getState().hasAnyPermission(['users:delete', 'system:config'])
        ).toBe(false);
      });
    });

    describe('hasAllPermissions', () => {
      it('returns true when all match', () => {
        useAuthStore.setState({
          user: { id: 'u1', email: 'a@b.com', name: 'A', is_active: true, role: 'admin' },
        });
        expect(
          useAuthStore.getState().hasAllPermissions(['users:read', 'content:read'])
        ).toBe(true);
      });

      it('returns false when one is missing', () => {
        useAuthStore.setState({
          user: { id: 'u1', email: 'a@b.com', name: 'S', is_active: true, role: 'support' },
        });
        expect(
          useAuthStore.getState().hasAllPermissions(['users:read', 'users:delete'])
        ).toBe(false);
      });
    });
  });

  // MARK: - Passkey Session

  describe('passkey session', () => {
    it('sets passkey session', () => {
      useAuthStore.getState().setPasskeySession('pk-token', '2026-12-31T23:59:59Z');

      const state = useAuthStore.getState();
      expect(state.passkeySessionToken).toBe('pk-token');
      expect(state.passkeySessionExpires).toBe('2026-12-31T23:59:59Z');
    });

    it('clears passkey session', () => {
      useAuthStore.setState({
        passkeySessionToken: 'pk-token',
        passkeySessionExpires: '2026-12-31',
      });

      useAuthStore.getState().clearPasskeySession();

      expect(useAuthStore.getState().passkeySessionToken).toBeNull();
      expect(useAuthStore.getState().passkeySessionExpires).toBeNull();
    });

    it('hasPasskeyAccess returns true for valid session', () => {
      const futureDate = new Date(Date.now() + 3600000).toISOString();
      useAuthStore.setState({
        passkeySessionToken: 'pk-token',
        passkeySessionExpires: futureDate,
      });

      expect(useAuthStore.getState().hasPasskeyAccess()).toBe(true);
    });

    it('hasPasskeyAccess returns false for expired session', () => {
      useAuthStore.setState({
        passkeySessionToken: 'pk-token',
        passkeySessionExpires: '2020-01-01T00:00:00Z',
      });

      expect(useAuthStore.getState().hasPasskeyAccess()).toBe(false);
    });

    it('hasPasskeyAccess returns false when no session', () => {
      expect(useAuthStore.getState().hasPasskeyAccess()).toBe(false);
    });
  });

  // MARK: - Verification Helpers

  describe('verification helpers', () => {
    it('isVerified returns true for verified user', () => {
      useAuthStore.setState({
        user: { id: 'u1', email: 'a@b.com', name: 'V', is_active: true, role: 'user', is_verified: true },
      });
      expect(useAuthStore.getState().isVerified()).toBe(true);
    });

    it('isVerified returns false for unverified user', () => {
      useAuthStore.setState({
        user: { id: 'u1', email: 'a@b.com', name: 'U', is_active: true, role: 'user', is_verified: false },
      });
      expect(useAuthStore.getState().isVerified()).toBe(false);
    });

    it('isVerified returns true for admin (always verified)', () => {
      useAuthStore.setState({
        user: { id: 'u1', email: 'a@b.com', name: 'A', is_active: true, role: 'admin', is_verified: false },
      });
      expect(useAuthStore.getState().isVerified()).toBe(true);
    });

    it('needsVerification returns true for unverified non-admin', () => {
      useAuthStore.setState({
        user: { id: 'u1', email: 'a@b.com', name: 'U', is_active: true, role: 'user', is_verified: false },
      });
      expect(useAuthStore.getState().needsVerification()).toBe(true);
    });

    it('needsVerification returns false for admin', () => {
      useAuthStore.setState({
        user: { id: 'u1', email: 'a@b.com', name: 'A', is_active: true, role: 'admin' },
      });
      expect(useAuthStore.getState().needsVerification()).toBe(false);
    });

    it('canWatchVOD returns true for verified user with subscription', () => {
      useAuthStore.setState({
        user: {
          id: 'u1', email: 'a@b.com', name: 'U', is_active: true,
          role: 'user', is_verified: true,
          subscription: { plan: 'premium', status: 'active' },
        },
      });
      expect(useAuthStore.getState().canWatchVOD()).toBe(true);
    });

    it('canWatchVOD returns false for unverified user', () => {
      useAuthStore.setState({
        user: {
          id: 'u1', email: 'a@b.com', name: 'U', is_active: true,
          role: 'user', is_verified: false,
          subscription: { plan: 'premium', status: 'active' },
        },
      });
      expect(useAuthStore.getState().canWatchVOD()).toBe(false);
    });

    it('canWatchVOD returns true for admin regardless', () => {
      useAuthStore.setState({
        user: { id: 'u1', email: 'a@b.com', name: 'A', is_active: true, role: 'admin' },
      });
      expect(useAuthStore.getState().canWatchVOD()).toBe(true);
    });

    it('isPremium returns true for premium plan', () => {
      useAuthStore.setState({
        user: {
          id: 'u1', email: 'a@b.com', name: 'P', is_active: true,
          role: 'user', is_verified: true,
          subscription: { plan: 'premium', status: 'active' },
        },
      });
      expect(useAuthStore.getState().isPremium()).toBe(true);
    });

    it('isPremium returns true for family plan', () => {
      useAuthStore.setState({
        user: {
          id: 'u1', email: 'a@b.com', name: 'F', is_active: true,
          role: 'user', is_verified: true,
          subscription: { plan: 'family', status: 'active' },
        },
      });
      expect(useAuthStore.getState().isPremium()).toBe(true);
    });

    it('isPremium returns false for basic plan', () => {
      useAuthStore.setState({
        user: {
          id: 'u1', email: 'a@b.com', name: 'B', is_active: true,
          role: 'user', is_verified: true,
          subscription: { plan: 'basic', status: 'active' },
        },
      });
      expect(useAuthStore.getState().isPremium()).toBe(false);
    });

    it('canCreateWidgets returns true for premium verified user', () => {
      useAuthStore.setState({
        user: {
          id: 'u1', email: 'a@b.com', name: 'P', is_active: true,
          role: 'user', is_verified: true,
          subscription: { plan: 'premium', status: 'active' },
        },
      });
      expect(useAuthStore.getState().canCreateWidgets()).toBe(true);
    });

    it('canCreateWidgets returns false for basic plan', () => {
      useAuthStore.setState({
        user: {
          id: 'u1', email: 'a@b.com', name: 'B', is_active: true,
          role: 'user', is_verified: true,
          subscription: { plan: 'basic', status: 'active' },
        },
      });
      expect(useAuthStore.getState().canCreateWidgets()).toBe(false);
    });
  });

  // MARK: - Token Refresh

  describe('refreshAccessToken', () => {
    it('logs out when no refresh token', async () => {
      useAuthStore.setState({ isAuthenticated: true, refreshToken: null });
      const result = await useAuthStore.getState().refreshAccessToken();

      expect(result).toBe(false);
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('updates tokens on successful refresh', async () => {
      useAuthStore.setState({
        isAuthenticated: true,
        token: 'old-token',
        refreshToken: 'refresh-tok',
        user: { id: 'u1', email: 'a@b.com', name: 'U', is_active: true, role: 'user' },
      });

      authService.refreshToken.mockResolvedValue({
        access_token: 'new-token',
        refresh_token: 'new-refresh',
      });

      const result = await useAuthStore.getState().refreshAccessToken();

      expect(result).toBe(true);
      expect(useAuthStore.getState().token).toBe('new-token');
      expect(useAuthStore.getState().refreshToken).toBe('new-refresh');
    });

    it('logs out on refresh failure', async () => {
      useAuthStore.setState({
        isAuthenticated: true,
        token: 'old-token',
        refreshToken: 'refresh-tok',
      });

      authService.refreshToken.mockRejectedValue(new Error('Token expired'));

      const result = await useAuthStore.getState().refreshAccessToken();

      expect(result).toBe(false);
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });
});
