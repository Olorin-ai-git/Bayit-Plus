/**
 * Shared Hooks Stub
 * Temporary implementation until monorepo is configured
 */

export const useAuth = () => ({
  user: {
    id: '1',
    name: 'Demo User',
    email: 'demo@bayit.tv',
    avatar: 'https://via.placeholder.com/100',
    subscription: 'premium',
  },
  isAuthenticated: true,
  login: async () => {},
  logout: async () => {},
  register: async () => {},
});

export const usePermissions = () => ({
  hasPermission: (permission: string) => true,
  hasAnyPermission: (permissions: string[]) => true,
  hasAllPermissions: (permissions: string[]) => true,
  isAdmin: true,
  isSuperAdmin: false,
});

export const useDirection = () => ({
  isRTL: false,
  direction: 'ltr' as const,
  align: 'left' as const,
});

export const useDeviceLayout = () => ({
  isTV: false,
  isMobile: true,
  isWeb: false,
  platform: 'ios' as const,
});
