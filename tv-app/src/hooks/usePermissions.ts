/**
 * usePermissions Hook
 * Provides permission checking utilities for RBAC
 */

import { useMemo } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Permission, Role, ROLE_PERMISSIONS } from '../types/rbac';

interface UsePermissionsReturn {
  // Current user's role
  role: Role | null;
  // All permissions the current user has
  permissions: Permission[];
  // Check if user has a specific permission
  can: (permission: Permission) => boolean;
  // Check if user has any of the specified permissions
  canAny: (permissions: Permission[]) => boolean;
  // Check if user has all of the specified permissions
  canAll: (permissions: Permission[]) => boolean;
  // Check if user is an admin (any admin role)
  isAdmin: boolean;
  // Check if user is a super admin
  isSuperAdmin: boolean;
  // Check if user has a specific role
  hasRole: (role: Role) => boolean;
  // Check if user has any of the specified roles
  hasAnyRole: (roles: Role[]) => boolean;
}

export const usePermissions = (): UsePermissionsReturn => {
  const { user, hasPermission, hasAnyPermission, hasAllPermissions, isAdmin, getPermissions } = useAuthStore();

  const permissions = useMemo(() => getPermissions(), [user]);

  const role = user?.role || null;

  const isSuperAdmin = useMemo(() => role === 'super_admin', [role]);

  const hasRole = (checkRole: Role): boolean => {
    return role === checkRole;
  };

  const hasAnyRole = (roles: Role[]): boolean => {
    if (!role) return false;
    return roles.includes(role);
  };

  return {
    role,
    permissions,
    can: hasPermission,
    canAny: hasAnyPermission,
    canAll: hasAllPermissions,
    isAdmin: isAdmin(),
    isSuperAdmin,
    hasRole,
    hasAnyRole,
  };
};

/**
 * Hook to check if a specific permission is granted
 * Optimized for single permission checks
 */
export const useCanAccess = (permission: Permission): boolean => {
  const { hasPermission } = useAuthStore();
  return hasPermission(permission);
};

/**
 * Hook to check if any of multiple permissions are granted
 */
export const useCanAccessAny = (permissions: Permission[]): boolean => {
  const { hasAnyPermission } = useAuthStore();
  return hasAnyPermission(permissions);
};

/**
 * Hook to check admin access
 */
export const useIsAdmin = (): boolean => {
  const { isAdmin } = useAuthStore();
  return isAdmin();
};

/**
 * Hook to get current user's role
 */
export const useRole = (): Role | null => {
  const { user } = useAuthStore();
  return user?.role || null;
};

export default usePermissions;
