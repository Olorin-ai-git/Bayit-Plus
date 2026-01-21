import { act, renderHook } from '@testing-library/react-hooks';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../authStore';
import { authService } from '../../services/api';
import type { Role, Permission } from '../../types/rbac';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock auth service
jest.mock('../../services/api', () => ({
  authService: {
    login: jest.fn(),
    register: jest.fn(),
    getGoogleAuthUrl: jest.fn(),
    googleCallback: jest.fn(),
  },
}));

// Mock Platform
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'web',
  select: jest.fn((obj) => obj.web),
}));

describe('AuthStore', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Reset store state
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });

    // Mock AsyncStorage getItem to return null (no stored data)
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useAuthStore());

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Login', () => {
    it('should login successfully', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        is_active: true,
        role: 'user' as Role,
      };

      const mockResponse = {
        user: mockUser,
        access_token: 'mock-token-123',
      };

      (authService.login as jest.Mock).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      expect(authService.login).toHaveBeenCalledWith(
        'test@example.com',
        'password123'
      );
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.token).toBe('mock-token-123');
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle login errors', async () => {
      const mockError = {
        detail: 'Invalid credentials',
      };

      (authService.login as jest.Mock).mockRejectedValue(mockError);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        try {
          await result.current.login('wrong@example.com', 'wrongpass');
        } catch (error) {
          // Expected error
        }
      });

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Invalid credentials');
    });

    it('should set loading state during login', async () => {
      (authService.login as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.login('test@example.com', 'password');
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 150));
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Register', () => {
    it('should register successfully', async () => {
      const mockUser = {
        id: 'user-2',
        email: 'new@example.com',
        name: 'New User',
        is_active: true,
        role: 'user' as Role,
      };

      const mockResponse = {
        user: mockUser,
        access_token: 'new-token-456',
      };

      (authService.register as jest.Mock).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuthStore());

      const registerData = {
        name: 'New User',
        email: 'new@example.com',
        password: 'password123',
      };

      await act(async () => {
        await result.current.register(registerData);
      });

      expect(authService.register).toHaveBeenCalledWith(registerData);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.token).toBe('new-token-456');
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should handle registration errors', async () => {
      const mockError = {
        detail: 'Email already exists',
      };

      (authService.register as jest.Mock).mockRejectedValue(mockError);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        try {
          await result.current.register({
            name: 'User',
            email: 'exists@example.com',
            password: 'pass',
          });
        } catch (error) {
          // Expected error
        }
      });

      expect(result.current.error).toBe('Email already exists');
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Google OAuth', () => {
    it('should get Google auth URL', async () => {
      const mockResponse = {
        url: 'https://accounts.google.com/oauth',
        state: 'random-state-123',
      };

      (authService.getGoogleAuthUrl as jest.Mock).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuthStore());

      let authUrl;
      await act(async () => {
        authUrl = await result.current.loginWithGoogle();
      });

      expect(authService.getGoogleAuthUrl).toHaveBeenCalled();
      // In tests, Platform.OS is 'web' but window might not be defined
      // So the function returns the URL instead of redirecting
    });

    it('should handle Google callback successfully', async () => {
      const mockUser = {
        id: 'user-3',
        email: 'google@example.com',
        name: 'Google User',
        is_active: true,
        role: 'user' as Role,
      };

      const mockResponse = {
        user: mockUser,
        access_token: 'google-token-789',
      };

      (authService.googleCallback as jest.Mock).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.handleGoogleCallback('auth-code-123', 'state-456');
      });

      expect(authService.googleCallback).toHaveBeenCalledWith(
        'auth-code-123',
        undefined, // redirectUri (mocked environment doesn't have window)
        'state-456'
      );
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.token).toBe('google-token-789');
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should handle Google callback errors', async () => {
      const mockError = {
        detail: 'Invalid authorization code',
      };

      (authService.googleCallback as jest.Mock).mockRejectedValue(mockError);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        try {
          await result.current.handleGoogleCallback('invalid-code');
        } catch (error) {
          // Expected error
        }
      });

      expect(result.current.error).toBe('Invalid authorization code');
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Logout', () => {
    it('should clear user and token on logout', () => {
      const { result } = renderHook(() => useAuthStore());

      // Set authenticated state
      act(() => {
        useAuthStore.setState({
          user: {
            id: 'user-1',
            email: 'test@example.com',
            name: 'Test',
            is_active: true,
            role: 'user',
          },
          token: 'token-123',
          isAuthenticated: true,
        });
      });

      expect(result.current.isAuthenticated).toBe(true);

      act(() => {
        result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Set User', () => {
    it('should set user and update isAuthenticated', () => {
      const { result } = renderHook(() => useAuthStore());

      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test',
        is_active: true,
        role: 'user' as Role,
      };

      act(() => {
        result.current.setUser(mockUser);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should clear user when set to null', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setUser(null);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Clear Error', () => {
    it('should clear error message', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        useAuthStore.setState({ error: 'Some error' });
      });

      expect(result.current.error).toBe('Some error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('RBAC - hasPermission', () => {
    it('should return true if user has permission', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        useAuthStore.setState({
          user: {
            id: 'user-1',
            email: 'admin@example.com',
            name: 'Admin',
            is_active: true,
            role: 'admin',
          },
        });
      });

      // Assuming admin role has 'manage_users' permission
      const hasPermission = result.current.hasPermission('manage_users' as Permission);
      expect(hasPermission).toBe(true);
    });

    it('should return false if user does not have permission', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        useAuthStore.setState({
          user: {
            id: 'user-1',
            email: 'user@example.com',
            name: 'User',
            is_active: true,
            role: 'user',
          },
        });
      });

      // Regular user should not have admin permissions
      const hasPermission = result.current.hasPermission('manage_users' as Permission);
      expect(hasPermission).toBe(false);
    });

    it('should return false if no user is logged in', () => {
      const { result } = renderHook(() => useAuthStore());

      const hasPermission = result.current.hasPermission('view_content' as Permission);
      expect(hasPermission).toBe(false);
    });
  });

  describe('RBAC - hasAnyPermission', () => {
    it('should return true if user has any of the permissions', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        useAuthStore.setState({
          user: {
            id: 'user-1',
            email: 'admin@example.com',
            name: 'Admin',
            is_active: true,
            role: 'admin',
          },
        });
      });

      const hasAny = result.current.hasAnyPermission([
        'manage_users' as Permission,
        'nonexistent_permission' as Permission,
      ]);
      expect(hasAny).toBe(true);
    });

    it('should return false if user has none of the permissions', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        useAuthStore.setState({
          user: {
            id: 'user-1',
            email: 'user@example.com',
            name: 'User',
            is_active: true,
            role: 'user',
          },
        });
      });

      const hasAny = result.current.hasAnyPermission([
        'manage_users' as Permission,
        'manage_billing' as Permission,
      ]);
      expect(hasAny).toBe(false);
    });
  });

  describe('RBAC - hasAllPermissions', () => {
    it('should return true if user has all of the permissions', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        useAuthStore.setState({
          user: {
            id: 'user-1',
            email: 'super@example.com',
            name: 'Super Admin',
            is_active: true,
            role: 'super_admin',
          },
        });
      });

      // Super admin should have all permissions
      const hasAll = result.current.hasAllPermissions([
        'manage_users' as Permission,
        'view_content' as Permission,
      ]);
      expect(hasAll).toBe(true);
    });

    it('should return false if user is missing any permission', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        useAuthStore.setState({
          user: {
            id: 'user-1',
            email: 'user@example.com',
            name: 'User',
            is_active: true,
            role: 'user',
          },
        });
      });

      const hasAll = result.current.hasAllPermissions([
        'view_content' as Permission,
        'manage_users' as Permission,
      ]);
      expect(hasAll).toBe(false);
    });
  });

  describe('RBAC - isAdmin', () => {
    it('should return true for admin roles', () => {
      const adminRoles: Role[] = [
        'super_admin',
        'admin',
        'content_manager',
        'billing_admin',
        'support',
      ];

      adminRoles.forEach((role) => {
        const { result } = renderHook(() => useAuthStore());

        act(() => {
          useAuthStore.setState({
            user: {
              id: 'user-1',
              email: `${role}@example.com`,
              name: role,
              is_active: true,
              role,
            },
          });
        });

        expect(result.current.isAdmin()).toBe(true);
      });
    });

    it('should return false for non-admin roles', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        useAuthStore.setState({
          user: {
            id: 'user-1',
            email: 'user@example.com',
            name: 'User',
            is_active: true,
            role: 'user',
          },
        });
      });

      expect(result.current.isAdmin()).toBe(false);
    });

    it('should return false when no user is logged in', () => {
      const { result } = renderHook(() => useAuthStore());

      expect(result.current.isAdmin()).toBe(false);
    });
  });

  describe('Verification - isVerified', () => {
    it('should return true for verified users', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        useAuthStore.setState({
          user: {
            id: 'user-1',
            email: 'verified@example.com',
            name: 'Verified User',
            is_active: true,
            role: 'user',
            is_verified: true,
          } as any,
        });
      });

      expect(result.current.isVerified()).toBe(true);
    });

    it('should return false for unverified users', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        useAuthStore.setState({
          user: {
            id: 'user-1',
            email: 'unverified@example.com',
            name: 'Unverified User',
            is_active: true,
            role: 'user',
            is_verified: false,
          } as any,
        });
      });

      expect(result.current.isVerified()).toBe(false);
    });

    it('should return true for admin users (always verified)', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        useAuthStore.setState({
          user: {
            id: 'user-1',
            email: 'admin@example.com',
            name: 'Admin',
            is_active: true,
            role: 'admin',
          },
        });
      });

      expect(result.current.isVerified()).toBe(true);
    });

    it('should return false when no user is logged in', () => {
      const { result } = renderHook(() => useAuthStore());

      expect(result.current.isVerified()).toBe(false);
    });
  });

  describe('Verification - needsVerification', () => {
    it('should return true for unverified regular users', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        useAuthStore.setState({
          user: {
            id: 'user-1',
            email: 'user@example.com',
            name: 'User',
            is_active: true,
            role: 'user',
            is_verified: false,
          } as any,
        });
      });

      expect(result.current.needsVerification()).toBe(true);
    });

    it('should return false for verified users', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        useAuthStore.setState({
          user: {
            id: 'user-1',
            email: 'verified@example.com',
            name: 'Verified User',
            is_active: true,
            role: 'user',
            is_verified: true,
          } as any,
        });
      });

      expect(result.current.needsVerification()).toBe(false);
    });

    it('should return false for admin users', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        useAuthStore.setState({
          user: {
            id: 'user-1',
            email: 'admin@example.com',
            name: 'Admin',
            is_active: true,
            role: 'admin',
          },
        });
      });

      expect(result.current.needsVerification()).toBe(false);
    });
  });

  describe('Permission - canWatchVOD', () => {
    it('should return true for verified users with subscription', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        useAuthStore.setState({
          user: {
            id: 'user-1',
            email: 'premium@example.com',
            name: 'Premium User',
            is_active: true,
            role: 'user',
            is_verified: true,
            subscription: {
              plan: 'premium',
              status: 'active',
            },
          } as any,
        });
      });

      expect(result.current.canWatchVOD()).toBe(true);
    });

    it('should return false for unverified users even with subscription', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        useAuthStore.setState({
          user: {
            id: 'user-1',
            email: 'unverified@example.com',
            name: 'User',
            is_active: true,
            role: 'user',
            is_verified: false,
            subscription: {
              plan: 'premium',
              status: 'active',
            },
          } as any,
        });
      });

      expect(result.current.canWatchVOD()).toBe(false);
    });

    it('should return false for verified users without subscription', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        useAuthStore.setState({
          user: {
            id: 'user-1',
            email: 'verified@example.com',
            name: 'Verified User',
            is_active: true,
            role: 'user',
            is_verified: true,
          } as any,
        });
      });

      expect(result.current.canWatchVOD()).toBe(false);
    });

    it('should return true for admin users regardless of subscription', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        useAuthStore.setState({
          user: {
            id: 'user-1',
            email: 'admin@example.com',
            name: 'Admin',
            is_active: true,
            role: 'admin',
          },
        });
      });

      expect(result.current.canWatchVOD()).toBe(true);
    });
  });

  describe('Permission - canCreateWidgets', () => {
    it('should return true for verified users with premium subscription', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        useAuthStore.setState({
          user: {
            id: 'user-1',
            email: 'premium@example.com',
            name: 'Premium User',
            is_active: true,
            role: 'user',
            is_verified: true,
            subscription: {
              plan: 'premium',
              status: 'active',
            },
          } as any,
        });
      });

      expect(result.current.canCreateWidgets()).toBe(true);
    });

    it('should return true for verified users with family subscription', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        useAuthStore.setState({
          user: {
            id: 'user-1',
            email: 'family@example.com',
            name: 'Family User',
            is_active: true,
            role: 'user',
            is_verified: true,
            subscription: {
              plan: 'family',
              status: 'active',
            },
          } as any,
        });
      });

      expect(result.current.canCreateWidgets()).toBe(true);
    });

    it('should return false for verified users with basic subscription', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        useAuthStore.setState({
          user: {
            id: 'user-1',
            email: 'basic@example.com',
            name: 'Basic User',
            is_active: true,
            role: 'user',
            is_verified: true,
            subscription: {
              plan: 'basic',
              status: 'active',
            },
          } as any,
        });
      });

      expect(result.current.canCreateWidgets()).toBe(false);
    });

    it('should return true for admin users regardless of subscription', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        useAuthStore.setState({
          user: {
            id: 'user-1',
            email: 'admin@example.com',
            name: 'Admin',
            is_active: true,
            role: 'admin',
          },
        });
      });

      expect(result.current.canCreateWidgets()).toBe(true);
    });
  });
});
